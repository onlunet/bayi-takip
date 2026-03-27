import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { writeAuditLog } from "../lib/audit.js";
import { buildRiskBlockMessage, calculateDealerRisk } from "../lib/risk.js";
import {
  createDealerAuthToken,
  ensureDealerMembershipTables,
  hasDealerAuthCredential,
  verifyDealerAuthCredential,
  verifyDealerAuthToken
} from "../lib/dealerMembership.js";

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
  customerId: z.string().optional(),
  customerName: z.string().trim().min(2).max(120).optional(),
  customerPhone: z.string().trim().min(5).max(40).optional(),
  customerNote: z.string().trim().max(1000).optional(),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      variantId: z.string().optional(),
      quantity: z.coerce.number().positive(),
      note: z.string().max(400).optional()
    })
  )
});

const storefrontOrderSchema = z.object({
  customerName: z.string().min(2).max(120),
  customerPhone: z.string().min(5).max(40).optional(),
  customerNote: z.string().max(1000).optional(),
  customerId: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().optional(),
        quantity: z.coerce.number().positive(),
        note: z.string().max(400).optional()
      })
    )
    .min(1)
});

const dealerServiceRequestSchema = z.object({
  type: z.enum(["RETURN", "EXCHANGE", "PAYMENT_LINK", "OTHER"]),
  orderId: z.string().optional(),
  note: z.string().max(1000).optional(),
  payload: z.unknown().optional()
});

const dealerServiceRequestUpdateSchema = z.object({
  status: z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"]).optional(),
  note: z.string().max(1000).optional()
});

const dealerCustomerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(5).max(40).optional(),
  email: z.string().trim().email().optional(),
  address: z.string().trim().max(250).optional(),
  note: z.string().trim().max(1000).optional(),
  active: z.boolean().optional()
});

const dealerCustomerUpdateSchema = dealerCustomerSchema.partial();

const dealerOrdersQuerySchema = z.object({
  customerId: z.string().trim().optional()
});

const dealerAuthLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6).max(128)
});

function generateKey() {
  return `dealer_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function generateStorefrontKey() {
  return `store_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function cleanOptionalText(value?: string | null) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

type LegacyDealerSettingsRow = {
  id: string;
  dealerId: string;
  marginPercent: Prisma.Decimal | number | string;
  roundingType: string;
  apiKey: string;
  createdAt: Date;
  updatedAt: Date;
};

function isMissingStorefrontKeyColumn(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const column = String((error.meta as any)?.column ?? "");
    if (error.code === "P2022" && column.includes("storefrontKey")) {
      return true;
    }
  }

  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.includes("storefrontKey");
}

async function readLegacyDealerSettingsByDealerId(dealerId: string) {
  const rows = await prisma.$queryRawUnsafe<LegacyDealerSettingsRow[]>(
    `SELECT "id", "dealerId", "marginPercent", "roundingType", "apiKey", "createdAt", "updatedAt"
     FROM "DealerSettings"
     WHERE "dealerId" = $1
     LIMIT 1`,
    dealerId
  );
  return rows[0] ?? null;
}

async function readLegacyDealerSettingsByApiKey(apiKey: string) {
  const rows = await prisma.$queryRawUnsafe<LegacyDealerSettingsRow[]>(
    `SELECT "id", "dealerId", "marginPercent", "roundingType", "apiKey", "createdAt", "updatedAt"
     FROM "DealerSettings"
     WHERE "apiKey" = $1
     LIMIT 1`,
    apiKey
  );
  return rows[0] ?? null;
}

async function upsertLegacyDealerSettings(
  dealerId: string,
  data: { marginPercent?: number; roundingType?: "NONE" | "ROUND_90" | "ROUND_99" | "ROUND_50" | "INTEGER" }
) {
  const existing = await readLegacyDealerSettingsByDealerId(dealerId);

  if (existing) {
    const marginPercent =
      data.marginPercent !== undefined ? data.marginPercent : Number(existing.marginPercent ?? 0);
    const roundingType = data.roundingType ?? String(existing.roundingType ?? "NONE");
    const updated = await prisma.$queryRawUnsafe<LegacyDealerSettingsRow[]>(
      `UPDATE "DealerSettings"
       SET "marginPercent" = $1,
           "roundingType" = $2::"RoundingType",
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE "dealerId" = $3
       RETURNING "id", "dealerId", "marginPercent", "roundingType", "apiKey", "createdAt", "updatedAt"`,
      marginPercent,
      roundingType,
      dealerId
    );
    return updated[0] ?? null;
  }

  const created = await prisma.$queryRawUnsafe<LegacyDealerSettingsRow[]>(
    `INSERT INTO "DealerSettings"
      ("id", "dealerId", "marginPercent", "roundingType", "apiKey", "createdAt", "updatedAt")
     VALUES
      ($1, $2, $3, $4::"RoundingType", $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING "id", "dealerId", "marginPercent", "roundingType", "apiKey", "createdAt", "updatedAt"`,
    `legacy_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`,
    dealerId,
    data.marginPercent ?? 0,
    data.roundingType ?? "NONE",
    generateKey()
  );

  return created[0] ?? null;
}

