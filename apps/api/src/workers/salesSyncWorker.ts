import axios from "axios";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";

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

function mapWooStatus(status: string) {
  if (status === "completed") return "COMPLETED";
  if (status === "processing") return "PROCESSING";
  if (status === "cancelled" || status === "refunded") return "CANCELLED";
  return "NEW";
}

function buildWooUrl(baseUrl: string) {
  return `${baseUrl.replace(/\/$/, "")}/wp-json/wc/v3/orders`;
}

function parseWooCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date();
  return date;
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

async function syncIntegration(integrationId: string) {
  const integration = await prisma.dealerIntegration.findUnique({
    where: { id: integrationId }
  });

  if (!integration || !integration.active || integration.platform !== "WOO") return;
  if (!integration.baseUrl || !integration.consumerKey || !integration.consumerSecret) return;

  const after = integration.lastSyncAt ? integration.lastSyncAt.toISOString() : undefined;

  const url = buildWooUrl(integration.baseUrl);
  const perPage = 100;
  const maxPages = 400;
  let page = 1;
  let imported = 0;
  let skipped = 0;

  const dealerLocation = await ensureDealerLocation(integration.companyId, integration.dealerId);
  if (!dealerLocation) return;

  while (page <= maxPages) {
    const response = await axios.get<WooOrder[]>(url, {
      auth: { username: integration.consumerKey, password: integration.consumerSecret },
      params: {
        per_page: perPage,
        page,
        status: "processing,completed,cancelled,refunded",
        orderby: "date",
        order: "asc",
        ...(after ? { after } : {})
      }
    });

    const orders = response.data;
    if (!orders.length) break;

    const totalPagesHeader = Number(response.headers["x-wp-totalpages"] ?? 0);

    for (const order of orders) {
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
        const mapping = await prisma.productMapping.findFirst({
          where: {
            dealerId: integration.dealerId,
            platform: "WOO",
            externalProductId: String(line.product_id),
            externalVariantId: line.variation_id ? String(line.variation_id) : null
          }
        });

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

  await prisma.dealerIntegration.update({
    where: { id: integration.id },
    data: { lastSyncAt: new Date() }
  });

  await prisma.integrationLog.create({
    data: {
      companyId: integration.companyId,
      dealerId: integration.dealerId,
      platform: "WOO",
      status: "SYNCED",
      payload: { imported, skipped }
    }
  });
}

async function tick() {
  const integrations = await prisma.dealerIntegration.findMany({
    where: { active: true, platform: "WOO" }
  });

  for (const integration of integrations) {
    try {
      await syncIntegration(integration.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bilinmeyen worker sync hatasi";
      await prisma.integrationLog.create({
        data: {
          companyId: integration.companyId,
          dealerId: integration.dealerId,
          platform: "WOO",
          status: "ERROR",
          errorMessage: message
        }
      });
    }
  }
}

const intervalMs = Number(process.env.SALES_SYNC_INTERVAL_MS ?? 300000);

async function start() {
  await tick();
  setInterval(tick, intervalMs);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});


