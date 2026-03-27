import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { writeAuditLog } from "../lib/audit.js";
import { buildRiskBlockMessage, calculateDealerRisk } from "../lib/risk.js";
const orderStatusValues = [
    "DRAFT",
    "NEW",
    "APPROVED",
    "PROCESSING",
    "PREPARING",
    "SHIPPED",
    "DELIVERED",
    "COMPLETED",
    "RETURNED",
    "EXCHANGED",
    "CANCELLED"
];
const itemSchema = z.object({
    productId: z.string().min(1),
    variantId: z.string().optional(),
    quantity: z.coerce.number().positive(),
    unit: z.enum(["PIECE", "KG", "LT"]),
    price: z.coerce.number().nonnegative(),
    note: z.string().max(400).optional()
});
const orderSchema = z.object({
    companyId: z.string().min(1),
    dealerId: z.string().min(1),
    channel: z.enum(["MANUAL", "WOO", "SHOPIFY", "MARKETPLACE", "OTHER"]),
    externalId: z.string().optional(),
    status: z.enum(orderStatusValues).optional(),
    currency: z.string().optional(),
    syncStatus: z.enum(["PENDING", "SYNCED", "ERROR"]).optional(),
    customerName: z.string().max(120).optional(),
    customerPhone: z.string().max(40).optional(),
    customerNote: z.string().max(1000).optional(),
    allowOverLimit: z.boolean().optional().default(false),
    items: z.array(itemSchema).min(1)
});
const orderStatusUpdateSchema = z.object({
    status: z.enum(orderStatusValues),
    note: z.string().max(1000).optional()
});
const ORDER_TRANSITIONS = {
    DRAFT: ["NEW", "APPROVED", "CANCELLED"],
    NEW: ["APPROVED", "PROCESSING", "CANCELLED"],
    APPROVED: ["PROCESSING", "PREPARING", "SHIPPED", "CANCELLED"],
    PROCESSING: ["PREPARING", "SHIPPED", "COMPLETED", "CANCELLED"],
    PREPARING: ["SHIPPED", "CANCELLED"],
    SHIPPED: ["DELIVERED", "COMPLETED", "RETURNED", "EXCHANGED"],
    DELIVERED: ["COMPLETED", "RETURNED", "EXCHANGED"],
    COMPLETED: ["RETURNED", "EXCHANGED"],
    RETURNED: [],
    EXCHANGED: [],
    CANCELLED: []
};
async function getOrCreateDealerLocation(companyId, dealerId) {
    const existing = await prisma.location.findFirst({
        where: {
            companyId,
            type: "DEALER",
            referenceId: dealerId
        }
    });
    if (existing)
        return existing;
    const dealer = await prisma.dealer.findFirst({
        where: {
            id: dealerId,
            companyId
        }
    });
    if (!dealer)
        return null;
    try {
        return await prisma.location.create({
            data: {
                companyId,
                type: "DEALER",
                referenceId: dealerId,
                name: dealer.name
            }
        });
    }
    catch {
        return prisma.location.findFirst({
            where: {
                companyId,
                type: "DEALER",
                referenceId: dealerId
            }
        });
    }
}
async function getOrCreateDealerLocationTx(tx, companyId, dealerId) {
    const existing = await tx.location.findFirst({
        where: {
            companyId,
            type: "DEALER",
            referenceId: dealerId
        }
    });
    if (existing)
        return existing;
    const dealer = await tx.dealer.findFirst({
        where: { id: dealerId, companyId },
        select: { name: true }
    });
    if (!dealer)
        return null;
    return tx.location.create({
        data: {
            companyId,
            type: "DEALER",
            referenceId: dealerId,
            name: dealer.name
        }
    });
}
function calculateEffectiveQuantity(quantity, multiplier) {
    return new Prisma.Decimal(quantity).mul(new Prisma.Decimal(multiplier));
}
function canTransitionOrderStatus(fromStatus, toStatus) {
    if (fromStatus === toStatus)
        return true;
    const allowed = ORDER_TRANSITIONS[fromStatus] ?? [];
    return allowed.includes(toStatus);
}
function isRecoverableOrdersQueryError(error) {
    const code = error?.code;
    const message = error instanceof Error ? error.message : String(error ?? "");
    const normalized = message.toLowerCase();
    if (code === "P2022" || code === "P2010")
        return true;
    if (normalized.includes("does not exist"))
        return true;
    if (normalized.includes("unknown field"))
        return true;
    if (normalized.includes("unknown arg"))
        return true;
    if (normalized.includes("cannot read properties of undefined"))
        return true;
    return false;
}
async function getTableColumns(tableName) {
    try {
        const rows = await prisma.$queryRawUnsafe(`SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = $1`, tableName);
        return new Set(rows.map((row) => row.column_name));
    }
    catch {
        return new Set();
    }
}
export async function registerOrderRoutes(app) {
    app.post("/orders", async (request, reply) => {
        const data = orderSchema.parse(request.body);
        const authRole = request.authUser?.role ?? "OWNER";
        const authUserId = request.authUser?.id ?? null;
        const canBypassRisk = Boolean(data.allowOverLimit && (authRole === "OWNER" || authRole === "ADMIN"));
        const projectedDebtAmount = data.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
        if (data.channel === "MANUAL") {
            const dealer = await prisma.dealer.findFirst({
                where: {
                    id: data.dealerId,
                    companyId: data.companyId
                },
                select: {
                    id: true,
                    creditLimit: true,
                    paymentTerms: true
                }
            });
            if (!dealer) {
                reply.status(400).send({ message: "Bayi bulunamadi" });
                return;
            }
            const ledgerEntries = await prisma.ledgerTransaction.findMany({
                where: { dealerId: dealer.id },
                select: { type: true, amount: true, date: true },
                orderBy: { date: "asc" }
            });
            const risk = calculateDealerRisk(ledgerEntries.map((entry) => ({
                type: entry.type,
                amount: Number(entry.amount ?? 0),
                date: entry.date
            })), {
                creditLimit: Number(dealer.creditLimit ?? 0),
                paymentTerms: Number(dealer.paymentTerms ?? 0)
            }, projectedDebtAmount);
            if (!canBypassRisk && (risk.limitExceeded || risk.overdue)) {
                reply.status(400).send({
                    message: buildRiskBlockMessage(risk),
                    risk
                });
                return;
            }
        }
        const dealerLocation = await getOrCreateDealerLocation(data.companyId, data.dealerId);
        if (!dealerLocation) {
            reply.status(400).send({ message: "Bayi lokasyonu bulunamadi" });
            return;
        }
        const result = await prisma.$transaction(async (tx) => {
            const totals = data.items.map((item) => new Prisma.Decimal(item.quantity).mul(new Prisma.Decimal(item.price)));
            const totalPrice = totals.reduce((sum, value) => sum.plus(value), new Prisma.Decimal(0));
            const nextStatus = data.status ?? "NEW";
            const order = await tx.order.create({
                data: {
                    companyId: data.companyId,
                    dealerId: data.dealerId,
                    channel: data.channel,
                    externalId: data.externalId,
                    status: nextStatus,
                    currency: data.currency ?? "TRY",
                    totalPrice,
                    syncStatus: data.syncStatus ?? "PENDING",
                    customerName: data.customerName,
                    customerPhone: data.customerPhone,
                    customerNote: data.customerNote,
                    statusUpdatedAt: new Date(),
                    items: {
                        create: data.items.map((item) => ({
                            productId: item.productId,
                            variantId: item.variantId,
                            quantity: item.quantity,
                            unit: item.unit,
                            price: item.price,
                            total: new Prisma.Decimal(item.quantity).mul(new Prisma.Decimal(item.price)),
                            note: item.note
                        }))
                    }
                },
                include: {
                    items: {
                        include: {
                            variant: { select: { multiplier: true } }
                        }
                    }
                }
            });
            for (const item of order.items) {
                const effectiveQuantity = calculateEffectiveQuantity(item.quantity, item.variant?.multiplier ?? 1);
                await tx.stockMovement.create({
                    data: {
                        companyId: data.companyId,
                        productId: item.productId,
                        variantId: item.variantId ?? undefined,
                        locationId: dealerLocation.id,
                        type: "SALE",
                        quantity: effectiveQuantity.mul(-1),
                        referenceType: "ORDER",
                        referenceId: order.id
                    }
                });
            }
            await writeAuditLog(tx, {
                companyId: data.companyId,
                userId: authUserId,
                action: "ORDER_CREATED",
                entity: "ORDER",
                entityId: order.id,
                newValue: {
                    status: order.status,
                    dealerId: order.dealerId,
                    channel: order.channel,
                    totalPrice: Number(order.totalPrice),
                    itemCount: order.items.length
                }
            });
            return order;
        });
        reply.send(result);
    });
    app.patch("/orders/:id/status", async (request, reply) => {
        const orderId = request.params.id;
        const data = orderStatusUpdateSchema.parse(request.body);
        const authUserId = request.authUser?.id ?? null;
        const existing = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        variant: { select: { multiplier: true } }
                    }
                }
            }
        });
        if (!existing) {
            reply.status(404).send({ message: "Siparis bulunamadi" });
            return;
        }
        if (!canTransitionOrderStatus(existing.status, data.status)) {
            reply.status(400).send({
                message: `Durum gecisi desteklenmiyor: ${existing.status} -> ${data.status}`
            });
            return;
        }
        const updated = await prisma.$transaction(async (tx) => {
            const next = await tx.order.update({
                where: { id: existing.id },
                data: {
                    status: data.status,
                    statusUpdatedAt: new Date()
                },
                include: { items: true }
            });
            const requiresStockReversal = data.status === "CANCELLED" || data.status === "RETURNED";
            if (requiresStockReversal) {
                const reversalRef = `${existing.id}:${data.status}`;
                const exists = await tx.stockMovement.findFirst({
                    where: {
                        companyId: existing.companyId,
                        referenceType: "ORDER_STATUS",
                        referenceId: reversalRef
                    },
                    select: { id: true }
                });
                if (!exists) {
                    const dealerLocation = await getOrCreateDealerLocationTx(tx, existing.companyId, existing.dealerId);
                    if (dealerLocation) {
                        for (const item of existing.items) {
                            const effectiveQuantity = calculateEffectiveQuantity(item.quantity, item.variant?.multiplier ?? 1);
                            await tx.stockMovement.create({
                                data: {
                                    companyId: existing.companyId,
                                    productId: item.productId,
                                    variantId: item.variantId ?? undefined,
                                    locationId: dealerLocation.id,
                                    type: "RETURN",
                                    quantity: effectiveQuantity,
                                    referenceType: "ORDER_STATUS",
                                    referenceId: reversalRef
                                }
                            });
                        }
                    }
                }
            }
            await writeAuditLog(tx, {
                companyId: existing.companyId,
                userId: authUserId,
                action: "ORDER_STATUS_CHANGED",
                entity: "ORDER",
                entityId: existing.id,
                oldValue: {
                    status: existing.status
                },
                newValue: {
                    status: data.status,
                    note: data.note ?? null
                }
            });
            return next;
        });
        reply.send(updated);
    });
    app.get("/orders", async (request, reply) => {
        const companyId = request.query.companyId;
        const dealerId = request.query.dealerId;
        try {
            const orders = await prisma.order.findMany({
                where: {
                    ...(companyId ? { companyId } : {}),
                    ...(dealerId ? { dealerId } : {})
                },
                include: { items: true },
                orderBy: { createdAt: "desc" }
            });
            reply.send(orders);
            return;
        }
        catch (error) {
            if (!isRecoverableOrdersQueryError(error))
                throw error;
            request.log.warn({ error }, "orders list query failed, SQL compatibility fallback is used");
        }
        const orderColumns = await getTableColumns("Order");
        const itemColumns = await getTableColumns("OrderItem");
        if (!orderColumns.has("id")) {
            reply.send([]);
            return;
        }
        if (companyId && !orderColumns.has("companyId")) {
            reply.send([]);
            return;
        }
        if (dealerId && !orderColumns.has("dealerId")) {
            reply.send([]);
            return;
        }
        const whereParts = [];
        const params = [];
        if (companyId && orderColumns.has("companyId")) {
            params.push(companyId);
            whereParts.push(`o."companyId" = $${params.length}`);
        }
        if (dealerId && orderColumns.has("dealerId")) {
            params.push(dealerId);
            whereParts.push(`o."dealerId" = $${params.length}`);
        }
        const channelExpr = orderColumns.has("channel")
            ? `o."channel"::text`
            : orderColumns.has("source")
                ? `o."source"::text`
                : `'MANUAL'`;
        const totalPriceExpr = orderColumns.has("totalPrice")
            ? `o."totalPrice"`
            : orderColumns.has("totalAmount")
                ? `o."totalAmount"`
                : "0";
        const orderRows = await prisma.$queryRawUnsafe(`SELECT
         o."id" AS "id",
         ${orderColumns.has("companyId") ? `o."companyId"` : "NULL"} AS "companyId",
         ${orderColumns.has("dealerId") ? `o."dealerId"` : "NULL"} AS "dealerId",
         ${channelExpr} AS "channel",
         ${orderColumns.has("status") ? `o."status"::text` : "'NEW'"} AS "status",
         ${orderColumns.has("currency") ? `o."currency"` : "'TRY'"} AS "currency",
         ${totalPriceExpr} AS "totalPrice",
         ${orderColumns.has("syncStatus") ? `o."syncStatus"::text` : "'PENDING'"} AS "syncStatus",
         ${orderColumns.has("customerName") ? `o."customerName"` : "NULL"} AS "customerName",
         ${orderColumns.has("customerPhone") ? `o."customerPhone"` : "NULL"} AS "customerPhone",
         ${orderColumns.has("customerNote") ? `o."customerNote"` : "NULL"} AS "customerNote",
         ${orderColumns.has("createdAt") ? `o."createdAt"` : "CURRENT_TIMESTAMP"} AS "createdAt"
       FROM "Order" o
       ${whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : ""}
       ORDER BY ${orderColumns.has("createdAt") ? `o."createdAt"` : `o."id"`} DESC`, ...params);
        if (!orderRows.length || !itemColumns.has("orderId")) {
            reply.send(orderRows.map((row) => ({ ...row, items: [] })));
            return;
        }
        const orderIds = orderRows.map((row) => row.id);
        const itemPlaceholders = orderIds.map((_, index) => `$${index + 1}`).join(", ");
        const quantityExpr = itemColumns.has("quantity") ? `oi."quantity"` : "0";
        const priceExpr = itemColumns.has("price")
            ? `oi."price"`
            : itemColumns.has("unitPrice")
                ? `oi."unitPrice"`
                : "0";
        const totalExpr = itemColumns.has("total") ? `oi."total"` : `${quantityExpr} * ${priceExpr}`;
        const itemRows = await prisma.$queryRawUnsafe(`SELECT
         ${itemColumns.has("id") ? `oi."id"` : `md5(oi."orderId" || ':' || oi."productId")`} AS "id",
         oi."orderId" AS "orderId",
         ${itemColumns.has("productId") ? `oi."productId"` : "''"} AS "productId",
         ${itemColumns.has("variantId") ? `oi."variantId"` : "NULL"} AS "variantId",
         ${quantityExpr} AS "quantity",
         ${itemColumns.has("unit") ? `oi."unit"::text` : "'PIECE'"} AS "unit",
         ${priceExpr} AS "price",
         ${totalExpr} AS "total",
         ${itemColumns.has("note") ? `oi."note"` : "NULL"} AS "note"
       FROM "OrderItem" oi
       WHERE oi."orderId" IN (${itemPlaceholders})`, ...orderIds);
        const itemsByOrderId = new Map();
        for (const item of itemRows) {
            const bucket = itemsByOrderId.get(item.orderId) ?? [];
            bucket.push({
                id: item.id,
                orderId: item.orderId,
                productId: item.productId,
                variantId: item.variantId,
                quantity: Number(item.quantity ?? 0),
                unit: item.unit ?? "PIECE",
                price: Number(item.price ?? 0),
                total: Number(item.total ?? 0),
                note: item.note
            });
            itemsByOrderId.set(item.orderId, bucket);
        }
        const fallbackOrders = orderRows.map((row) => ({
            id: row.id,
            companyId: row.companyId,
            dealerId: row.dealerId,
            channel: row.channel ?? "MANUAL",
            status: row.status ?? "NEW",
            currency: row.currency ?? "TRY",
            totalPrice: Number(row.totalPrice ?? 0),
            syncStatus: row.syncStatus ?? "PENDING",
            customerName: row.customerName,
            customerPhone: row.customerPhone,
            customerNote: row.customerNote,
            createdAt: row.createdAt ?? new Date().toISOString(),
            items: itemsByOrderId.get(row.id) ?? []
        }));
        reply.send(fallbackOrders);
    });
}
