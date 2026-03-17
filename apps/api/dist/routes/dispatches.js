import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../lib/prisma";
import { buildRiskBlockMessage, calculateDealerRisk } from "../lib/risk";
const itemSchema = z.object({
    productId: z.string().min(1),
    variantId: z.string().optional(),
    quantity: z.coerce.number().positive(),
    price: z.coerce.number().nonnegative()
});
const dispatchSchema = z.object({
    companyId: z.string().min(1),
    dispatchNumber: z.string().min(1),
    warehouseId: z.string().min(1),
    dealerId: z.string().min(1),
    status: z.enum(["DRAFT", "APPROVED", "CANCELLED"]).optional(),
    date: z.coerce.date().optional(),
    allowOverLimit: z.boolean().optional().default(false),
    items: z.array(itemSchema).min(1)
});
const dispatchUpdateSchema = z.object({
    dispatchNumber: z.string().min(1).optional(),
    warehouseId: z.string().min(1).optional(),
    dealerId: z.string().min(1).optional(),
    status: z.enum(["DRAFT", "APPROVED", "CANCELLED"]).optional(),
    date: z.coerce.date().optional(),
    allowOverLimit: z.boolean().optional().default(false),
    items: z.array(itemSchema).min(1).optional()
});
const approveSchema = z
    .object({
    allowOverLimit: z.boolean().optional().default(false)
})
    .optional();
