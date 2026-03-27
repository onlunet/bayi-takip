import { FastifyInstance } from "fastify";
import prisma from "../lib/prisma.js";

function buildCreatedAtRange(from?: string, to?: string) {
  if (!from && !to) return undefined;

  const range: { gte?: Date; lte?: Date } = {};

  if (from) {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    range.gte = start;
  }

  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    range.lte = end;
  }

  return range;
}

function startOfDayDaysAgo(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

function decimalToNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isRecoverableReportQueryError(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();

  if (code === "P2022" || code === "P2010") return true;
  if (normalized.includes("does not exist")) return true;
  if (normalized.includes("unknown field")) return true;
  if (normalized.includes("unknown arg")) return true;
  if (normalized.includes("cannot read properties of undefined")) return true;
  return false;
}

async function getTableColumns(tableName: string) {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = $1`,
      tableName
    );
    return new Set(rows.map((row) => row.column_name));
  } catch {
    return new Set<string>();
  }
}

function getUrgency(coverageDays: number | null, dailyAverage: number, safetyDays: number, targetCoverageDays: number) {
  if (dailyAverage <= 0) return "NO_DEMAND" as const;
  if (coverageDays === null) return "PLAN" as const;
  if (coverageDays < Math.max(2, safetyDays * 0.5)) return "CRITICAL" as const;
  if (coverageDays < safetyDays) return "WARNING" as const;
  if (coverageDays < targetCoverageDays) return "PLAN" as const;
  return "OK" as const;
}

function guessUnitFromPayload(payload: any) {
  const text = `${payload?.name ?? ""} ${payload?.parent_name ?? ""} ${JSON.stringify(payload?.meta_data ?? [])}`.toLowerCase();
  if (text.includes("kg")) return "KG";
  if (text.includes("lt")) return "LT";
  return "PIECE";
}

function parseUnmappedLine(log: any) {
  const payload = (log.payload ?? {}) as any;
  const externalProductId = payload.product_id ? String(payload.product_id) : "-";
  const externalVariantId =
    payload.variation_id && Number(payload.variation_id) > 0 ? String(payload.variation_id) : "";
  const orderId = String(log.externalId ?? "-");
  const lineIdentity = String(payload.id ?? `${externalProductId}:${externalVariantId}:${payload.name ?? "-"}`);
  const lineKey = `${orderId}:${lineIdentity}`;

  const quantity = Number(payload.quantity ?? 0);
  const priceOrTotal = Number(payload.total ?? payload.price ?? 0);
  const total = Number.isFinite(priceOrTotal) ? priceOrTotal : 0;
  const safeQuantity = Number.isFinite(quantity) ? quantity : 0;

  return {
    lineKey,
    orderId,
    externalProductId,
    externalVariantId,
    name: payload.parent_name ?? payload.name ?? `Harici Urun ${externalProductId}`,
    unit: guessUnitFromPayload(payload),
    quantity: safeQuantity,
    total,
    createdAt: new Date(log.createdAt)
  };
}

export async function registerReportRoutes(app: FastifyInstance) {
  app.get("/reports/stock-summary", async (request, reply) => {
    const companyId = (request.query as any).companyId as string | undefined;
    if (!companyId) {
      reply.status(400).send({ message: "companyId required" });
      return;
    }

    const products = await prisma.product.findMany({
      where: { companyId, active: true },
      include: { variants: true },
      orderBy: { name: "asc" }
    });

    const moves = await prisma.stockMovement.groupBy({
      by: ["productId", "variantId", "type"],
      where: { companyId },
      _sum: { quantity: true }
    });

    const totals = new Map<string, Record<string, number>>();

    for (const move of moves) {
      const key = `${move.productId}:${move.variantId ?? ""}`;
      const entry = totals.get(key) ?? {};
      entry[move.type] = (entry[move.type] ?? 0) + Number(move._sum.quantity ?? 0);
      totals.set(key, entry);
    }

    const rows = products.flatMap((product) => {
      const baseKey = `${product.id}:`;
      const baseTotals = totals.get(baseKey) ?? {};
      const baseSum = Object.values(baseTotals).reduce((sum, value) => Number(sum) + Number(value), 0);

      const productRow = {
        productId: product.id,
        variantId: null,
        name: product.name,
        unit: product.unit,
        totals: baseTotals,
        balance: baseSum
      };

      const variantRows = product.variants.map((variant) => {
        const key = `${product.id}:${variant.id}`;
        const variantTotals = totals.get(key) ?? {};
        const variantSum = Object.values(variantTotals).reduce((sum, value) => Number(sum) + Number(value), 0);
        return {
          productId: product.id,
          variantId: variant.id,
          name: `${product.name} - ${variant.name}`,
          unit: variant.unit,
          totals: variantTotals,
          balance: variantSum
        };
      });

      return [productRow, ...variantRows];
    });

    reply.send(rows);
  });

  app.get("/reports/warehouse-stock", async (request, reply) => {
    const companyId = (request.query as any).companyId as string | undefined;
    const warehouseId = (request.query as any).warehouseId as string | undefined;
    if (!companyId || !warehouseId) {
      reply.status(400).send({ message: "companyId and warehouseId required" });
      return;
    }

    const location = await prisma.location.findFirst({
      where: { companyId, type: "WAREHOUSE", referenceId: warehouseId }
    });
    if (!location) {
      reply.send([]);
      return;
    }

    const products = await prisma.product.findMany({
      where: { companyId, active: true },
      orderBy: { name: "asc" }
    });

    const moves = await prisma.stockMovement.groupBy({
      by: ["productId"],
      where: { companyId, locationId: location.id },
      _sum: { quantity: true }
    });

    const map = new Map<string, number>();
    moves.forEach((move) => map.set(move.productId, Number(move._sum.quantity ?? 0)));

    const rows = products.map((product) => ({
      productId: product.id,
      name: product.name,
      unit: product.unit,
      balance: map.get(product.id) ?? 0
    }));

    reply.send(rows);
  });

  app.get("/reports/sales-summary", async (request, reply) => {
    const companyId = (request.query as any).companyId as string | undefined;
    if (!companyId) {
      reply.status(400).send({ message: "companyId required" });
      return;
    }

    const from = (request.query as any).from as string | undefined;
    const to = (request.query as any).to as string | undefined;
    const createdAt = buildCreatedAtRange(from, to);

    const where = {
      companyId,
      ...(createdAt ? { createdAt } : {})
    } as const;

    const orders = await prisma.order.groupBy({
      by: ["channel"],
      where,
      _sum: { totalPrice: true },
      _count: { _all: true }
    });

    reply.send(
      orders.map((row) => ({
        channel: row.channel,
        totalOrders: row._count._all,
        totalPrice: Number(row._sum.totalPrice ?? 0)
      }))
    );
  });

  app.get("/reports/woo-product-sales", async (request, reply) => {
    const companyId = (request.query as any).companyId as string | undefined;
    if (!companyId) {
      reply.status(400).send({ message: "companyId required" });
      return;
    }

    const from = (request.query as any).from as string | undefined;
    const to = (request.query as any).to as string | undefined;
    const createdAt = buildCreatedAtRange(from, to);

    const loadMappedRows = async () => {
      const orderItemDelegate = (prisma as any).orderItem;

      const loadWithSqlFallback = async () => {
        const orderColumns = await getTableColumns("Order");
        const orderItemColumns = await getTableColumns("OrderItem");
        const productColumns = await getTableColumns("Product");

        if (!orderColumns.has("companyId") || !orderItemColumns.has("orderId") || !orderItemColumns.has("productId")) {
          return [];
        }
        if (!productColumns.has("id") || !productColumns.has("name") || !productColumns.has("unit")) {
          return [];
        }

        const whereParts = [`o."companyId" = $1`];
        const params: unknown[] = [companyId];
        const hasChannel = orderColumns.has("channel");
        const hasSource = orderColumns.has("source");
        if (hasChannel) {
          whereParts.push(`UPPER(COALESCE(o."channel"::text, '')) = 'WOO'`);
        } else if (hasSource) {
          whereParts.push(`UPPER(COALESCE(o."source"::text, '')) = 'WOO'`);
        }

        if (createdAt?.gte && orderColumns.has("createdAt")) {
          params.push(createdAt.gte);
          whereParts.push(`o."createdAt" >= $${params.length}`);
        }
        if (createdAt?.lte && orderColumns.has("createdAt")) {
          params.push(createdAt.lte);
          whereParts.push(`o."createdAt" <= $${params.length}`);
        }

        const quantityExpr = orderItemColumns.has("quantity") ? `COALESCE(oi."quantity", 0)` : "0";
        const totalExpr = orderItemColumns.has("total")
          ? `COALESCE(oi."total", 0)`
          : orderItemColumns.has("unitPrice")
            ? `${quantityExpr} * COALESCE(oi."unitPrice", 0)`
            : "0";

        const sqlRows = await prisma.$queryRawUnsafe<
          Array<{
            name: string;
            unit: string;
            totalQuantity: unknown;
            totalAmount: unknown;
            totalOrders: unknown;
          }>
        >(
          `SELECT p."name" AS "name",
                  p."unit"::text AS "unit",
                  SUM(${quantityExpr}) AS "totalQuantity",
                  SUM(${totalExpr}) AS "totalAmount",
                  COUNT(DISTINCT oi."orderId") AS "totalOrders"
           FROM "OrderItem" oi
           INNER JOIN "Order" o ON o."id" = oi."orderId"
           INNER JOIN "Product" p ON p."id" = oi."productId"
           WHERE ${whereParts.join(" AND ")}
           GROUP BY p."name", p."unit"
           ORDER BY SUM(${quantityExpr}) DESC`,
          ...params
        );

        return sqlRows.map((row) => ({
          name: row.name,
          unit: row.unit,
          totalQuantity: round2(decimalToNumber(row.totalQuantity)),
          totalAmount: round2(decimalToNumber(row.totalAmount)),
          totalOrders: Math.max(0, Math.round(decimalToNumber(row.totalOrders))),
          source: "MAPPED"
        }));
      };

      if (!orderItemDelegate?.findMany) {
        request.log.warn("orderItem delegate missing, woo-product-sales SQL fallback is used");
        try {
          return await loadWithSqlFallback();
        } catch (fallbackError) {
          request.log.error({ error: fallbackError }, "woo-product-sales SQL fallback failed");
          return [];
        }
      }

      try {
        const orderWhere = {
          companyId,
          channel: "WOO" as const,
          ...(createdAt ? { createdAt } : {})
        };

        const mappedItems = await orderItemDelegate.findMany({
          where: { order: orderWhere },
          include: {
            product: { select: { name: true, unit: true, active: true } },
            variant: { select: { name: true, unit: true } },
            order: { select: { id: true } }
          }
        });

        const grouped = new Map<string, any>();
        for (const item of mappedItems) {
          if (item.product?.active === false) continue;
          const key = `${item.productId}:${item.variantId ?? ""}`;
          const existing = grouped.get(key) ?? {
            name: item.variant ? `${item.product.name} / ${item.variant.name}` : item.product.name,
            unit: item.variant?.unit ?? item.product.unit,
            totalQuantity: 0,
            totalAmount: 0,
            orderIds: new Set<string>(),
            source: "MAPPED"
          };

          existing.totalQuantity += decimalToNumber(item.quantity);
          existing.totalAmount += decimalToNumber(item.total);
          if (item.order?.id) {
            existing.orderIds.add(item.order.id);
          }
          grouped.set(key, existing);
        }

        return Array.from(grouped.values()).map((row: any) => ({
          name: row.name,
          unit: row.unit,
          totalQuantity: round2(decimalToNumber(row.totalQuantity)),
          totalAmount: round2(decimalToNumber(row.totalAmount)),
          totalOrders: row.orderIds?.size ?? 0,
          source: row.source
        }));
      } catch (error) {
        if (!isRecoverableReportQueryError(error)) throw error;
        request.log.warn({ error }, "woo-product-sales prisma query failed, SQL fallback is used");
        try {
          return await loadWithSqlFallback();
        } catch (fallbackError) {
          request.log.error({ error: fallbackError }, "woo-product-sales SQL fallback failed");
          return [];
        }
      }
    };

    const mappedRows = await loadMappedRows();

    let unmappedLogs: any[] = [];
    try {
      const logWhere = {
        companyId,
        platform: "WOO" as const,
        status: "UNMAPPED",
        ...(createdAt ? { createdAt } : {})
      };
      unmappedLogs = await prisma.integrationLog.findMany({
        where: logWhere,
        orderBy: { createdAt: "desc" }
      });
    } catch (error) {
      if (!isRecoverableReportQueryError(error)) throw error;
      request.log.warn({ error }, "woo-product-sales unmapped logs query skipped due compatibility issue");
      unmappedLogs = [];
    }

    const uniqueLines = new Map<string, any>();

    for (const log of unmappedLogs) {
      const payload = (log.payload ?? {}) as any;
      const lineKey = `${log.externalId ?? "-"}:${payload.id ?? payload.product_id ?? payload.name ?? "-"}:${payload.variation_id ?? ""}`;
      if (!uniqueLines.has(lineKey)) {
        uniqueLines.set(lineKey, payload);
      }
    }

    const unmappedGrouped = new Map<string, any>();

    for (const payload of uniqueLines.values()) {
      const productId = payload.product_id ? String(payload.product_id) : "-";
      const variationId = payload.variation_id && Number(payload.variation_id) > 0 ? String(payload.variation_id) : "";
      const key = `${productId}:${variationId}`;

      const name = payload.name ?? payload.parent_name ?? `Harici Urun ${productId}`;
      const unitGuessText = `${payload.name ?? ""} ${payload.parent_name ?? ""} ${JSON.stringify(payload.meta_data ?? [])}`.toLowerCase();
      const unit = unitGuessText.includes("kg") ? "KG" : unitGuessText.includes("lt") ? "LT" : "PIECE";
      const qty = Number(payload.quantity ?? 0);
      const total = Number(payload.total ?? payload.price ?? 0);

      const existing = unmappedGrouped.get(key) ?? {
        name,
        unit,
        totalQuantity: 0,
        totalAmount: 0,
        totalOrders: 0,
        source: "UNMAPPED"
      };

      existing.totalQuantity += Number.isFinite(qty) ? qty : 0;
      existing.totalAmount += Number.isFinite(total) ? total : 0;
      existing.totalOrders += 1;
      unmappedGrouped.set(key, existing);
    }

    const unmappedRows = Array.from(unmappedGrouped.values());
    const rows = [...mappedRows, ...unmappedRows].sort((a, b) => b.totalQuantity - a.totalQuantity);

    reply.send(rows);
  });

  app.get("/reports/product-summary", async (request, reply) => {
    const companyId = (request.query as any).companyId as string | undefined;
    if (!companyId) {
      reply.status(400).send({ message: "companyId required" });
      return;
    }

    const from = (request.query as any).from as string | undefined;
    const to = (request.query as any).to as string | undefined;
    const orderCreatedAt = buildCreatedAtRange(from, to);
    const dispatchDate = buildCreatedAtRange(from, to);

    type BalanceRow = { productId: string; _sum: { quantity: unknown } };
    type StockEntryRow = { productId: string; type: string; _sum: { quantity: unknown } };
    type SalesRow = {
      productId: string;
      quantity: unknown;
      order?: { channel?: string | null } | null;
      variant?: { multiplier?: unknown } | null;
    };
    type DispatchRow = {
      productId: string;
      quantity: unknown;
      variant?: { multiplier?: unknown } | null;
    };

    const stockMovementDelegate = (prisma as any).stockMovement;
    const orderItemDelegate = (prisma as any).orderItem;
    const dispatchItemDelegate = (prisma as any).dispatchItem;

    const loadBalanceRows = async (): Promise<BalanceRow[]> => {
      if (!stockMovementDelegate?.groupBy) {
        request.log.warn("stockMovement delegate missing, stock balance query skipped");
        return [];
      }

      try {
        return await stockMovementDelegate.groupBy({
          by: ["productId"],
          where: { companyId },
          _sum: { quantity: true }
        });
      } catch (error) {
        if (!isRecoverableReportQueryError(error)) throw error;
        request.log.warn({ error }, "product-summary balance groupBy failed, using SQL fallback");
        try {
          const rows = await prisma.$queryRawUnsafe<Array<{ productId: string; quantity: unknown }>>(
            `SELECT "productId", SUM("quantity") AS "quantity"
             FROM "StockMovement"
             WHERE "companyId" = $1
             GROUP BY "productId"`,
            companyId
          );
          return rows.map((row) => ({ productId: row.productId, _sum: { quantity: row.quantity } }));
        } catch (fallbackError) {
          request.log.error({ error: fallbackError }, "product-summary balance SQL fallback failed");
          return [];
        }
      }
    };

    const loadStockEntryRows = async (): Promise<StockEntryRow[]> => {
      if (!stockMovementDelegate?.groupBy) return [];
      try {
        return await stockMovementDelegate.groupBy({
          by: ["productId", "type"],
          where: {
            companyId,
            type: { in: ["PRODUCTION", "RETURN", "ADJUSTMENT"] }
          },
          _sum: { quantity: true }
        });
      } catch (error) {
        if (!isRecoverableReportQueryError(error)) throw error;
        request.log.warn({ error }, "product-summary stock-entry groupBy failed, using SQL fallback");
        try {
          const rows = await prisma.$queryRawUnsafe<Array<{ productId: string; type: string; quantity: unknown }>>(
            `SELECT "productId", "type", SUM("quantity") AS "quantity"
             FROM "StockMovement"
             WHERE "companyId" = $1
               AND "type" IN ('PRODUCTION', 'RETURN', 'ADJUSTMENT')
             GROUP BY "productId", "type"`,
            companyId
          );
          return rows.map((row) => ({ productId: row.productId, type: row.type, _sum: { quantity: row.quantity } }));
        } catch (fallbackError) {
          request.log.error({ error: fallbackError }, "product-summary stock-entry SQL fallback failed");
          return [];
        }
      }
    };

    const loadSalesRowsWithSql = async (): Promise<SalesRow[]> => {
      const conditions = [`o."companyId" = $1`];
      const params: unknown[] = [companyId];

      if (orderCreatedAt?.gte) {
        params.push(orderCreatedAt.gte);
        conditions.push(`o."createdAt" >= $${params.length}`);
      }
      if (orderCreatedAt?.lte) {
        params.push(orderCreatedAt.lte);
        conditions.push(`o."createdAt" <= $${params.length}`);
      }

      const rows = await prisma.$queryRawUnsafe<Array<{ productId: string; quantity: unknown; channel: string | null }>>(
        `SELECT oi."productId" AS "productId",
                oi."quantity" AS "quantity",
                o."channel" AS "channel"
         FROM "OrderItem" oi
         INNER JOIN "Order" o ON o."id" = oi."orderId"
         WHERE ${conditions.join(" AND ")}`,
        ...params
      );

      return rows.map((row) => ({
        productId: row.productId,
        quantity: row.quantity,
        order: { channel: row.channel ?? "MANUAL" },
        variant: null
      }));
    };

    const loadSalesRows = async (): Promise<SalesRow[]> => {
      if (!orderItemDelegate?.findMany) {
        request.log.warn("orderItem delegate missing, using SQL fallback for sales rows");
        try {
          return await loadSalesRowsWithSql();
        } catch (fallbackError) {
          request.log.error({ error: fallbackError }, "product-summary sales SQL fallback failed");
          return [];
        }
      }

      try {
        return await orderItemDelegate.findMany({
          where: {
            order: {
              companyId,
              ...(orderCreatedAt ? { createdAt: orderCreatedAt } : {})
            }
          },
          include: {
            order: { select: { channel: true } },
            variant: { select: { multiplier: true } }
          }
        });
      } catch (error) {
        if (!isRecoverableReportQueryError(error)) throw error;
        request.log.warn({ error }, "product-summary sales query failed, using SQL fallback");
        try {
          return await loadSalesRowsWithSql();
        } catch (fallbackError) {
          request.log.error({ error: fallbackError }, "product-summary sales SQL fallback failed");
          return [];
        }
      }
    };

    const loadDispatchRowsWithSql = async (): Promise<DispatchRow[]> => {
      const conditions = [`d."companyId" = $1`];
      const params: unknown[] = [companyId];

      if (dispatchDate?.gte) {
        params.push(dispatchDate.gte);
        conditions.push(`d."createdAt" >= $${params.length}`);
      }
      if (dispatchDate?.lte) {
        params.push(dispatchDate.lte);
        conditions.push(`d."createdAt" <= $${params.length}`);
      }

      const rows = await prisma.$queryRawUnsafe<Array<{ productId: string; quantity: unknown }>>(
        `SELECT di."productId" AS "productId",
                di."quantity" AS "quantity"
         FROM "DispatchItem" di
         INNER JOIN "Dispatch" d ON d."id" = di."dispatchId"
         WHERE ${conditions.join(" AND ")}`,
        ...params
      );

      return rows.map((row) => ({
        productId: row.productId,
        quantity: row.quantity,
        variant: null
      }));
    };

    const loadDispatchRows = async (): Promise<DispatchRow[]> => {
      if (!dispatchItemDelegate?.findMany) {
        request.log.warn("dispatchItem delegate missing, using SQL fallback for dispatch rows");
        try {
          return await loadDispatchRowsWithSql();
        } catch (fallbackError) {
          request.log.error({ error: fallbackError }, "product-summary dispatch SQL fallback failed");
          return [];
        }
      }

      try {
        return await dispatchItemDelegate.findMany({
          where: {
            dispatch: {
              companyId,
              status: "APPROVED",
              ...(dispatchDate ? { date: dispatchDate } : {})
            }
          },
          include: {
            variant: { select: { multiplier: true } }
          }
        });
      } catch (error) {
        if (!isRecoverableReportQueryError(error)) throw error;
        request.log.warn({ error }, "product-summary dispatch query failed, using SQL fallback");
        try {
          return await loadDispatchRowsWithSql();
        } catch (fallbackError) {
          request.log.error({ error: fallbackError }, "product-summary dispatch SQL fallback failed");
          return [];
        }
      }
    };

    const [products, balanceRows, stockEntryRows, salesItems, dispatchItems] = await Promise.all([
      prisma.product.findMany({
        where: { companyId, active: true },
        select: { id: true, name: true, unit: true },
        orderBy: { name: "asc" }
      }),
      loadBalanceRows(),
      loadStockEntryRows(),
      loadSalesRows(),
      loadDispatchRows()
    ]);

    const balanceByProduct = new Map<string, number>();
    for (const row of balanceRows) {
      balanceByProduct.set(row.productId, decimalToNumber(row._sum.quantity));
    }

    const stockEntryByProduct = new Map<string, number>();
    for (const row of stockEntryRows) {
      const current = stockEntryByProduct.get(row.productId) ?? 0;
      const quantity = decimalToNumber(row._sum.quantity);
      stockEntryByProduct.set(row.productId, current + Math.max(0, quantity));
    }

    const totalSalesByProduct = new Map<string, number>();
    const apiSalesByProduct = new Map<string, number>();

    for (const item of salesItems) {
      const multiplier = decimalToNumber(item.variant?.multiplier ?? 1);
      const quantity = decimalToNumber(item.quantity) * multiplier;
      if (!Number.isFinite(quantity) || quantity <= 0) continue;

      const totalCurrent = totalSalesByProduct.get(item.productId) ?? 0;
      totalSalesByProduct.set(item.productId, totalCurrent + quantity);

      const channel = item.order?.channel ?? "MANUAL";
      if (channel !== "MANUAL") {
        const apiCurrent = apiSalesByProduct.get(item.productId) ?? 0;
        apiSalesByProduct.set(item.productId, apiCurrent + quantity);
      }
    }

    const dispatchByProduct = new Map<string, number>();
    for (const item of dispatchItems) {
      const multiplier = decimalToNumber(item.variant?.multiplier ?? 1);
      const quantity = decimalToNumber(item.quantity) * multiplier;
      if (!Number.isFinite(quantity) || quantity <= 0) continue;

      const current = dispatchByProduct.get(item.productId) ?? 0;
      dispatchByProduct.set(item.productId, current + quantity);
    }

    const rows = products.map((product) => ({
      productId: product.id,
      name: product.name,
      unit: product.unit,
      totalStockEntry: round2(stockEntryByProduct.get(product.id) ?? 0),
      totalSales: round2(totalSalesByProduct.get(product.id) ?? 0),
      apiSales: round2(apiSalesByProduct.get(product.id) ?? 0),
      dispatch: round2(dispatchByProduct.get(product.id) ?? 0),
      balance: round2(balanceByProduct.get(product.id) ?? 0)
    }));

    reply.send(rows);
  });

  app.get("/reports/unmapped-product-summary", async (request, reply) => {
    const companyId = (request.query as any).companyId as string | undefined;
    if (!companyId) {
      reply.status(400).send({ message: "companyId required" });
      return;
    }

    const from = (request.query as any).from as string | undefined;
    const to = (request.query as any).to as string | undefined;
    const createdAt = buildCreatedAtRange(from, to);

    const logs = await prisma.integrationLog.findMany({
      where: {
        companyId,
        platform: "WOO",
        status: "UNMAPPED",
        ...(createdAt ? { createdAt } : {})
      },
      orderBy: { createdAt: "desc" }
    });

    const uniqueLines = new Map<string, ReturnType<typeof parseUnmappedLine>>();
    for (const log of logs) {
      const parsed = parseUnmappedLine(log);
      if (!uniqueLines.has(parsed.lineKey)) {
        uniqueLines.set(parsed.lineKey, parsed);
      }
    }

    const grouped = new Map<
      string,
      {
        externalProductId: string;
        name: string;
        unit: string;
        totalQuantity: number;
        totalAmount: number;
        orderIds: Set<string>;
        variationIds: Set<string>;
        firstSeenAt: Date | null;
        lastSeenAt: Date | null;
      }
    >();

    for (const line of uniqueLines.values()) {
      const key = line.externalProductId;
      const existing = grouped.get(key) ?? {
        externalProductId: line.externalProductId,
        name: line.name,
        unit: line.unit,
        totalQuantity: 0,
        totalAmount: 0,
        orderIds: new Set<string>(),
        variationIds: new Set<string>(),
        firstSeenAt: null,
        lastSeenAt: null
      };

      existing.totalQuantity += line.quantity;
      existing.totalAmount += line.total;
      existing.orderIds.add(line.orderId);
      if (line.externalVariantId) {
        existing.variationIds.add(line.externalVariantId);
      }

      if (!existing.firstSeenAt || line.createdAt < existing.firstSeenAt) {
        existing.firstSeenAt = line.createdAt;
      }
      if (!existing.lastSeenAt || line.createdAt > existing.lastSeenAt) {
        existing.lastSeenAt = line.createdAt;
      }

      grouped.set(key, existing);
    }

    const totalQuantity = Array.from(grouped.values()).reduce(
      (sum, row) => sum + row.totalQuantity,
      0
    );
    const totalAmount = Array.from(grouped.values()).reduce(
      (sum, row) => sum + row.totalAmount,
      0
    );

    const rows = Array.from(grouped.values())
      .map((row) => {
        const sharePercent = totalQuantity > 0 ? (row.totalQuantity / totalQuantity) * 100 : 0;
        let productionOpportunity = "Dusuk";
        if (sharePercent >= 15 || row.totalQuantity >= 100) {
          productionOpportunity = "Uretime Deger";
        } else if (sharePercent >= 5 || row.totalQuantity >= 30) {
          productionOpportunity = "Takip Et";
        }

        return {
          externalProductId: row.externalProductId,
          name: row.name,
          unit: row.unit,
          totalQuantity: round2(row.totalQuantity),
          totalAmount: round2(row.totalAmount),
          totalOrders: row.orderIds.size,
          variationCount: row.variationIds.size,
          sharePercent: round2(sharePercent),
          productionOpportunity,
          firstSeenAt: row.firstSeenAt?.toISOString() ?? null,
          lastSeenAt: row.lastSeenAt?.toISOString() ?? null
        };
      })
      .sort((a, b) => b.totalQuantity - a.totalQuantity);

    reply.send({
      summary: {
        totalUniqueLines: uniqueLines.size,
        totalProducts: rows.length,
        totalQuantity: round2(totalQuantity),
        totalAmount: round2(totalAmount),
        productionCandidateCount: rows.filter((row) => row.productionOpportunity === "Uretime Deger").length
      },
      rows
    });
  });

  app.get("/reports/production-plan", async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const companyId = query.companyId as string | undefined;

    if (!companyId) {
      reply.status(400).send({ message: "companyId required" });
      return;
    }

    const lookbackDays = clampInteger(query.lookbackDays, 30, 7, 180);
    const targetCoverageDays = clampInteger(query.targetCoverageDays, 30, 7, 90);
    const safetyDays = clampInteger(query.safetyDays, 14, 3, 60);
    const minBatchQuantity = clampNumber(query.minBatchQuantity, 0, 0, 1000000);

    const lookbackStart = startOfDayDaysAgo(lookbackDays);
    const sevenStart = startOfDayDaysAgo(7);
    const fourteenStart = startOfDayDaysAgo(14);
    const thirtyStart = startOfDayDaysAgo(30);

    const [productColumns, locationColumns, orderColumns, orderItemColumns, variantColumns, stockColumns] =
      await Promise.all([
        getTableColumns("Product"),
        getTableColumns("Location"),
        getTableColumns("Order"),
        getTableColumns("OrderItem"),
        getTableColumns("ProductVariant"),
        getTableColumns("StockMovement")
      ]);

    const loadProducts = async () => {
      try {
        return await prisma.product.findMany({
          where: { companyId, active: true },
          select: { id: true, name: true, unit: true },
          orderBy: { name: "asc" }
        });
      } catch (error) {
        if (!isRecoverableReportQueryError(error)) throw error;
        request.log.warn({ error }, "production-plan products query failed, SQL fallback is used");
      }

      if (!productColumns.has("id") || !productColumns.has("name")) return [];
      const whereParts = [`p."companyId" = $1`];
      const params: unknown[] = [companyId];
      if (productColumns.has("active")) {
        whereParts.push(`COALESCE(p."active", true) = true`);
      }
      const unitExpr = productColumns.has("unit") ? `p."unit"::text` : `'PIECE'`;

      try {
        const rows = await prisma.$queryRawUnsafe<Array<{ id: string; name: string; unit: string }>>(
          `SELECT p."id" AS "id", p."name" AS "name", ${unitExpr} AS "unit"
           FROM "Product" p
           WHERE ${whereParts.join(" AND ")}
           ORDER BY p."name" ASC`,
          ...params
        );

        return rows.map((row) => ({
          id: row.id,
          name: row.name,
          unit: (row.unit as any) ?? "PIECE"
        }));
      } catch (fallbackError) {
        request.log.error({ error: fallbackError }, "production-plan products SQL fallback failed");
        return [];
      }
    };

    const loadWarehouseLocationIds = async () => {
      if (!locationColumns.has("id") || !locationColumns.has("companyId") || !locationColumns.has("type")) {
        return [] as string[];
      }

      try {
        const rows = await prisma.location.findMany({
          where: { companyId, type: "WAREHOUSE" },
          select: { id: true }
        });
        return rows.map((item) => item.id);
      } catch (error) {
        if (!isRecoverableReportQueryError(error)) throw error;
        request.log.warn({ error }, "production-plan warehouse locations query failed, SQL fallback is used");
      }

      try {
        const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT "id" FROM "Location"
           WHERE "companyId" = $1 AND "type"::text = 'WAREHOUSE'`,
          companyId
        );
        return rows.map((item) => item.id);
      } catch (fallbackError) {
        request.log.error({ error: fallbackError }, "production-plan warehouse locations SQL fallback failed");
        return [];
      }
    };

    const loadOrderItems = async () => {
      if (!orderItemColumns.has("productId") || !orderItemColumns.has("orderId")) {
        return [] as Array<{ productId: string; quantity: unknown; createdAt: Date | string; channel: string }>;
      }

      const whereParts: string[] = [];
      const params: unknown[] = [];

      if (orderColumns.has("companyId")) {
        params.push(companyId);
        whereParts.push(`o."companyId" = $${params.length}`);
      }
      if (orderColumns.has("status")) {
        whereParts.push(`COALESCE(o."status"::text, '') <> 'CANCELLED'`);
      }
      if (orderColumns.has("createdAt")) {
        params.push(lookbackStart);
        whereParts.push(`o."createdAt" >= $${params.length}`);
      }
      if (!whereParts.length) return [];

      const channelExpr = orderColumns.has("channel")
        ? `COALESCE(o."channel"::text, 'MANUAL')`
        : orderColumns.has("source")
          ? `COALESCE(o."source"::text, 'MANUAL')`
          : `'MANUAL'`;

      const createdAtExpr = orderColumns.has("createdAt") ? `o."createdAt"` : "CURRENT_TIMESTAMP";
      const hasVariantMultiplier =
        orderItemColumns.has("variantId") && variantColumns.has("id") && variantColumns.has("multiplier");
      const quantityExpr = hasVariantMultiplier
        ? `COALESCE(oi."quantity", 0) * COALESCE(pv."multiplier", 1)`
        : `COALESCE(oi."quantity", 0)`;
      const variantJoin = hasVariantMultiplier ? `LEFT JOIN "ProductVariant" pv ON pv."id" = oi."variantId"` : "";

      try {
        return await prisma.$queryRawUnsafe<
          Array<{ productId: string; quantity: unknown; createdAt: Date | string; channel: string }>
        >(
          `SELECT
             oi."productId" AS "productId",
             ${quantityExpr} AS "quantity",
             ${createdAtExpr} AS "createdAt",
             ${channelExpr} AS "channel"
           FROM "OrderItem" oi
           INNER JOIN "Order" o ON o."id" = oi."orderId"
           ${variantJoin}
           WHERE ${whereParts.join(" AND ")}`,
          ...params
        );
      } catch (error) {
        request.log.error({ error }, "production-plan order items SQL query failed");
        return [];
      }
    };

    const loadNetworkBalances = async () => {
      if (!stockColumns.has("productId") || !stockColumns.has("quantity")) {
        return [] as Array<{ productId: string; quantity: unknown }>;
      }

      const whereParts: string[] = [];
      const params: unknown[] = [];
      if (stockColumns.has("companyId")) {
        params.push(companyId);
        whereParts.push(`"companyId" = $${params.length}`);
      }

      try {
        return await prisma.$queryRawUnsafe<Array<{ productId: string; quantity: unknown }>>(
          `SELECT "productId", SUM("quantity") AS "quantity"
           FROM "StockMovement"
           ${whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : ""}
           GROUP BY "productId"`,
          ...params
        );
      } catch (error) {
        request.log.error({ error }, "production-plan network balances SQL query failed");
        return [];
      }
    };

    const loadWarehouseBalances = async (warehouseLocationIds: string[]) => {
      if (
        !warehouseLocationIds.length ||
        !stockColumns.has("productId") ||
        !stockColumns.has("quantity") ||
        !stockColumns.has("locationId")
      ) {
        return [] as Array<{ productId: string; quantity: unknown }>;
      }

      const params: unknown[] = [];
      const whereParts: string[] = [];

      if (stockColumns.has("companyId")) {
        params.push(companyId);
        whereParts.push(`"companyId" = $${params.length}`);
      }

      const locationPlaceholders = warehouseLocationIds
        .map((locationId) => {
          params.push(locationId);
          return `$${params.length}`;
        })
        .join(", ");
      whereParts.push(`"locationId" IN (${locationPlaceholders})`);

      try {
        return await prisma.$queryRawUnsafe<Array<{ productId: string; quantity: unknown }>>(
          `SELECT "productId", SUM("quantity") AS "quantity"
           FROM "StockMovement"
           WHERE ${whereParts.join(" AND ")}
           GROUP BY "productId"`,
          ...params
        );
      } catch (error) {
        request.log.error({ error }, "production-plan warehouse balances SQL query failed");
        return [];
      }
    };

    const loadWarehouseMoves = async (warehouseLocationIds: string[]) => {
      if (
        !warehouseLocationIds.length ||
        !stockColumns.has("productId") ||
        !stockColumns.has("quantity") ||
        !stockColumns.has("locationId")
      ) {
        return [] as Array<{ productId: string; type: string | null; reason: string | null; quantity: unknown }>;
      }

      const params: unknown[] = [];
      const whereParts: string[] = [];

      if (stockColumns.has("companyId")) {
        params.push(companyId);
        whereParts.push(`"companyId" = $${params.length}`);
      }

      const locationPlaceholders = warehouseLocationIds
        .map((locationId) => {
          params.push(locationId);
          return `$${params.length}`;
        })
        .join(", ");
      whereParts.push(`"locationId" IN (${locationPlaceholders})`);

      if (stockColumns.has("createdAt")) {
        params.push(lookbackStart);
        whereParts.push(`"createdAt" >= $${params.length}`);
      }

      const typeExpr = stockColumns.has("type") ? `"type"::text` : "NULL";
      const reasonExpr = stockColumns.has("reason") ? `"reason"::text` : "NULL";
      const groupByParts = [`"productId"`];
      if (stockColumns.has("type")) groupByParts.push(`"type"`);
      if (stockColumns.has("reason")) groupByParts.push(`"reason"`);

      try {
        return await prisma.$queryRawUnsafe<
          Array<{ productId: string; type: string | null; reason: string | null; quantity: unknown }>
        >(
          `SELECT "productId",
                  ${typeExpr} AS "type",
                  ${reasonExpr} AS "reason",
                  SUM("quantity") AS "quantity"
           FROM "StockMovement"
           WHERE ${whereParts.join(" AND ")}
           GROUP BY ${groupByParts.join(", ")}`,
          ...params
        );
      } catch (error) {
        request.log.error({ error }, "production-plan warehouse moves SQL query failed");
        return [];
      }
    };

    const products = await loadProducts();
    const warehouseLocationIds = await loadWarehouseLocationIds();
    const [orderItems, networkBalancesRaw, warehouseBalancesRaw, warehouseMovesRaw] = await Promise.all([
      loadOrderItems(),
      loadNetworkBalances(),
      loadWarehouseBalances(warehouseLocationIds),
      loadWarehouseMoves(warehouseLocationIds)
    ]);

    const productIdSet = new Set(products.map((product) => product.id));

    const networkBalanceMap = new Map<string, number>();
    networkBalancesRaw.forEach((item) => {
      if (!productIdSet.has(item.productId)) return;
      networkBalanceMap.set(item.productId, decimalToNumber(item.quantity));
    });

    const warehouseBalanceMap = new Map<string, number>();
    warehouseBalancesRaw.forEach((item) => {
      if (!productIdSet.has(item.productId)) return;
      warehouseBalanceMap.set(item.productId, decimalToNumber(item.quantity));
    });

    const movementStatsMap = new Map<
      string,
      { production: number; dispatch: number; returns: number; adjustment: number }
    >();

    warehouseMovesRaw.forEach((item) => {
      if (!productIdSet.has(item.productId)) return;

      const key = item.productId;
      const current = movementStatsMap.get(key) ?? {
        production: 0,
        dispatch: 0,
        returns: 0,
        adjustment: 0
      };
      const qty = decimalToNumber(item.quantity);
      const type = String(item.type ?? "").toUpperCase();
      const reason = String(item.reason ?? "").toUpperCase();

      if (type === "PRODUCTION") current.production += qty;
      else if (type === "DISPATCH") current.dispatch += Math.abs(qty);
      else if (type === "RETURN") current.returns += qty;
      else if (type === "ADJUSTMENT") current.adjustment += qty;
      else if (type === "OUT") {
        current.dispatch += Math.abs(qty);
      } else if (type === "IN") {
        if (reason === "RETURN") current.returns += qty;
        else current.production += qty;
      } else if (type === "ADJUST" || reason === "MANUAL") {
        current.adjustment += qty;
      } else if (reason === "DELIVERY" || reason === "SALE") {
        current.dispatch += Math.abs(qty);
      } else if (reason === "RETURN") {
        current.returns += qty;
      }

      movementStatsMap.set(key, current);
    });

    const salesMap = new Map<
      string,
      {
        lookback: number;
        seven: number;
        prevSeven: number;
        thirty: number;
        woo: number;
        manual: number;
        other: number;
      }
    >();

    for (const item of orderItems) {
      const key = item.productId;
      if (!productIdSet.has(key)) continue;

      const current = salesMap.get(key) ?? {
        lookback: 0,
        seven: 0,
        prevSeven: 0,
        thirty: 0,
        woo: 0,
        manual: 0,
        other: 0
      };

      const quantity = decimalToNumber(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) continue;
      const createdAt = new Date(item.createdAt ?? new Date());

      current.lookback += quantity;

      if (createdAt >= sevenStart) current.seven += quantity;
      if (createdAt >= fourteenStart && createdAt < sevenStart) current.prevSeven += quantity;
      if (createdAt >= thirtyStart) current.thirty += quantity;

      const channel = String(item.channel ?? "MANUAL").toUpperCase();
      if (channel === "WOO") current.woo += quantity;
      else if (channel === "MANUAL") current.manual += quantity;
      else current.other += quantity;

      salesMap.set(key, current);
    }

    const rows = products
      .map((product) => {
        const sales = salesMap.get(product.id) ?? {
          lookback: 0,
          seven: 0,
          prevSeven: 0,
          thirty: 0,
          woo: 0,
          manual: 0,
          other: 0
        };

        const movementStats = movementStatsMap.get(product.id) ?? {
          production: 0,
          dispatch: 0,
          returns: 0,
          adjustment: 0
        };

        const warehouseStock = Number(warehouseBalanceMap.get(product.id) ?? 0);
        const networkStock = Number(networkBalanceMap.get(product.id) ?? 0);
        const dailyAverage = sales.lookback / lookbackDays;
        const coverageDays = dailyAverage > 0 ? warehouseStock / dailyAverage : null;

        const safetyStockQuantity = dailyAverage * safetyDays;
        const targetStockQuantity = dailyAverage * targetCoverageDays;

        let recommendedQuantity = Math.max(0, targetStockQuantity - warehouseStock);
        if (recommendedQuantity > 0 && minBatchQuantity > 0 && recommendedQuantity < minBatchQuantity) {
          recommendedQuantity = minBatchQuantity;
        }

        const trendPercent =
          sales.prevSeven > 0
            ? ((sales.seven - sales.prevSeven) / sales.prevSeven) * 100
            : sales.seven > 0
              ? 100
              : 0;

        const urgency = getUrgency(coverageDays, dailyAverage, safetyDays, targetCoverageDays);

        return {
          productId: product.id,
          productName: product.name,
          unit: product.unit,
          warehouseStock: round2(warehouseStock),
          networkStock: round2(networkStock),
          lookbackSales: round2(sales.lookback),
          salesLast7: round2(sales.seven),
          salesLast30: round2(sales.thirty),
          salesByChannel: {
            woo: round2(sales.woo),
            manual: round2(sales.manual),
            other: round2(sales.other)
          },
          dailyAverage: round2(dailyAverage),
          coverageDays: coverageDays === null ? null : round2(coverageDays),
          safetyStockQuantity: round2(safetyStockQuantity),
          targetStockQuantity: round2(targetStockQuantity),
          recommendedQuantity: round2(recommendedQuantity),
          trendPercent: round2(trendPercent),
          movementLastLookback: {
            production: round2(movementStats.production),
            dispatch: round2(movementStats.dispatch),
            returns: round2(movementStats.returns),
            adjustment: round2(movementStats.adjustment)
          },
          urgency
        };
      })
      .sort((a, b) => {
        const priority: Record<string, number> = {
          CRITICAL: 0,
          WARNING: 1,
          PLAN: 2,
          OK: 3,
          NO_DEMAND: 4
        };

        const urgencyDiff = (priority[a.urgency] ?? 9) - (priority[b.urgency] ?? 9);
        if (urgencyDiff !== 0) return urgencyDiff;

        if (b.recommendedQuantity !== a.recommendedQuantity) {
          return b.recommendedQuantity - a.recommendedQuantity;
        }

        return b.dailyAverage - a.dailyAverage;
      });

    const summary = rows.reduce(
      (acc, row) => {
        acc.totalProducts += 1;
        acc.totalRecommendedQuantity += row.recommendedQuantity;

        if (row.urgency === "CRITICAL") acc.critical += 1;
        if (row.urgency === "WARNING") acc.warning += 1;
        if (row.urgency === "PLAN") acc.plan += 1;
        if (row.urgency === "OK") acc.ok += 1;
        if (row.urgency === "NO_DEMAND") acc.noDemand += 1;

        return acc;
      },
      {
        totalProducts: 0,
        totalRecommendedQuantity: 0,
        critical: 0,
        warning: 0,
        plan: 0,
        ok: 0,
        noDemand: 0
      }
    );

    reply.send({
      generatedAt: new Date().toISOString(),
      params: {
        lookbackDays,
        targetCoverageDays,
        safetyDays,
        minBatchQuantity
      },
      summary: {
        ...summary,
        totalRecommendedQuantity: round2(summary.totalRecommendedQuantity)
      },
      rows
    });
  });
}