async function getDealerSettingsByDealerId(dealerId: string) {
  let settings: any = null;
  try {
    settings = await prisma.dealerSettings.findUnique({
      where: { dealerId },
      include: {
        dealer: {
          include: {
            priceLists: { include: { priceList: true } }
          }
        }
      }
    });
  } catch (error) {
    if (!isMissingStorefrontKeyColumn(error)) {
      throw error;
    }

    const legacy = await readLegacyDealerSettingsByDealerId(dealerId);
    if (legacy) {
      const dealer = await prisma.dealer.findUnique({
        where: { id: legacy.dealerId },
        include: {
          priceLists: { include: { priceList: true } }
        }
      });

      if (dealer) {
        settings = {
          ...legacy,
          storefrontKey: null,
          marginPercent: new Prisma.Decimal(legacy.marginPercent ?? 0),
          dealer
        };
      }
    }
  }

  return settings;
}

function readDealerToken(request: FastifyRequest) {
  const headerToken = request.headers["x-dealer-token"];
  if (typeof headerToken === "string" && headerToken.trim().length) {
    return headerToken.trim();
  }

  if (Array.isArray(headerToken) && headerToken[0]?.trim().length) {
    return headerToken[0].trim();
  }

  const authorization = request.headers.authorization;
  if (typeof authorization === "string" && authorization.toLowerCase().startsWith("bearer ")) {
    const token = authorization.slice(7).trim();
    if (token.length) return token;
  }

  return undefined;
}

async function getDealerByApiKey(request: FastifyRequest, reply: FastifyReply) {
  const dealerToken = readDealerToken(request);
  if (dealerToken) {
    const payload = verifyDealerAuthToken(dealerToken);
    if (!payload) {
      reply.status(401).send({ message: "Gecersiz veya suresi dolmus bayi oturumu" });
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        companyId: true,
        dealerId: true,
        role: true,
        active: true,
        email: true,
        name: true
      }
    });

    if (!user || !user.active || user.role !== "DEALER" || !user.dealerId) {
      reply.status(401).send({ message: "Bayi oturumu gecersiz" });
      return null;
    }

    const settings = await getDealerSettingsByDealerId(user.dealerId);
    if (!settings) {
      reply.status(404).send({ message: "Bayi ayarlari bulunamadi" });
      return null;
    }

    (request as any).dealerAuthUser = user;
    return settings;
  }

  const apiKey =
    request.headers["x-api-key"] ||
    request.headers["X-API-KEY"] ||
    (request.query as { api_key?: string }).api_key;

  if (!apiKey || typeof apiKey !== "string") {
    reply.status(401).send({ message: "Yetkilendirme bilgisi gerekli" });
    return null;
  }

  let settings: any = null;
  try {
    settings = await prisma.dealerSettings.findUnique({
      where: { apiKey },
      include: {
        dealer: {
          include: {
            priceLists: { include: { priceList: true } }
          }
        }
      }
    });
  } catch (error) {
    if (!isMissingStorefrontKeyColumn(error)) {
      throw error;
    }

    const legacy = await readLegacyDealerSettingsByApiKey(apiKey);
    if (legacy) {
      const dealer = await prisma.dealer.findUnique({
        where: { id: legacy.dealerId },
        include: {
          priceLists: { include: { priceList: true } }
        }
      });

      if (dealer) {
        settings = {
          ...legacy,
          storefrontKey: null,
          marginPercent: new Prisma.Decimal(legacy.marginPercent ?? 0),
          dealer
        };
      }
    }
  }

  if (!settings) {
    reply.status(401).send({ message: "Yetkilendirme bilgisi gecersiz" });
    return null;
  }

  return settings;
}

