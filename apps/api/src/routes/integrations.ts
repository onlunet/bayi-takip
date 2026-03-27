import { FastifyInstance } from "fastify";
import axios from "axios";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { writeAuditLog } from "../lib/audit.js";

async function ensureDealerLocation(companyId: string, dealerId: string) {
  const existing = await prisma.location.findFirst({
    where: { companyId, type: "DEALER", referenceId: dealerId }
  });
  if (existing) return existing;

  const dealer = await prisma.dealer.findUnique({ where: { id: dealerId } });
  if (!dealer) return null;

  return prisma.location.create({
    data: {
      companyId,
      type: "DEALER",
      referenceId: dealerId,
      name: dealer.name
    }
  });
}

type WooOrder = {
  id: number;
  status: string;
  date_created: string;
  currency: string;
  line_items: Array<{
    id: number;
    product_id: number;
    variation_id?: number;
    name: string;
    sku?: string;
    quantity: number;
    price?: string | number;
    total?: string;
  }>;
};

const syncRequestSchema = z
  .object({
    fullSync: z.coerce.boolean().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    maxPages: z.coerce.number().int().min(1).max(5000).optional(),
    perPage: z.coerce.number().int().min(1).max(100).optional(),
    idempotencyKey: z.string().min(8).max(120).optional()
  })
  .optional();

type SyncWooOptions = {
  fullSync?: boolean;
  from?: string;
  to?: string;
  maxPages?: number;
  perPage?: number;
};

function mapWooStatus(status: string) {
  if (status === "completed") return "COMPLETED";
  if (status === "processing") return "PROCESSING";
  if (status === "cancelled" || status === "refunded") return "CANCELLED";
  return "NEW";
}

function buildWooUrl(baseUrl: string) {
  return `${baseUrl.replace(/\/$/, "")}/wp-json/wc/v3/orders`;
}

function parseDateBoundary(value: string | undefined, endOfDay: boolean) {
  if (!value) return undefined;
  const raw = value.trim();
  if (!raw) return undefined;

  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
  const date = dateOnlyPattern.test(raw)
    ? new Date(`${raw}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`)
    : new Date(raw);

  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function parseWooCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date();
  return date;
}

function compactObject(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined)
  );
}