async function ensureLocation(type, companyId, referenceId) {
    const existing = await prisma.location.findFirst({
        where: { companyId, type, referenceId }
    });
    if (existing)
        return existing;
    if (type === "WAREHOUSE") {
        const warehouse = await prisma.warehouse.findUnique({ where: { id: referenceId } });
        if (!warehouse)
            return null;
        return prisma.location.create({
            data: {
                companyId,
                type,
                referenceId,
                name: warehouse.name
            }
        });
    }
    const dealer = await prisma.dealer.findUnique({ where: { id: referenceId } });
    if (!dealer)
        return null;
    return prisma.location.create({
        data: {
            companyId,
            type,
            referenceId,
            name: dealer.name
        }
    });
}
async function applyDispatchEffects(tx, dispatchId, companyId, warehouseLocationId, dealerLocationId, items) {
    for (const item of items) {
        const variant = item.variantId
            ? await tx.productVariant.findUnique({ where: { id: item.variantId } })
            : null;
        const multiplier = variant ? new Prisma.Decimal(variant.multiplier) : new Prisma.Decimal(1);
        const effectiveQuantity = new Prisma.Decimal(item.quantity).mul(multiplier);
        await tx.stockMovement.create({
            data: {
                companyId,
                productId: item.productId,
                variantId: item.variantId ?? undefined,
                locationId: warehouseLocationId,
                type: "DISPATCH",
                quantity: effectiveQuantity.mul(-1),
                referenceType: "DISPATCH",
                referenceId: dispatchId
            }
        });
        await tx.stockMovement.create({
            data: {
                companyId,
                productId: item.productId,
                variantId: item.variantId ?? undefined,
                locationId: dealerLocationId,
                type: "DISPATCH",
                quantity: effectiveQuantity,
                referenceType: "DISPATCH",
                referenceId: dispatchId
            }
        });
    }
}
function calculateItemsTotal(items) {
    return items.reduce((sum, item) => {
        const quantity = Number(item.quantity ?? 0);
        const price = Number(item.price ?? 0);
        if (!Number.isFinite(quantity) || !Number.isFinite(price))
            return sum;
        return sum + quantity * price;
    }, 0);
}
async function getDealerRiskSnapshot(dealerId, additionalDebtAmount) {
    const dealer = await prisma.dealer.findUnique({
        where: { id: dealerId },
        select: {
            id: true,
            creditLimit: true,
            paymentTerms: true
        }
    });
    if (!dealer)
        return null;
    const entries = await prisma.ledgerTransaction.findMany({
        where: { dealerId },
        select: {
            type: true,
            amount: true,
            date: true
        },
        orderBy: { date: "asc" }
    });
    return calculateDealerRisk(entries.map((entry) => ({
        type: entry.type,
        amount: Number(entry.amount ?? 0),
        date: entry.date
    })), {
        creditLimit: Number(dealer.creditLimit ?? 0),
        paymentTerms: Number(dealer.paymentTerms ?? 0)
    }, additionalDebtAmount);
}
export async function registerDispatchRoutes(app) {
    app.post("/dispatches", async (request, reply) => {
        const data = dispatchSchema.parse(request.body);
        const authRole = request.authUser?.role ?? "OWNER";
        const canBypassRisk = Boolean(data.allowOverLimit && (authRole === "OWNER" || authRole === "ADMIN"));
        const warehouseLocation = await ensureLocation("WAREHOUSE", data.companyId, data.warehouseId);
        const dealerLocation = await ensureLocation("DEALER", data.companyId, data.dealerId);
        if (!warehouseLocation || !dealerLocation) {
            reply.status(400).send({ message: "Location not found" });
            return;
        }
        if (data.status === "APPROVED") {
            const additionalDebtAmount = calculateItemsTotal(data.items);
            if (additionalDebtAmount > 0) {
                const risk = await getDealerRiskSnapshot(data.dealerId, additionalDebtAmount);
                if (!risk) {
                    reply.status(400).send({ message: "Bayi bulunamadi" });
                    return;
                }
                if (!canBypassRisk && (risk.limitExceeded || risk.overdue)) {
                    reply.status(400).send({
                        message: buildRiskBlockMessage(risk),
                        risk
                    });
                    return;
                }
            }
        }
        const dispatch = await prisma.$transaction(async (tx) => {
            const created = await tx.dispatch.create({
                data: {
                    companyId: data.companyId,
                    dispatchNumber: data.dispatchNumber,
                    warehouseId: data.warehouseId,
                    dealerId: data.dealerId,
                    status: data.status ?? "DRAFT",
                    date: data.date ?? new Date(),
                    items: {
                        create: data.items.map((item) => ({
                            productId: item.productId,
                            variantId: item.variantId,
                            quantity: item.quantity,
                            price: item.price
                        }))
                    }
                },
                include: { items: true }
            });
            if (created.status === "APPROVED") {
                await applyDispatchEffects(tx, created.id, data.companyId, warehouseLocation.id, dealerLocation.id, created.items.map((item) => ({
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: Number(item.quantity)
                })));
                const totalAmount = created.items.reduce((sum, item) => sum.plus(item.quantity.mul(item.price)), new Prisma.Decimal(0));
                await tx.ledgerTransaction.create({
                    data: {
                        companyId: data.companyId,
                        dealerId: data.dealerId,
                        type: "DISPATCH",
                        amount: totalAmount,
                        referenceType: "DISPATCH",
                        referenceId: created.id,
                        date: data.date ?? new Date()
                    }
                });
            }
            return created;
        });
        reply.send(dispatch);
    });
    app.patch("/dispatches/:id", async (request, reply) => {
        const data = dispatchUpdateSchema.parse(request.body);
        const dispatchId = request.params.id;
        const authRole = request.authUser?.role ?? "OWNER";
        const canBypassRisk = Boolean(data.allowOverLimit && (authRole === "OWNER" || authRole === "ADMIN"));
        const existing = await prisma.dispatch.findUnique({
            where: { id: dispatchId },
            include: { items: true }
        });
        if (!existing) {
            reply.status(404).send({ message: "Dispatch not found" });
            return;
        }
        const nextWarehouseId = data.warehouseId ?? existing.warehouseId;
        const nextDealerId = data.dealerId ?? existing.dealerId;
        const nextStatus = data.status ?? existing.status;
        const nextDate = data.date ?? existing.date;
        const nextDispatchNumber = data.dispatchNumber ?? existing.dispatchNumber;
        const nextItems = (data.items ??
            existing.items.map((item) => ({
                productId: item.productId,
                variantId: item.variantId ?? undefined,
                quantity: Number(item.quantity),
                price: Number(item.price)
            })));
        const warehouseLocation = await ensureLocation("WAREHOUSE", existing.companyId, nextWarehouseId);
        const dealerLocation = await ensureLocation("DEALER", existing.companyId, nextDealerId);
        if (!warehouseLocation || !dealerLocation) {
            reply.status(400).send({ message: "Location not found" });
            return;
        }
        if (nextStatus === "APPROVED") {
            const nextTotal = calculateItemsTotal(nextItems);
            const existingTotal = calculateItemsTotal(existing.items);
            const sameDealer = nextDealerId === existing.dealerId;
            const additionalDebtAmount = existing.status === "APPROVED"
                ? sameDealer
                    ? Math.max(0, nextTotal - existingTotal)
                    : Math.max(0, nextTotal)
                : Math.max(0, nextTotal);
            if (additionalDebtAmount > 0) {
                const risk = await getDealerRiskSnapshot(nextDealerId, additionalDebtAmount);
                if (!risk) {
                    reply.status(400).send({ message: "Bayi bulunamadi" });
                    return;
                }
                if (!canBypassRisk && (risk.limitExceeded || risk.overdue)) {
                    reply.status(400).send({
                        message: buildRiskBlockMessage(risk),
                        risk
                    });
                    return;
                }
            }
        }
        const updated = await prisma.$transaction(async (tx) => {
            if (existing.status === "APPROVED") {
                await tx.stockMovement.deleteMany({
                    where: {
                        referenceType: "DISPATCH",
                        referenceId: existing.id
                    }
                });
                await tx.ledgerTransaction.deleteMany({
                    where: {
                        referenceType: "DISPATCH",
                        referenceId: existing.id
                    }
                });
            }
            await tx.dispatch.update({
                where: { id: existing.id },
                data: {
                    dispatchNumber: nextDispatchNumber,
                    warehouseId: nextWarehouseId,
                    dealerId: nextDealerId,
                    status: nextStatus,
                    date: nextDate
                }
            });
            if (data.items) {
                await tx.dispatchItem.deleteMany({
                    where: { dispatchId: existing.id }
                });
                await tx.dispatchItem.createMany({
                    data: nextItems.map((item) => ({
                        dispatchId: existing.id,
                        productId: item.productId,
                        variantId: item.variantId ?? null,
                        quantity: item.quantity,
                        price: item.price
                    }))
                });
            }
            if (nextStatus === "APPROVED") {
                await applyDispatchEffects(tx, existing.id, existing.companyId, warehouseLocation.id, dealerLocation.id, nextItems.map((item) => ({
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity
                })));
                const totalAmount = nextItems.reduce((sum, item) => sum.plus(new Prisma.Decimal(item.quantity).mul(new Prisma.Decimal(item.price))), new Prisma.Decimal(0));
                await tx.ledgerTransaction.create({
                    data: {
                        companyId: existing.companyId,
                        dealerId: nextDealerId,
                        type: "DISPATCH",
                        amount: totalAmount,
                        referenceType: "DISPATCH",
                        referenceId: existing.id,
                        date: nextDate
                    }
                });
            }
            return tx.dispatch.findUnique({
                where: { id: existing.id },
                include: { items: true }
            });
        });
        reply.send(updated);
    });
    app.post("/dispatches/:id/approve", async (request, reply) => {
        const payload = approveSchema.parse(request.body);
        const allowOverLimit = Boolean(payload?.allowOverLimit);
        const authRole = request.authUser?.role ?? "OWNER";
        const canBypassRisk = Boolean(allowOverLimit && (authRole === "OWNER" || authRole === "ADMIN"));
        const dispatch = await prisma.dispatch.findUnique({
            where: { id: request.params.id },
            include: { items: true }
        });
        if (!dispatch) {
            reply.status(404).send({ message: "Dispatch not found" });
            return;
        }
        if (dispatch.status === "APPROVED") {
            reply.send(dispatch);
            return;
        }
        if (dispatch.status === "CANCELLED") {
            reply.status(400).send({ message: "Iptal edilen sevkiyat onaylanamaz" });
            return;
        }
        const warehouseLocation = await ensureLocation("WAREHOUSE", dispatch.companyId, dispatch.warehouseId);
        const dealerLocation = await ensureLocation("DEALER", dispatch.companyId, dispatch.dealerId);
        if (!warehouseLocation || !dealerLocation) {
            reply.status(400).send({ message: "Location not found" });
            return;
        }
        const additionalDebtAmount = calculateItemsTotal(dispatch.items);
        if (additionalDebtAmount > 0) {
            const risk = await getDealerRiskSnapshot(dispatch.dealerId, additionalDebtAmount);
            if (!risk) {
                reply.status(400).send({ message: "Bayi bulunamadi" });
                return;
            }
            if (!canBypassRisk && (risk.limitExceeded || risk.overdue)) {
                reply.status(400).send({
                    message: buildRiskBlockMessage(risk),
                    risk
                });
                return;
            }
        }
        const updated = await prisma.$transaction(async (tx) => {
            const updatedDispatch = await tx.dispatch.update({
                where: { id: dispatch.id },
                data: { status: "APPROVED" }
            });
            await applyDispatchEffects(tx, dispatch.id, dispatch.companyId, warehouseLocation.id, dealerLocation.id, dispatch.items.map((item) => ({
                productId: item.productId,
                variantId: item.variantId,
                quantity: Number(item.quantity)
            })));
            const totalAmount = dispatch.items.reduce((sum, item) => sum.plus(item.quantity.mul(item.price)), new Prisma.Decimal(0));
            await tx.ledgerTransaction.create({
                data: {
                    companyId: dispatch.companyId,
                    dealerId: dispatch.dealerId,
                    type: "DISPATCH",
                    amount: totalAmount,
                    referenceType: "DISPATCH",
                    referenceId: dispatch.id,
                    date: dispatch.date
                }
            });
            return updatedDispatch;
        });
        reply.send(updated);
    });
    app.get("/dispatches", async (request, reply) => {
        const companyId = request.query.companyId;
        const dealerId = request.query.dealerId;
        const dispatches = await prisma.dispatch.findMany({
            where: {
                ...(companyId ? { companyId } : {}),
                ...(dealerId ? { dealerId } : {})
            },
            include: { items: true },
            orderBy: { createdAt: "desc" }
        });
        reply.send(dispatches);
    });
}
