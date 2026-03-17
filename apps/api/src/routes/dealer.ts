import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../lib/prisma";
import { buildRiskBlockMessage, calculateDealerRisk } from "../lib/risk";

const dealerSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  taxNumber: z.string().optional(),
  address: z.string().optional(),
  paymentTerms: z.coerce.number().nonnegative().optional(),
  creditLimit: z.coerce.number().nonnegative().optional()
});

const dealerUpdateSchema = dealerSchema.partial().omit({ companyId: true });

const settingsSchema = z.object({
  marginPercent: z.coerce.number().optional(),
  roundingType: z.enum(["NONE", "ROUND_90", "ROUND_99", "ROUND_50", "INTEGER"]).optional()
});

const integrationSchema = z.object({
  platform: z.enum(["WOO", "SHOPIFY", "MARKETPLACE", "OTHER"]),
  baseUrl: z.string().url().optional(),
  consumerKey: z.string().optional(),
  consumerSecret: z.string().optional(),
  active: z.boolean().optional()
});

const deleteQuerySchema = z.object({
  force: z
    .string()
    .optional()
    .transform((value) => value === "true" || value === "1")
});

const dealerOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      variantId: z.string().optional(),
      quantity: z.coerce.number().positive()
    })
  )
});

function generateKey() {
  return `dealer_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

async function getDealerByApiKey(request: FastifyRequest, reply: FastifyReply) {
  const apiKey =
    request.headers["x-api-key"] ||
    request.headers["X-API-KEY"] ||
    (request.query as { api_key?: string }).api_key;

  if (!apiKey || typeof apiKey !== "string") {
    reply.status(401).send({ message: "API key gerekli" });
    return null;
  }

  const settings = await prisma.dealerSettings.findUnique({
    where: { apiKey },
    include: {
      dealer: {
        include: {
          priceLists: { include: { priceList: true } }
        }
      }
    }
  });

  if (!settings) {
    reply.status(401).send({ message: "Gecersiz API key" });
    return null;
  }

  return settings;
}

function applyRounding(price: Prisma.Decimal, roundingType: string) {
  const value = price.toNumber();
  if (roundingType === "ROUND_90") return new Prisma.Decimal(Math.floor(value) + 0.9);
  if (roundingType === "ROUND_99") return new Prisma.Decimal(Math.floor(value) + 0.99);
  if (roundingType === "ROUND_50") return new Prisma.Decimal(Math.floor(value) + 0.5);
  if (roundingType === "INTEGER") return new Prisma.Decimal(Math.round(value));
  return price;
}

function toXml(items: Array<{ name: string; sku?: string | null; unit: string; imageUrl?: string | null; price: string; variants?: Array<{ name: string; sku?: string | null; unit: string; price: string }> }>) {
  const escape = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const lines = ["<?xml version=\"1.0\" encoding=\"UTF-8\"?>", "<catalog>"];
  items.forEach((item) => {
    lines.push("  <product>");
    lines.push(`    <name>${escape(item.name)}</name>`);
    if (item.sku) lines.push(`    <sku>${escape(item.sku)}</sku>`);
    lines.push(`    <unit>${escape(item.unit)}</unit>`);
    if (item.imageUrl) lines.push(`    <image>${escape(item.imageUrl)}</image>`);
    lines.push(`    <price>${escape(item.price)}</price>`);
    if (item.variants && item.variants.length) {
      lines.push("    <variants>");
      item.variants.forEach((variant) => {
        lines.push("      <variant>");
        lines.push(`        <name>${escape(variant.name)}</name>`);
        if (variant.sku) lines.push(`    <sku>${escape(variant.sku)}</sku>`);
        lines.push(`        <unit>${escape(variant.unit)}</unit>`);
        lines.push(`        <price>${escape(variant.price)}</price>`);
        lines.push("      </variant>");
      });
      lines.push("    </variants>");
    }
    lines.push("  </product>");
  });
  lines.push("</catalog>");
  return lines.join("\n");
}

async function getPriceMap(dealerId: string) {
  const assigned = await prisma.dealerPriceList.findFirst({
    where: { dealerId },
    orderBy: { createdAt: "desc" }
  });
  const priceListId = assigned?.priceListId ?? null;
  if (!priceListId) return new Map();

  const priceItems = await prisma.priceListItem.findMany({
    where: { priceListId },
    include: { product: true, variant: true }
  });

  const map = new Map();
  priceItems.forEach((item) => {
    const key = `${item.productId}:${item.variantId ?? ""}`;
    map.set(key, item.price);
  });
  return map;
}

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

async function getDealerRiskSnapshot(dealerId: string, additionalDebtAmount = 0) {
  const dealer = await prisma.dealer.findUnique({
    where: { id: dealerId },
    select: {
      id: true,
      name: true,
      companyId: true,
      creditLimit: true,
      paymentTerms: true
    }
  });

  if (!dealer) return null;

  const entries = await prisma.ledgerTransaction.findMany({
    where: { dealerId },
    select: { type: true, amount: true, date: true },
    orderBy: { date: "asc" }
  });

  const risk = calculateDealerRisk(
    entries.map((entry) => ({
      type: entry.type,
      amount: Number(entry.amount ?? 0),
      date: entry.date
    })),
    {
      creditLimit: Number(dealer.creditLimit ?? 0),
      paymentTerms: Number(dealer.paymentTerms ?? 0)
    },
    additionalDebtAmount
  );

  return { dealer, risk };
}

export async function registerDealerRoutes(app: FastifyInstance) {
  app.post("/dealers", async (request, reply) => {
    const data = dealerSchema.parse(request.body);
    const dealer = await prisma.$transaction(async (tx) => {
      const created = await tx.dealer.create({
        data: {
          companyId: data.companyId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          taxNumber: data.taxNumber,
          address: data.address,
          paymentTerms: data.paymentTerms ?? 0,
          creditLimit: data.creditLimit ?? 0
        }
      });

      await tx.location.create({
        data: {
          companyId: data.companyId,
          type: "DEALER",
          referenceId: created.id,
          name: created.name
        }
      });

      await tx.dealerSettings.create({
        data: {
          dealerId: created.id,
          apiKey: generateKey()
        }
      });

      return created;
    });

    reply.send(dealer);
  });

  app.get("/dealers", async (request, reply) => {
    const companyId = (request.query as any).companyId as string | undefined;
    const dealers = await prisma.dealer.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: { createdAt: "desc" }
    });
    reply.send(dealers);
  });

  app.get("/dealers/risk-summary", async (request, reply) => {
    const companyId = (request.query as any).companyId as string | undefined;
    if (!companyId) {
      reply.status(400).send({ message: "companyId required" });
      return;
    }

    const dealers = await prisma.dealer.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        creditLimit: true,
        paymentTerms: true
      },
      orderBy: { name: "asc" }
    });

    const dealerIds = dealers.map((dealer) => dealer.id);
    if (!dealerIds.length) {
      reply.send([]);
      return;
    }

    const entries = await prisma.ledgerTransaction.findMany({
      where: {
        dealerId: { in: dealerIds }
      },
      select: {
        dealerId: true,
        type: true,
        amount: true,
        date: true
      },
      orderBy: [{ dealerId: "asc" }, { date: "asc" }]
    });

    const byDealerId = new Map<string, Array<{ type: string; amount: number; date: Date }>>();
    for (const entry of entries) {
      const current = byDealerId.get(entry.dealerId) ?? [];
      current.push({
        type: entry.type,
        amount: Number(entry.amount ?? 0),
        date: entry.date
      });
      byDealerId.set(entry.dealerId, current);
    }

    const rows = dealers.map((dealer) => {
      const risk = calculateDealerRisk(
        byDealerId.get(dealer.id) ?? [],
        {
          creditLimit: Number(dealer.creditLimit ?? 0),
          paymentTerms: Number(dealer.paymentTerms ?? 0)
        },
        0
      );

      return {
        dealerId: dealer.id,
        dealerName: dealer.name,
        currentBalance: risk.currentBalance,
        creditLimit: risk.creditLimit,
        paymentTerms: risk.paymentTerms,
        usagePercent: risk.usagePercent,
        overdue: risk.overdue,
        overdueDays: risk.overdueDays,
        riskLevel: risk.riskLevel
      };
    });

    reply.send(rows);
  });

  app.get("/dealers/:id/risk", async (request, reply) => {
    const dealerId = (request.params as any).id as string;
    const additionalDebt = Number((request.query as any).additionalDebt ?? 0);
    const result = await getDealerRiskSnapshot(dealerId, additionalDebt);
    if (!result) {
      reply.status(404).send({ message: "Bayi bulunamadi" });
      return;
    }

    reply.send({
      dealerId: result.dealer.id,
      dealerName: result.dealer.name,
      risk: result.risk
    });
  });

  app.patch("/dealers/:id", async (request, reply) => {
    const data = dealerUpdateSchema.parse(request.body);
    const dealer = await prisma.$transaction(async (tx) => {
      const updated = await tx.dealer.update({
        where: { id: (request.params as any).id },
        data
      });

      if (typeof data.name === "string" && data.name.trim().length) {
        await tx.location.updateMany({
          where: {
            companyId: updated.companyId,
            type: "DEALER",
            referenceId: updated.id
          },
          data: {
            name: data.name.trim()
          }
        });
      }

      return updated;
    });
    reply.send(dealer);
  });

  app.delete("/dealers/:id", async (request, reply) => {
    const { force } = deleteQuerySchema.parse(request.query ?? {});
    const dealerId = (request.params as any).id as string;

    if (!force) {
      try {
        const deleted = await prisma.dealer.delete({ where: { id: dealerId } });
        reply.send(deleted);
      } catch {
        reply.status(400).send({
          message:
            "Bayi kaydi bagli veriler nedeniyle silinemedi. Once kayitlari temizleyin veya bagli verilerle silmeyi secin."
        });
      }
      return;
    }

    await prisma.$transaction(async (tx) => {
      const dealer = await tx.dealer.findUnique({
        where: { id: dealerId },
        select: { id: true, companyId: true }
      });

      if (!dealer) return;

      const dealerLocations = await tx.location.findMany({
        where: {
          companyId: dealer.companyId,
          type: "DEALER",
          referenceId: dealer.id
        },
        select: { id: true }
      });
      const dealerLocationIds = dealerLocations.map((location) => location.id);

      const orders = await tx.order.findMany({
        where: { dealerId: dealer.id },
        select: { id: true }
      });
      const orderIds = orders.map((order) => order.id);

      const dispatches = await tx.dispatch.findMany({
        where: { dealerId: dealer.id },
        select: { id: true }
      });
      const dispatchIds = dispatches.map((dispatch) => dispatch.id);

      if (dispatchIds.length) {
        await tx.dispatchItem.deleteMany({
          where: { dispatchId: { in: dispatchIds } }
        });
      }

      if (orderIds.length) {
        await tx.orderItem.deleteMany({
          where: { orderId: { in: orderIds } }
        });
      }

      await tx.dispatch.deleteMany({ where: { dealerId: dealer.id } });
      await tx.order.deleteMany({ where: { dealerId: dealer.id } });
      await tx.ledgerTransaction.deleteMany({ where: { dealerId: dealer.id } });
      await tx.productMapping.deleteMany({ where: { dealerId: dealer.id } });
      await tx.integrationLog.deleteMany({ where: { dealerId: dealer.id } });
      await tx.dealerIntegration.deleteMany({ where: { dealerId: dealer.id } });
      await tx.dealerPriceList.deleteMany({ where: { dealerId: dealer.id } });
      await tx.dealerSettings.deleteMany({ where: { dealerId: dealer.id } });
      await tx.user.deleteMany({ where: { dealerId: dealer.id } });

      if (dealerLocationIds.length) {
        await tx.stockMovement.deleteMany({
          where: { locationId: { in: dealerLocationIds } }
        });
      }

      await tx.location.deleteMany({
        where: {
          companyId: dealer.companyId,
          type: "DEALER",
          referenceId: dealer.id
        }
      });

      await tx.dealer.delete({ where: { id: dealer.id } });
    });

    reply.send({ success: true });
  });

  app.get("/dealers/:id/settings", async (request, reply) => {
    const settings = await prisma.dealerSettings.findUnique({
      where: { dealerId: (request.params as any).id }
    });
    reply.send(settings);
  });

  app.post("/dealers/:id/settings", async (request, reply) => {
    const data = settingsSchema.parse(request.body);
    const settings = await prisma.dealerSettings.upsert({
      where: { dealerId: (request.params as any).id },
      update: {
        marginPercent: data.marginPercent,
        roundingType: data.roundingType
      },
      create: {
        dealerId: (request.params as any).id,
        apiKey: generateKey(),
        marginPercent: data.marginPercent ?? 0,
        roundingType: data.roundingType ?? "NONE"
      }
    });
    reply.send(settings);
  });

  app.post("/dealers/:id/integrations", async (request, reply) => {
    const data = integrationSchema.parse(request.body);
    const dealer = await prisma.dealer.findUnique({ where: { id: (request.params as any).id } });
    if (!dealer) {
      reply.status(404).send({ message: "Dealer not found" });
      return;
    }

    const existing = await prisma.dealerIntegration.findFirst({
      where: {
        dealerId: dealer.id,
        platform: data.platform,
        baseUrl: data.baseUrl ?? null
      }
    });

    const integration = existing
      ? await prisma.dealerIntegration.update({
          where: { id: existing.id },
          data: {
            consumerKey: data.consumerKey,
            consumerSecret: data.consumerSecret,
            active: data.active ?? true
          }
        })
      : await prisma.dealerIntegration.create({
          data: {
            companyId: dealer.companyId,
            dealerId: dealer.id,
            platform: data.platform,
            baseUrl: data.baseUrl,
            consumerKey: data.consumerKey,
            consumerSecret: data.consumerSecret,
            active: data.active ?? true
          }
        });

    reply.send(integration);
  });

  app.get("/dealers/:id/integrations", async (request, reply) => {
    const integrations = await prisma.dealerIntegration.findMany({
      where: { dealerId: (request.params as any).id },
      orderBy: { createdAt: "desc" }
    });
    reply.send(integrations);
  });

  app.delete("/dealers/:dealerId/integrations/:integrationId", async (request, reply) => {
    const dealer = await prisma.dealer.findUnique({ where: { id: (request.params as any).dealerId } });
    if (!dealer) {
      reply.status(404).send({ message: "Dealer not found" });
      return;
    }

    const integration = await prisma.dealerIntegration.findFirst({
      where: {
        id: (request.params as any).integrationId,
        dealerId: (request.params as any).dealerId
      }
    });

    if (!integration) {
      reply.status(404).send({ message: "Integration not found" });
      return;
    }

    await prisma.dealerIntegration.delete({ where: { id: integration.id } });
    reply.send({ success: true });
  });

  app.get("/catalog.xml", async (request, reply) => {
    const settings = await getDealerByApiKey(request, reply);
    if (!settings) return;
    const dealer = settings.dealer;

    const priceMap = await getPriceMap(dealer.id);
    const margin = new Prisma.Decimal(settings.marginPercent ?? 0).div(100);

    const products = await prisma.product.findMany({
      where: { companyId: dealer.companyId, active: true },
      include: { variants: { where: { active: true } } },
      orderBy: { createdAt: "desc" }
    });

    const items = products.map((product) => {
      const baseKey = `${product.id}:`;
      const basePrice = priceMap.get(baseKey) ?? product.basePrice;
      const withMargin = basePrice.mul(new Prisma.Decimal(1).plus(margin));
      const finalPrice = applyRounding(withMargin, settings.roundingType);

      const variants = product.variants.map((variant) => {
        const key = `${product.id}:${variant.id}`;
        const variantPrice = priceMap.get(key) ?? basePrice;
        const variantWithMargin = variantPrice.mul(new Prisma.Decimal(1).plus(margin));
        const variantFinal = applyRounding(variantWithMargin, settings.roundingType);
        return {
          name: variant.name,
          sku: variant.sku,
          unit: variant.unit,
          price: variantFinal.toFixed(2)
        };
      });

      return {
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        imageUrl: product.imageUrl,
        price: finalPrice.toFixed(2),
        variants
      };
    });

    reply.header("Content-Type", "application/xml; charset=utf-8");
    reply.send(toXml(items));
  });

  app.get("/dealer/me", async (request, reply) => {
    const settings = await getDealerByApiKey(request, reply);
    if (!settings) return;
    reply.send({ dealer: settings.dealer, settings });
  });

  app.get("/dealer/products", async (request, reply) => {
    const settings = await getDealerByApiKey(request, reply);
    if (!settings) return;
    const dealer = settings.dealer;

    const priceMap = await getPriceMap(dealer.id);
    const margin = new Prisma.Decimal(settings.marginPercent ?? 0).div(100);

    const products = await prisma.product.findMany({
      where: { companyId: dealer.companyId, active: true },
      include: { variants: { where: { active: true } } },
      orderBy: { createdAt: "desc" }
    });

    const items = products.map((product) => {
      const baseKey = `${product.id}:`;
      const basePrice = priceMap.get(baseKey) ?? product.basePrice;
      const withMargin = basePrice.mul(new Prisma.Decimal(1).plus(margin));
      const finalPrice = applyRounding(withMargin, settings.roundingType);

      const variants = product.variants.map((variant) => {
        const key = `${product.id}:${variant.id}`;
        const variantPrice = priceMap.get(key) ?? basePrice;
        const variantWithMargin = variantPrice.mul(new Prisma.Decimal(1).plus(margin));
        const variantFinal = applyRounding(variantWithMargin, settings.roundingType);
        return {
          id: variant.id,
          name: variant.name,
          sku: variant.sku,
          unit: variant.unit,
          price: variantFinal.toFixed(2)
        };
      });

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        imageUrl: product.imageUrl,
        price: finalPrice.toFixed(2),
        variants
      };
    });

    reply.send(items);
  });

  app.post("/dealer/orders", async (request, reply) => {
    const settings = await getDealerByApiKey(request, reply);
    if (!settings) return;
    const dealer = settings.dealer;
    const data = dealerOrderSchema.parse(request.body);

    const dealerLocation = await ensureDealerLocation(dealer.companyId, dealer.id);
    if (!dealerLocation) {
      reply.status(400).send({ message: "Dealer location not found" });
      return;
    }

    const priceMap = await getPriceMap(dealer.id);
    const margin = new Prisma.Decimal(settings.marginPercent ?? 0).div(100);

    let order;
    try {
      order = await prisma.$transaction(async (tx) => {
        const items = [] as Array<{
          productId: string;
          variantId?: string | null;
          quantity: Prisma.Decimal;
          unit: "PIECE" | "KG" | "LT";
          price: Prisma.Decimal;
          total: Prisma.Decimal;
          effectiveQuantity: Prisma.Decimal;
        }>;

        for (const item of data.items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) continue;
          const variant = item.variantId
            ? await tx.productVariant.findUnique({ where: { id: item.variantId } })
            : null;

          const baseKey = `${product.id}:${variant?.id ?? ""}`;
          const basePrice = priceMap.get(baseKey) ?? product.basePrice;
          const finalPrice = applyRounding(basePrice.mul(new Prisma.Decimal(1).plus(margin)), settings.roundingType);

          const quantity = new Prisma.Decimal(item.quantity);
          const total = quantity.mul(finalPrice);
          const multiplier = variant ? new Prisma.Decimal(variant.multiplier) : new Prisma.Decimal(1);
          const effectiveQuantity = quantity.mul(multiplier);

          items.push({
            productId: product.id,
            variantId: variant?.id ?? null,
            quantity,
            unit: (variant?.unit ?? product.unit) as "PIECE" | "KG" | "LT",
            price: finalPrice,
            total,
            effectiveQuantity
          });
        }

        if (!items.length) {
          return null;
        }

        const totalPrice = items.reduce((sum, item) => sum.plus(item.total), new Prisma.Decimal(0));

        const policy = await tx.dealer.findUnique({
          where: { id: dealer.id },
          select: {
            creditLimit: true,
            paymentTerms: true
          }
        });

        const ledgerEntries = await tx.ledgerTransaction.findMany({
          where: { dealerId: dealer.id },
          select: { type: true, amount: true, date: true },
          orderBy: { date: "asc" }
        });

        const risk = calculateDealerRisk(
          ledgerEntries.map((entry) => ({
            type: entry.type,
            amount: Number(entry.amount ?? 0),
            date: entry.date
          })),
          {
            creditLimit: Number(policy?.creditLimit ?? 0),
            paymentTerms: Number(policy?.paymentTerms ?? 0)
          },
          Number(totalPrice.toString())
        );

        if (risk.limitExceeded || risk.overdue) {
          const error = new Error(buildRiskBlockMessage(risk));
          (error as any).risk = risk;
          throw error;
        }

        const created = await tx.order.create({
          data: {
            companyId: dealer.companyId,
            dealerId: dealer.id,
            channel: "MANUAL",
            status: "NEW",
            currency: "TRY",
            totalPrice,
            syncStatus: "SYNCED",
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
              companyId: dealer.companyId,
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

        return created;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Siparis olusturulamadi";
      reply.status(400).send({
        message,
        risk: (error as any)?.risk ?? undefined
      });
      return;
    }

    if (!order) {
      reply.status(400).send({ message: "Siparis icin gecerli urun satiri bulunamadi" });
      return;
    }

    reply.send(order);
  });

  app.get("/dealer/orders", async (request, reply) => {
    const settings = await getDealerByApiKey(request, reply);
    if (!settings) return;
    const dealer = settings.dealer;

    const orders = await prisma.order.findMany({
      where: { dealerId: dealer.id },
      include: {
        items: {
          include: {
            product: true,
            variant: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 200
    });

    reply.send(
      orders.map((order) => {
        const itemsSummary = order.items
          .map((item) => {
            const name = item.variant
              ? `${item.product?.name ?? ""} / ${item.variant.name}`
              : item.product?.name ?? "-";
            return `${name} x${Number(item.quantity).toFixed(2)}`;
          })
          .join(", ");

        return {
          id: order.id,
          status: order.status,
          totalPrice: order.totalPrice,
          createdAt: order.createdAt,
          itemsSummary: itemsSummary || "-"
        };
      })
    );
  });
  app.get("/dealer/ledger/summary", async (request, reply) => {
    const settings = await getDealerByApiKey(request, reply);
    if (!settings) return;
    const dealer = settings.dealer;

    const entries = await prisma.ledgerTransaction.findMany({
      where: { dealerId: dealer.id }
    });

    let balance = new Prisma.Decimal(0);
    for (const entry of entries) {
      if (entry.type === "PAYMENT") balance = balance.minus(entry.amount);
      else balance = balance.plus(entry.amount);
    }

    reply.send({ balance: balance.toFixed(2) });
  });
}