async function syncWooIntegration(integrationId: string, options: SyncWooOptions = {}) {
  const integration = await prisma.dealerIntegration.findUnique({
    where: { id: integrationId }
  });

  if (!integration || !integration.active || integration.platform !== "WOO") {
    return { imported: 0, skipped: 0, unmapped: 0, processed: 0, fetchedPages: 0, cursorUpdated: false };
  }

  if (!integration.baseUrl || !integration.consumerKey || !integration.consumerSecret) {
    return { imported: 0, skipped: 0, unmapped: 0, processed: 0, fetchedPages: 0, cursorUpdated: false };
  }

  const fromIso = parseDateBoundary(options.from, false);
  const toIso = parseDateBoundary(options.to, true);
  const fullSync = Boolean(options.fullSync);

  const after = fullSync ? fromIso : fromIso ?? integration.lastSyncAt?.toISOString();
  const shouldUpdateCursor = !fullSync && !fromIso && !toIso;

  const url = buildWooUrl(integration.baseUrl);
  const perPage = Math.min(Math.max(options.perPage ?? 100, 1), 100);
  const maxPages = Math.min(Math.max(options.maxPages ?? (fullSync ? 1000 : 200), 1), 5000);
  let page = 1;
  let imported = 0;
  let skipped = 0;
  let unmapped = 0;
  let processed = 0;
  let fetchedPages = 0;

  const dealerLocation = await ensureDealerLocation(integration.companyId, integration.dealerId);
  if (!dealerLocation) {
    return { imported, skipped, unmapped, processed, fetchedPages, cursorUpdated: false };
  }

  while (page <= maxPages) {
    const response = await axios.get<WooOrder[]>(url, {
      auth: { username: integration.consumerKey, password: integration.consumerSecret },
      params: {
        per_page: perPage,
        page,
        status: "processing,completed,cancelled,refunded",
        orderby: "date",
        order: "asc",
        ...(after ? { after } : {}),
        ...(toIso ? { before: toIso } : {})
      }
    });
    fetchedPages += 1;

    const orders = response.data;
    if (!orders.length) break;

    const totalPagesHeader = Number(response.headers["x-wp-totalpages"] ?? 0);

    for (const order of orders) {
      processed += 1;
      const externalId = String(order.id);
      const existing = await prisma.order.findFirst({
        where: {
          companyId: integration.companyId,
          dealerId: integration.dealerId,
          channel: "WOO",
          externalId
        }
      });

      if (existing) {
        skipped += 1;
        continue;
      }

      const items = [] as Array<{
        productId: string;
        variantId?: string | null;
        quantity: Prisma.Decimal;
        unit: "PIECE" | "KG" | "LT";
        price: Prisma.Decimal;
        total: Prisma.Decimal;
        effectiveQuantity: Prisma.Decimal;
      }>;

      for (const line of order.line_items) {
        const externalProductId = String(line.product_id);
        const externalVariantId =
          line.variation_id && Number(line.variation_id) > 0 ? String(line.variation_id) : null;

        let mapping = await prisma.productMapping.findFirst({
          where: {
            dealerId: integration.dealerId,
            platform: "WOO",
            externalProductId,
            externalVariantId
          }
        });

        if (!mapping && externalVariantId) {
          // Varyasyon bazli eslesme yoksa urun bazli eslesmeye geri dus.
          mapping = await prisma.productMapping.findFirst({
            where: {
              dealerId: integration.dealerId,
              platform: "WOO",
              externalProductId,
              externalVariantId: null
            }
          });
        }

        if (!mapping) {
          await prisma.integrationLog.create({
            data: {
              companyId: integration.companyId,
              dealerId: integration.dealerId,
              platform: "WOO",
              externalId,
              status: "UNMAPPED",
              payload: line
            }
          });
          unmapped += 1;
          continue;
        }

        const product = await prisma.product.findUnique({ where: { id: mapping.localProductId } });
        if (!product) continue;
        const variant = mapping.localVariantId
          ? await prisma.productVariant.findUnique({ where: { id: mapping.localVariantId } })
          : null;

        const quantity = new Prisma.Decimal(line.quantity);
        const priceValue = line.price ?? (line.total ? Number(line.total) / line.quantity : 0);
        const price = new Prisma.Decimal(priceValue || 0);
        const total = quantity.mul(price);
        const multiplier = variant ? new Prisma.Decimal(variant.multiplier) : new Prisma.Decimal(1);
        const effectiveQuantity = quantity.mul(multiplier);

        items.push({
          productId: product.id,
          variantId: variant?.id ?? null,
          quantity,
          unit: (variant?.unit ?? product.unit) as "PIECE" | "KG" | "LT",
          price,
          total,
          effectiveQuantity
        });
      }

      if (!items.length) {
        skipped += 1;
        continue;
      }

      const createdAt = parseWooCreatedAt(order.date_created);

      await prisma.$transaction(async (tx) => {
        const totalPrice = items.reduce(
          (sum, item) => sum.plus(item.total),
          new Prisma.Decimal(0)
        );

        const created = await tx.order.create({
          data: {
            companyId: integration.companyId,
            dealerId: integration.dealerId,
            channel: "WOO",
            externalId,
            status: mapWooStatus(order.status),
            currency: order.currency ?? "TRY",
            totalPrice,
            syncStatus: "SYNCED",
            createdAt,
            items: {
              create: items.map((item) => ({
                productId: item.productId,
                variantId: item.variantId ?? undefined,
                quantity: item.quantity,
                unit: item.unit,
                price: item.price,
                total: item.total
              }))
            }
          }
        });

        for (const item of items) {
          await tx.stockMovement.create({
            data: {
              companyId: integration.companyId,
              productId: item.productId,
              variantId: item.variantId ?? undefined,
              locationId: dealerLocation.id,
              type: "SALE",
              quantity: item.effectiveQuantity.mul(-1),
              referenceType: "ORDER",
              referenceId: created.id
            }
          });
        }
      });

      imported += 1;
    }

    if (orders.length < perPage) break;
    if (Number.isFinite(totalPagesHeader) && totalPagesHeader > 0 && page >= totalPagesHeader) break;
    page += 1;
  }

  if (shouldUpdateCursor) {
    await prisma.dealerIntegration.update({
      where: { id: integration.id },
      data: { lastSyncAt: new Date() }
    });
  }

  await prisma.integrationLog.create({
    data: {
      companyId: integration.companyId,
      dealerId: integration.dealerId,
      platform: "WOO",
      status: "SYNCED",
      payload: {
        imported,
        skipped,
        unmapped,
        processed,
        fetchedPages,
        fullSync,
        from: after ?? null,
        to: toIso ?? null,
        cursorUpdated: shouldUpdateCursor
      }
    }
  });

  return { imported, skipped, unmapped, processed, fetchedPages, cursorUpdated: shouldUpdateCursor };
}

function mapResultToJobStatus(result: {
  imported: number;
  skipped: number;
  unmapped: number;
  processed: number;
}) {
  if (result.processed === 0) return "SUCCESS" as const;
  if (result.unmapped > 0) return "PARTIAL" as const;
  return "SUCCESS" as const;
}