async function getDealerByStorefrontKey(storefrontKey: string) {
  try {
    return await prisma.dealerSettings.findUnique({
      where: { storefrontKey },
      include: {
        dealer: {
          include: {
            priceLists: { include: { priceList: true } }
          }
        }
      }
    });
  } catch (error) {
    if (isMissingStorefrontKeyColumn(error)) {
      return null;
    }
    throw error;
  }
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

async function createDealerOrderFromItems(
  dealer: { id: string; companyId: string },
  settings: { marginPercent: Prisma.Decimal; roundingType: string },
  inputItems: Array<{ productId: string; variantId?: string; quantity: number; note?: string }>,
  options?: {
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    customerNote?: string;
    channel?: "MANUAL" | "OTHER";
    status?: "NEW" | "PROCESSING";
  }
) {
  const dealerLocation = await ensureDealerLocation(dealer.companyId, dealer.id);
  if (!dealerLocation) {
    throw new Error("Dealer location not found");
  }

  const priceMap = await getPriceMap(dealer.id);
  const margin = new Prisma.Decimal(settings.marginPercent ?? 0).div(100);

  const order = await prisma.$transaction(async (tx) => {
    const items = [] as Array<{
      productId: string;
      variantId?: string | null;
      quantity: Prisma.Decimal;
      unit: "PIECE" | "KG" | "LT";
      price: Prisma.Decimal;
      total: Prisma.Decimal;
      note?: string;
      effectiveQuantity: Prisma.Decimal;
    }>;

    for (const item of inputItems) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;
      const variant = item.variantId
        ? await tx.productVariant.findUnique({ where: { id: item.variantId } })
        : null;

      const baseKey = `${product.id}:${variant?.id ?? ""}`;
      const basePrice = priceMap.get(baseKey) ?? product.basePrice;
      const finalPrice = applyRounding(
        basePrice.mul(new Prisma.Decimal(1).plus(margin)),
        settings.roundingType
      );

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
        note: item.note,
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
        customerId: options?.customerId,
        channel: options?.channel ?? "MANUAL",
        status: options?.status ?? "NEW",
        currency: "TRY",
        totalPrice,
        syncStatus: "SYNCED",
        customerName: options?.customerName,
        customerPhone: options?.customerPhone,
        customerNote: options?.customerNote,
        statusUpdatedAt: new Date(),
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId ?? undefined,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price,
            total: item.total,
            note: item.note
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

  return order;
}

function toDealerOrderHistoryRows(
  orders: Array<
    Prisma.OrderGetPayload<{
      include: {
        customer: {
          select: {
            id: true;
            name: true;
            phone: true;
          };
        };
        items: {
          include: {
            product: true;
            variant: true;
          };
        };
      };
    }>
  >
) {
  return orders.map((order) => {
    const itemsSummary = order.items
      .map((item) => {
        const name = item.variant
          ? `${item.product?.name ?? ""} / ${item.variant.name}`
          : item.product?.name ?? "-";
        return `${name} x${Number(item.quantity).toFixed(2)}`;
      })
      .join(", ");

    const customerDisplay =
      order.customer?.name ??
      order.customerName ??
      [order.customerName, order.customerPhone].filter(Boolean).join(" / ") ??
      "-";

    return {
      id: order.id,
      status: order.status,
      totalPrice: order.totalPrice,
      createdAt: order.createdAt,
      customerId: order.customerId,
      customerDisplay,
      customerName: order.customerName ?? order.customer?.name ?? null,
      customerPhone: order.customerPhone ?? order.customer?.phone ?? null,
      customerNote: order.customerNote,
      itemsSummary: itemsSummary || "-"
    };
  });
}

export async function registerDealerRoutes(app: FastifyInstance) {
  app.get("/dealer/auth/config", async (_request, reply) => {
    reply.send({
      mode: "CLOSED",
      registrationEnabled: false,
      companies: []
    });
  });

  app.post("/dealer/auth/register", async (_request, reply) => {
    reply.status(403).send({
      message: "Kapali devre mod aktif. Sadece yonetici tarafindan eklenen bayiler giris yapabilir."
    });
  });

  app.post("/dealer/auth/login", async (request, reply) => {
    await ensureDealerMembershipTables();
    const data = dealerAuthLoginSchema.parse(request.body);
    const normalizedEmail = data.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        companyId: true,
        dealerId: true,
        name: true,
        email: true,
        role: true,
        active: true
      }
    });

    if (!user || user.role !== "DEALER" || !user.dealerId) {
      reply.status(401).send({ message: "E-posta veya sifre hatali" });
      return;
    }

    const hasCredential = await hasDealerAuthCredential(user.id);
    if (!hasCredential) {
      reply.status(403).send({
        message: "Bu bayi kullanicisi icin sifre tanimi yok. Lutfen yoneticinizle iletisime gecin."
      });
      return;
    }

    const passwordOk = await verifyDealerAuthCredential(user.id, data.password);
    if (!passwordOk) {
      reply.status(401).send({ message: "E-posta veya sifre hatali" });
      return;
    }

    if (!user.active) {
      reply.status(403).send({
        message: "Hesabiniz henuz admin onayinda. Onaydan sonra giris yapabilirsiniz."
      });
      return;
    }

    const settings = await getDealerSettingsByDealerId(user.dealerId);
    if (!settings) {
      reply.status(404).send({ message: "Bayi ayarlari bulunamadi" });
      return;
    }

    const token = createDealerAuthToken({
      userId: user.id,
      dealerId: user.dealerId,
      companyId: user.companyId
    });

    reply.send({
      token,
      user: {
        id: user.id,
        companyId: user.companyId,
        dealerId: user.dealerId,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active
      },
      dealer: settings.dealer,
      settings: {
        marginPercent: Number(settings.marginPercent ?? 0),
        roundingType: settings.roundingType
      }
    });
  });

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
          apiKey: generateKey(),
          storefrontKey: generateStorefrontKey()
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
      await tx.integrationSyncAttempt.deleteMany({
        where: { job: { is: { dealerId: dealer.id } } }
      });
      await tx.integrationSyncJob.deleteMany({ where: { dealerId: dealer.id } });
      await tx.dealerServiceRequest.deleteMany({ where: { dealerId: dealer.id } });
      await tx.dealerCustomer.deleteMany({ where: { dealerId: dealer.id } });
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
    const dealerId = (request.params as any).id as string;
    let settings: any = null;
    try {
      settings = await prisma.dealerSettings.findUnique({
        where: { dealerId }
      });
    } catch (error) {
      if (!isMissingStorefrontKeyColumn(error)) {
        throw error;
      }
      const legacy = await readLegacyDealerSettingsByDealerId(dealerId);
      settings = legacy
        ? {
            ...legacy,
            storefrontKey: null
          }
        : null;
    }
    reply.send(settings);
  });

  app.post("/dealers/:id/settings", async (request, reply) => {
    const data = settingsSchema.parse(request.body);
    const dealerId = (request.params as any).id as string;
    let settings: any = null;
    try {
      settings = await prisma.dealerSettings.upsert({
        where: { dealerId },
        update: {
          marginPercent: data.marginPercent,
          roundingType: data.roundingType
        },
        create: {
          dealerId,
          apiKey: generateKey(),
          storefrontKey: generateStorefrontKey(),
          marginPercent: data.marginPercent ?? 0,
          roundingType: data.roundingType ?? "NONE"
        }
      });
    } catch (error) {
      if (!isMissingStorefrontKeyColumn(error)) {
        throw error;
      }
      const legacy = await upsertLegacyDealerSettings(dealerId, {
        marginPercent: data.marginPercent,
        roundingType: data.roundingType
      });
      settings = legacy
        ? {
            ...legacy,
            storefrontKey: null
          }
        : null;
    }
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

    await prisma.$transaction(async (tx) => {
      await tx.integrationSyncAttempt.deleteMany({
        where: { job: { is: { integrationId: integration.id } } }
      });
      await tx.integrationSyncJob.deleteMany({
        where: { integrationId: integration.id }
      });
      await tx.dealerIntegration.delete({ where: { id: integration.id } });
    });
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
    const authUser = (request as any).dealerAuthUser ?? null;
    reply.send({
      dealer: settings.dealer,
      settings: {
        marginPercent: Number(settings.marginPercent ?? 0),
        roundingType: settings.roundingType
      },
      user: authUser
        ? {
            id: authUser.id,
            companyId: authUser.companyId,
            dealerId: authUser.dealerId,
            role: authUser.role,
            active: authUser.active,
            email: authUser.email,
            name: authUser.name
          }
        : null
    });
  });

  app.get("/dealer/customers", async (request, reply) => {
    const settings = await getDealerByApiKey(request, reply);
    if (!settings) return;
    const dealer = settings.dealer;

    const customers = await prisma.dealerCustomer.findMany({
      where: { dealerId: dealer.id },
      orderBy: [{ active: "desc" }, { name: "asc" }]
    });

    const customerIds = customers.map((item) => item.id);
    if (!customerIds.length) {
      reply.send([]);
      return;
    }

    const stats = await prisma.order.groupBy({
      by: ["customerId"],
      where: {
        dealerId: dealer.id,
        customerId: { in: customerIds }
      },
      _count: { _all: true },
      _sum: { totalPrice: true },
      _max: { createdAt: true }
    });

    const statsByCustomerId = new Map(
      stats
        .filter((item) => item.customerId)
        .map((item) => [
          item.customerId as string,
          {
            orderCount: item._count._all ?? 0,
            totalSales: item._sum.totalPrice ? Number(item._sum.totalPrice) : 0,
            lastOrderAt: item._max.createdAt ?? null
          }
        ])
    );

    reply.send(
      customers.map((customer) => {
        const stat = statsByCustomerId.get(customer.id);
        return {
          ...customer,
          orderCount: stat?.orderCount ?? 0,
          totalSales: stat?.totalSales ?? 0,
          lastOrderAt: stat?.lastOrderAt ?? null
        };
      })
    );
  });

  app.post("/dealer/customers", async (request, reply) => {
    const settings = await getDealerByApiKey(request, reply);
    if (!settings) return;
    const dealer = settings.dealer;
    const data = dealerCustomerSchema.parse(request.body);

    let created: Awaited<ReturnType<typeof prisma.dealerCustomer.create>> | null = null;
    try {
      created = await prisma.dealerCustomer.create({
        data: {
          companyId: dealer.companyId,
          dealerId: dealer.id,
          name: data.name.trim(),
          phone: cleanOptionalText(data.phone),
          email: cleanOptionalText(data.email),
          address: cleanOptionalText(data.address),
          note: cleanOptionalText(data.note),
          active: data.active ?? true
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        reply.status(400).send({ message: "Ayni isim/telefon kombinasyonunda musteri zaten var." });
        return;
      }
      throw error;
    }
    if (!created) return;

    await writeAuditLog(prisma, {
      companyId: dealer.companyId,
      action: "DEALER_CUSTOMER_CREATED",
      entity: "DEALER_CUSTOMER",
      entityId: created.id,
      newValue: {
        dealerId: dealer.id,
        name: created.name,
        phone: created.phone
      }
    });

    reply.send(created);
  });

  app.patch("/dealer/customers/:id", async (request, reply) => {
    const settings = await getDealerByApiKey(request, reply);
    if (!settings) return;
    const dealer = settings.dealer;
    const customerId = (request.params as any).id as string;
    const data = dealerCustomerUpdateSchema.parse(request.body);

    const existing = await prisma.dealerCustomer.findFirst({
      where: {
        id: customerId,
        dealerId: dealer.id
      }
    });

    if (!existing) {
      reply.status(404).send({ message: "Musteri bulunamadi" });
      return;
    }

    let updated: Awaited<ReturnType<typeof prisma.dealerCustomer.update>> | null = null;
    try {
      updated = await prisma.dealerCustomer.update({
        where: { id: existing.id },
        data: {
          name: cleanOptionalText(data.name) ?? existing.name,
          phone: data.phone !== undefined ? cleanOptionalText(data.phone) ?? null : undefined,
          email: data.email !== undefined ? cleanOptionalText(data.email) ?? null : undefined,
          address: data.address !== undefined ? cleanOptionalText(data.address) ?? null : undefined,
          note: data.note !== undefined ? cleanOptionalText(data.note) ?? null : undefined,
          active: data.active
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        reply.status(400).send({ message: "Ayni isim/telefon kombinasyonunda baska bir musteri var." });
        return;
      }
      throw error;
    }
    if (!updated) return;

    await writeAuditLog(prisma, {
      companyId: dealer.companyId,
      action: "DEALER_CUSTOMER_UPDATED",
      entity: "DEALER_CUSTOMER",
      entityId: updated.id,
      oldValue: {
        name: existing.name,
        phone: existing.phone,
        email: existing.email,
        active: existing.active
      },
      newValue: {
        name: updated.name,
        phone: updated.phone,
        email: updated.email,
        active: updated.active
      }
    });

    reply.send(updated);
  });

  app.delete("/dealer/customers/:id", async (request, reply) => {
    const settings = await getDealerByApiKey(request, reply);
    if (!settings) return;
    const dealer = settings.dealer;
    const customerId = (request.params as any).id as string;

    const existing = await prisma.dealerCustomer.findFirst({
      where: {
        id: customerId,
        dealerId: dealer.id
      }
    });

    if (!existing) {
      reply.status(404).send({ message: "Musteri bulunamadi" });
      return;
    }

    const linkedOrderCount = await prisma.order.count({
      where: {
        dealerId: dealer.id,
        customerId: existing.id
      }
    });

    if (linkedOrderCount > 0) {
      const archived = await prisma.dealerCustomer.update({
        where: { id: existing.id },
        data: { active: false }
      });
      reply.send({
        archived: true,
        customer: archived,
        message: "Musteri gecmiste siparis icerdigi icin pasife alindi."
      });
      return;
    }

    await prisma.dealerCustomer.delete({ where: { id: existing.id } });

    await writeAuditLog(prisma, {
      companyId: dealer.companyId,
      action: "DEALER_CUSTOMER_DELETED",
      entity: "DEALER_CUSTOMER",
      entityId: existing.id,
      oldValue: {
        name: existing.name,
        phone: existing.phone
      }
    });

    reply.send({ deleted: true });
  });

  app.get("/dealer/customers/:id/orders", async (request, reply) => {
    const settings = await getDealerByApiKey(request, reply);
    if (!settings) return;
    const dealer = settings.dealer;
    const customerId = (request.params as any).id as string;

    const customer = await prisma.dealerCustomer.findFirst({
      where: {
        id: customerId,
        dealerId: dealer.id
      },
      select: { id: true, name: true, phone: true }
    });

    if (!customer) {
      reply.status(404).send({ message: "Musteri bulunamadi" });
      return;
    }

    const orders = await prisma.order.findMany({
      where: {
        dealerId: dealer.id,
        customerId: customer.id
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
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

    reply.send({
      customer,
      orders: toDealerOrderHistoryRows(orders)
    });
  });

  app.get("/dealer/storefront-link", async (request, reply) => {
    const settings = await getDealerByApiKey(request, reply);
    if (!settings) return;

    if (!settings.storefrontKey) {
      reply.send({
        storefrontKey: null,
        storefrontUrl: null,
        warning: "Storefront anahtari veritabaninda bulunamadi. Ilgili migration calistirilmali."
      });
      return;
    }

    const forwardedProto = request.headers["x-forwarded-proto"];
    const proto =
      typeof forwardedProto === "string" && forwardedProto.trim().length
        ? forwardedProto.split(",")[0]
        : request.protocol || "http";
    const host = request.headers.host || "localhost:3000";
    const storefrontUrl = `${proto}://${host}/storefront.html?key=${encodeURIComponent(
      settings.storefrontKey
    )}`;

    reply.send({
      storefrontKey: settings.storefrontKey,
      storefrontUrl
    });
  });

  app.post("/dealer/storefront-key/rotate", async (request, reply) => {
    const settings = await getDealerByApiKey(request, reply);
    if (!settings) return;
    if (!settings.storefrontKey) {
      reply.status(409).send({
        message: "Storefront anahtari alani veritabaninda yok. Once migration uygulayin."
      });
      return;
    }

    const nextKey = generateStorefrontKey();
    const updated = await prisma.dealerSettings.update({
      where: { dealerId: settings.dealer.id },
      data: {
        storefrontKey: nextKey
      }
    });

    await writeAuditLog(prisma, {
      companyId: settings.dealer.companyId,
      action: "DEALER_STOREFRONT_KEY_ROTATED",
      entity: "DEALER_SETTINGS",
      entityId: updated.id,
      newValue: {
        dealerId: settings.dealer.id
      }
    });

    reply.send({
      storefrontKey: updated.storefrontKey
    });
  });

  app.get("/storefront/:storefrontKey/catalog", async (request, reply) => {
    const storefrontKey = (request.params as any).storefrontKey as string;
    const settings = await getDealerByStorefrontKey(storefrontKey);
    if (!settings) {
      reply.status(404).send({ message: "Magaza bulunamadi" });
      return;
    }

    const dealer = settings.dealer;
    const company = await prisma.company.findUnique({
      where: { id: dealer.companyId },
      select: { id: true, name: true }
    });

    const priceMap = await getPriceMap(dealer.id);
    const margin = new Prisma.Decimal(settings.marginPercent ?? 0).div(100);

    const products = await prisma.product.findMany({
      where: { companyId: dealer.companyId, active: true },
      include: { variants: { where: { active: true } } },
      orderBy: { createdAt: "desc" }
    });

    const catalog = products.map((product) => {
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
          multiplier: variant.multiplier,
          price: variantFinal.toFixed(2)
        };
      });

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        imageUrl: product.imageUrl,
        weight: product.weight,
        description: product.description,
        price: finalPrice.toFixed(2),
        variants
      };
    });

    reply.send({
      dealer: {
        id: dealer.id,
        name: dealer.name
      },
      company,
      catalog
    });
  });

  app.post("/storefront/:storefrontKey/orders", async (request, reply) => {
    const storefrontKey = (request.params as any).storefrontKey as string;
    const settings = await getDealerByStorefrontKey(storefrontKey);
    if (!settings) {
      reply.status(404).send({ message: "Magaza bulunamadi" });
      return;
    }

    const data = storefrontOrderSchema.parse(request.body);
    const dealer = settings.dealer;
    let selectedCustomer:
      | {
          id: string;
          name: string;
          phone: string | null;
        }
      | null = null;

    if (data.customerId) {
      selectedCustomer = await prisma.dealerCustomer.findFirst({
        where: {
          id: data.customerId,
          dealerId: dealer.id,
          active: true
        },
        select: {
          id: true,
          name: true,
          phone: true
        }
      });

      if (!selectedCustomer) {
        reply.status(400).send({ message: "Musteri kaydi bulunamadi veya pasif." });
        return;
      }
    }

    const customerName = selectedCustomer?.name ?? cleanOptionalText(data.customerName);
    const customerPhone = selectedCustomer?.phone ?? cleanOptionalText(data.customerPhone);
    const customerNote = cleanOptionalText(data.customerNote);

    let order;
    try {
      order = await createDealerOrderFromItems(
        {
          id: dealer.id,
          companyId: dealer.companyId
        },
        {
          marginPercent: settings.marginPercent,
          roundingType: settings.roundingType
        },
        data.items,
        {
          customerId: selectedCustomer?.id,
          customerName,
          customerPhone,
          customerNote,
          channel: "MANUAL",
          status: "NEW"
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Siparis olusturulamadi";
      reply.status(400).send({
        message,
        risk: (error as any)?.risk ?? undefined
      });
      return;
    }

    if (!order) {
      reply.status(400).send({ message: "Gecerli siparis kalemi bulunamadi" });
      return;
    }

    await writeAuditLog(prisma, {
      companyId: dealer.companyId,
      action: "STOREFRONT_ORDER_CREATED",
      entity: "ORDER",
      entityId: order.id,
      newValue: {
        dealerId: dealer.id,
        customerId: selectedCustomer?.id ?? null,
        customerName: customerName ?? null,
        customerPhone: customerPhone ?? null
      }
    });

    reply.send({
      ok: true,
      orderId: order.id
    });
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
    let selectedCustomer:
      | {
          id: string;
          name: string;
          phone: string | null;
        }
      | null = null;

    if (data.customerId) {
      selectedCustomer = await prisma.dealerCustomer.findFirst({
        where: {
          id: data.customerId,
          dealerId: dealer.id,
          active: true
        },
        select: {
          id: true,
          name: true,
          phone: true
        }
      });

      if (!selectedCustomer) {
        reply.status(400).send({ message: "Secilen musteri bulunamadi veya pasif." });
        return;
      }
    }

    const customerName = selectedCustomer?.name ?? cleanOptionalText(data.customerName);
    const customerPhone = selectedCustomer?.phone ?? cleanOptionalText(data.customerPhone);
    const customerNote = cleanOptionalText(data.customerNote);

    let order;
    try {
      order = await createDealerOrderFromItems(
        {
          id: dealer.id,
          companyId: dealer.companyId
        },
        {
          marginPercent: settings.marginPercent,
          roundingType: settings.roundingType
        },
        data.items,
        {
          customerId: selectedCustomer?.id,
          customerName,
          customerPhone,
          customerNote,
          channel: "MANUAL",
          status: "NEW"
        }
      );
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

    await writeAuditLog(prisma, {
      companyId: dealer.companyId,
      action: "DEALER_ORDER_CREATED",
      entity: "ORDER",
      entityId: order.id,
      newValue: {
        dealerId: dealer.id,
        customerId: selectedCustomer?.id ?? null,
        customerName: customerName ?? null,
        customerPhone: customerPhone ?? null,
        channel: "MANUAL",
        totalPrice: Number(order.totalPrice ?? 0)
      }
    });

    reply.send(order);
  });

  app.post("/dealer/orders/:id/reorder", async (request, reply) => {
    const settings = await getDealerByApiKey(request, reply);
    if (!settings) return;
    const dealer = settings.dealer;
    const sourceOrderId = (request.params as any).id as string;

    const sourceOrder = await prisma.order.findFirst({
      where: {
        id: sourceOrderId,
        dealerId: dealer.id
      },
      include: {
        items: true
      }
    });

    if (!sourceOrder) {
      reply.status(404).send({ message: "Kaynak siparis bulunamadi" });
      return;
    }

    const items = sourceOrder.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId ?? undefined,
      quantity: Number(item.quantity ?? 0),
      note: item.note ?? undefined
    }));

    if (!items.length) {
      reply.status(400).send({ message: "Kaynak sipariste siparis kalemi yok" });
      return;
    }

    try {
      const order = await createDealerOrderFromItems(
        {
          id: dealer.id,
          companyId: dealer.companyId
        },
        {
          marginPercent: settings.marginPercent,
          roundingType: settings.roundingType
        },
        items,
        {
          customerId: sourceOrder.customerId ?? undefined,
          customerName: sourceOrder.customerName ?? undefined,
          customerPhone: sourceOrder.customerPhone ?? undefined,
          customerNote: sourceOrder.customerNote ?? undefined,
          channel: "MANUAL",
          status: "NEW"
        }
      );

      if (!order) {
        reply.status(400).send({ message: "Tekrar siparis olusturulamadi" });
        return;
      }

      await writeAuditLog(prisma, {
        companyId: dealer.companyId,
        action: "DEALER_ORDER_REORDERED",
        entity: "ORDER",
        entityId: order.id,
        newValue: {
          dealerId: dealer.id,
          sourceOrderId
        }
      });

      reply.send({ sourceOrderId, order });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tekrar siparis olusturulamadi";
      reply.status(400).send({
        message,
        risk: (error as any)?.risk ?? undefined
      });
    }
  });

  app.get("/dealer/orders", async (request, reply) => {
    const settings = await getDealerByApiKey(request, reply);
    if (!settings) return;
    const dealer = settings.dealer;
    const query = dealerOrdersQuerySchema.parse(request.query ?? {});
    const selectedCustomerId = cleanOptionalText(query.customerId);

    const orders = await prisma.order.findMany({
      where: {
        dealerId: dealer.id,
        ...(selectedCustomerId ? { customerId: selectedCustomerId } : {})
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
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

    reply.send(toDealerOrderHistoryRows(orders));
  });

  app.post("/dealer/service-requests", async (request, reply) => {
    const settings = await getDealerByApiKey(request, reply);
    if (!settings) return;
    const dealer = settings.dealer;
    const data = dealerServiceRequestSchema.parse(request.body);

    if (data.orderId) {
      const order = await prisma.order.findFirst({
        where: { id: data.orderId, dealerId: dealer.id },
        select: { id: true }
      });
      if (!order) {
        reply.status(400).send({ message: "Belirtilen siparis bu bayiye ait degil" });
        return;
      }
    }

    const serviceRequest = await prisma.dealerServiceRequest.create({
      data: {
        companyId: dealer.companyId,
        dealerId: dealer.id,
        orderId: data.orderId ?? null,
        type: data.type,
        note: data.note,
        payload:
          data.payload === undefined
            ? undefined
            : (data.payload as Prisma.InputJsonValue)
      }
    });

    await writeAuditLog(prisma, {
      companyId: dealer.companyId,
      action: "DEALER_SERVICE_REQUEST_CREATED",
      entity: "DEALER_SERVICE_REQUEST",
      entityId: serviceRequest.id,
      newValue: {
        dealerId: dealer.id,
        type: serviceRequest.type,
        status: serviceRequest.status,
        orderId: serviceRequest.orderId
      }
    });

    const paymentLink =
      data.type === "PAYMENT_LINK"
        ? `https://portal.odeme.local/request/${serviceRequest.id}`
        : null;

    reply.send({
      request: serviceRequest,
      paymentLink
    });
  });

  app.get("/dealer/service-requests", async (request, reply) => {
    const settings = await getDealerByApiKey(request, reply);
    if (!settings) return;
    const dealer = settings.dealer;

    const rows = await prisma.dealerServiceRequest.findMany({
      where: { dealerId: dealer.id },
      orderBy: { createdAt: "desc" },
      take: 200
    });

    reply.send(rows);
  });

  app.get("/dealers/:dealerId/service-requests", async (request, reply) => {
    const dealerId = (request.params as any).dealerId as string;

    const rows = await prisma.dealerServiceRequest.findMany({
      where: { dealerId },
      orderBy: { createdAt: "desc" },
      take: 500
    });

    reply.send(rows);
  });

  app.patch("/dealers/:dealerId/service-requests/:requestId", async (request, reply) => {
    const dealerId = (request.params as any).dealerId as string;
    const requestId = (request.params as any).requestId as string;
    const data = dealerServiceRequestUpdateSchema.parse(request.body);
    const authUserId = (request as any).authUser?.id ?? null;

    const existing = await prisma.dealerServiceRequest.findFirst({
      where: {
        id: requestId,
        dealerId
      }
    });

    if (!existing) {
      reply.status(404).send({ message: "Talep bulunamadi" });
      return;
    }

    const nextStatus = data.status ?? existing.status;
    const updated = await prisma.dealerServiceRequest.update({
      where: { id: existing.id },
      data: {
        status: nextStatus,
        note: data.note ?? existing.note,
        resolvedAt:
          nextStatus === "RESOLVED" || nextStatus === "REJECTED"
            ? new Date()
            : null
      }
    });

    await writeAuditLog(prisma, {
      companyId: existing.companyId,
      userId: authUserId,
      action: "DEALER_SERVICE_REQUEST_UPDATED",
      entity: "DEALER_SERVICE_REQUEST",
      entityId: existing.id,
      oldValue: {
        status: existing.status,
        note: existing.note
      },
      newValue: {
        status: updated.status,
        note: updated.note
      }
    });

    reply.send(updated);
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