async function runIntegrationSyncJob(jobId: string, authUserId?: string | null) {
  const job = await prisma.integrationSyncJob.findUnique({
    where: { id: jobId },
    include: {
      integration: {
        select: {
          id: true,
          companyId: true,
          dealerId: true,
          platform: true
        }
      }
    }
  });

  if (!job) {
    throw new Error("Sync isi bulunamadi");
  }

  const startedAt = new Date();
  const attemptNo = await prisma.integrationSyncAttempt.count({
    where: { jobId: job.id }
  });

  const attempt = await prisma.integrationSyncAttempt.create({
    data: {
      jobId: job.id,
      attempt: attemptNo + 1,
      status: "RUNNING",
      startedAt
    }
  });

  await prisma.integrationSyncJob.update({
    where: { id: job.id },
    data: {
      status: "RUNNING",
      startedAt
    }
  });

  const options = (job.options ?? {}) as SyncWooOptions;

  try {
    const result = await syncWooIntegration(job.integrationId, options);
    const jobStatus = mapResultToJobStatus(result);
    const endedAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.integrationSyncAttempt.update({
        where: { id: attempt.id },
        data: {
          status: jobStatus,
          summary: result as Prisma.InputJsonValue,
          endedAt
        }
      });

      await tx.integrationSyncJob.update({
        where: { id: job.id },
        data: {
          status: jobStatus,
          summary: result as Prisma.InputJsonValue,
          errorMessage: null,
          endedAt
        }
      });

      await writeAuditLog(tx, {
        companyId: job.integration.companyId,
        userId: authUserId,
        action: "INTEGRATION_SYNC_COMPLETED",
        entity: "INTEGRATION",
        entityId: job.integrationId,
        newValue: {
          jobId: job.id,
          attempt: attempt.attempt,
          status: jobStatus,
          ...result
        }
      });
    });

    return {
      jobId: job.id,
      status: jobStatus,
      ...result
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen sync hatasi";
    const endedAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.integrationSyncAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "FAILED",
          errorMessage: message,
          endedAt
        }
      });

      await tx.integrationSyncJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          errorMessage: message,
          endedAt
        }
      });

      await tx.integrationLog.create({
        data: {
          companyId: job.integration.companyId,
          dealerId: job.integration.dealerId,
          platform: job.integration.platform,
          status: "ERROR",
          errorMessage: message
        }
      });

      await writeAuditLog(tx, {
        companyId: job.integration.companyId,
        userId: authUserId,
        action: "INTEGRATION_SYNC_FAILED",
        entity: "INTEGRATION",
        entityId: job.integrationId,
        newValue: {
          jobId: job.id,
          attempt: attempt.attempt,
          status: "FAILED",
          errorMessage: message
        }
      });
    });

    throw error;
  }
}

export async function registerIntegrationRoutes(app: FastifyInstance) {
  app.get("/integrations/dealer-summary", async (request, reply) => {
    const companyId = (request.query as any).companyId as string | undefined;
    if (!companyId) {
      reply.status(400).send({ message: "companyId required" });
      return;
    }

    const [dealers, integrations, groupedLogs] = await Promise.all([
      prisma.dealer.findMany({
        where: { companyId },
        select: { id: true, name: true },
        orderBy: { name: "asc" }
      }),
      prisma.dealerIntegration.findMany({
        where: { companyId },
        select: { dealerId: true, active: true, lastSyncAt: true, platform: true }
      }),
      prisma.integrationLog.groupBy({
        by: ["dealerId", "status"],
        where: {
          companyId,
          dealerId: { not: null },
          status: { in: ["UNMAPPED", "ERROR"] }
        },
        _count: { _all: true }
      })
    ]);

    const rows = dealers.map((dealer) => {
      const dealerIntegrations = integrations.filter((item) => item.dealerId === dealer.id);
      const logRows = groupedLogs.filter((item) => item.dealerId === dealer.id);

      const unmappedCount = logRows
        .filter((item) => item.status === "UNMAPPED")
        .reduce((sum, item) => sum + item._count._all, 0);
      const errorCount = logRows
        .filter((item) => item.status === "ERROR")
        .reduce((sum, item) => sum + item._count._all, 0);

      const lastSyncAt = dealerIntegrations
        .map((item) => item.lastSyncAt)
        .filter(Boolean)
        .sort((a, b) => new Date(b as Date).getTime() - new Date(a as Date).getTime())[0];

      return {
        dealerId: dealer.id,
        dealerName: dealer.name,
        totalIntegrations: dealerIntegrations.length,
        activeIntegrations: dealerIntegrations.filter((item) => item.active).length,
        wooIntegrations: dealerIntegrations.filter((item) => item.platform === "WOO").length,
        unmappedCount,
        errorCount,
        lastSyncAt: lastSyncAt ?? null
      };
    });

    reply.send(rows);
  });

  app.get("/integrations/logs", async (request, reply) => {
    const companyId = (request.query as any).companyId as string | undefined;
    const dealerId = (request.query as any).dealerId as string | undefined;
    const logs = await prisma.integrationLog.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(dealerId ? { dealerId } : {})
      },
      orderBy: { createdAt: "desc" }
    });
    reply.send(logs);
  });

  app.get("/integrations/jobs", async (request, reply) => {
    const companyId = (request.query as any).companyId as string | undefined;
    const dealerId = (request.query as any).dealerId as string | undefined;
    const integrationId = (request.query as any).integrationId as string | undefined;
    const status = (request.query as any).status as
      | "PENDING"
      | "RUNNING"
      | "SUCCESS"
      | "PARTIAL"
      | "FAILED"
      | undefined;

    const jobs = await prisma.integrationSyncJob.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(dealerId ? { dealerId } : {}),
        ...(integrationId ? { integrationId } : {}),
        ...(status ? { status } : {})
      },
      include: {
        attempts: {
          orderBy: { attempt: "desc" },
          take: 1
        }
      },
      orderBy: { createdAt: "desc" },
      take: 300
    });

    reply.send(
      jobs.map((job) => ({
        id: job.id,
        companyId: job.companyId,
        dealerId: job.dealerId,
        integrationId: job.integrationId,
        platform: job.platform,
        status: job.status,
        idempotencyKey: job.idempotencyKey,
        options: job.options,
        summary: job.summary,
        errorMessage: job.errorMessage,
        startedAt: job.startedAt,
        endedAt: job.endedAt,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        latestAttempt: job.attempts[0] ?? null
      }))
    );
  });

  app.post("/integrations/:id/sync", async (request, reply) => {
    try {
      const integrationId = (request.params as any).id as string;
      const payload = syncRequestSchema.parse(request.body) ?? {};
      const authUserId = (request as any).authUser?.id ?? null;

      const integration = await prisma.dealerIntegration.findUnique({
        where: { id: integrationId },
        select: {
          id: true,
          companyId: true,
          dealerId: true,
          platform: true,
          active: true
        }
      });

      if (!integration) {
        reply.status(404).send({ message: "Entegrasyon bulunamadi" });
        return;
      }

      if (!integration.active) {
        reply.status(400).send({ message: "Pasif entegrasyon icin sync baslatilamaz" });
        return;
      }

      if (payload.idempotencyKey) {
        const existing = await prisma.integrationSyncJob.findFirst({
          where: {
            integrationId,
            idempotencyKey: payload.idempotencyKey,
            status: { in: ["RUNNING", "SUCCESS", "PARTIAL"] }
          },
          orderBy: { createdAt: "desc" }
        });

        if (existing) {
          reply.send({
            ok: true,
            reused: true,
            jobId: existing.id,
            status: existing.status,
            summary: existing.summary
          });
          return;
        }
      }

      const { idempotencyKey, ...syncOptions } = payload;
      const compactOptions = compactObject(syncOptions as Record<string, unknown>);
      const createdJob = await prisma.integrationSyncJob.create({
        data: {
          companyId: integration.companyId,
          dealerId: integration.dealerId,
          integrationId: integration.id,
          platform: integration.platform,
          status: "PENDING",
          idempotencyKey: idempotencyKey ?? null,
          options: compactOptions as Prisma.InputJsonValue
        }
      });

      const result = await runIntegrationSyncJob(createdJob.id, authUserId);
      reply.send({ ok: true, reused: false, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bilinmeyen sync hatasi";
      reply.status(500).send({ message: "Sync sirasinda hata olustu", detail: message });
    }
  });

  app.post("/integrations/jobs/:id/replay", async (request, reply) => {
    const sourceJob = await prisma.integrationSyncJob.findUnique({
      where: { id: (request.params as any).id },
      select: {
        id: true,
        companyId: true,
        dealerId: true,
        integrationId: true,
        platform: true,
        options: true
      }
    });

    if (!sourceJob) {
      reply.status(404).send({ message: "Replay kaynagi bulunamadi" });
      return;
    }

    const authUserId = (request as any).authUser?.id ?? null;
    const baseOptions =
      sourceJob.options && typeof sourceJob.options === "object" && !Array.isArray(sourceJob.options)
        ? (sourceJob.options as Record<string, unknown>)
        : {};
    const nextJob = await prisma.integrationSyncJob.create({
      data: {
        companyId: sourceJob.companyId,
        dealerId: sourceJob.dealerId,
        integrationId: sourceJob.integrationId,
        platform: sourceJob.platform,
        status: "PENDING",
        options: {
          ...baseOptions,
          replayOf: sourceJob.id
        } as Prisma.InputJsonValue
      }
    });

    try {
      const result = await runIntegrationSyncJob(nextJob.id, authUserId);
      reply.send({ ok: true, replayOf: sourceJob.id, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Replay sirasinda hata olustu";
      reply.status(500).send({ message, jobId: nextJob.id });
    }
  });
}

