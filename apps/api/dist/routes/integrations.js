import axios from "axios";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../lib/prisma";
async function ensureDealerLocation(companyId, dealerId) {
    const existing = await prisma.location.findFirst({
        where: { companyId, type: "DEALER", referenceId: dealerId }
    });
    if (existing)
        return existing;
    const dealer = await prisma.dealer.findUnique({ where: { id: dealerId } });
    if (!dealer)
        return null;
    return prisma.location.create({
        data: {
            companyId,
            type: "DEALER",
            referenceId: dealerId,
            name: dealer.name
        }
    });
}
const syncRequestSchema = z
    .object({
    fullSync: z.coerce.boolean().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    maxPages: z.coerce.number().int().min(1).max(5000).optional(),
    perPage: z.coerce.number().int().min(1).max(100).optional()
})
    .optional();
function mapWooStatus(status) {
    if (status === "completed")
        return "COMPLETED";
    if (status === "processing")
        return "PROCESSING";
    if (status === "cancelled" || status === "refunded")
        return "CANCELLED";
    return "NEW";
}
function buildWooUrl(baseUrl) {
    return `${baseUrl.replace(/\/$/, "")}/wp-json/wc/v3/orders`;
}
function parseDateBoundary(value, endOfDay) {
    if (!value)
        return undefined;
    const raw = value.trim();
    if (!raw)
        return undefined;
    const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
    const date = dateOnlyPattern.test(raw)
        ? new Date(`${raw}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`)
        : new Date(raw);
    if (Number.isNaN(date.getTime()))
        return undefined;
    return date.toISOString();
}
function parseWooCreatedAt(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return new Date();
    return date;
}
async function syncWooIntegration(integrationId, options = {}) {
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
        const response = await axios.get(url, {
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
        if (!orders.length)
            break;
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
            const items = [];
            for (const line of order.line_items) {
                const externalProductId = String(line.product_id);
                const externalVariantId = line.variation_id && Number(line.variation_id) > 0 ? String(line.variation_id) : null;
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
                if (!product)
                    continue;
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
                    unit: (variant?.unit ?? product.unit),
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
                const totalPrice = items.reduce((sum, item) => sum.plus(item.total), new Prisma.Decimal(0));
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
        if (orders.length < perPage)
            break;
        if (Number.isFinite(totalPagesHeader) && totalPagesHeader > 0 && page >= totalPagesHeader)
            break;
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
export async function registerIntegrationRoutes(app) {
    app.get("/integrations/dealer-summary", async (request, reply) => {
        const companyId = request.query.companyId;
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
                .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
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
        const companyId = request.query.companyId;
        const dealerId = request.query.dealerId;
        const logs = await prisma.integrationLog.findMany({
            where: {
                ...(companyId ? { companyId } : {}),
                ...(dealerId ? { dealerId } : {})
            },
            orderBy: { createdAt: "desc" }
        });
        reply.send(logs);
    });
    app.post("/integrations/:id/sync", async (request, reply) => {
        try {
            const payload = syncRequestSchema.parse(request.body);
            const result = await syncWooIntegration(request.params.id, payload ?? {});
            reply.send({ ok: true, ...result });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Bilinmeyen sync hatasi";
            const integration = await prisma.dealerIntegration.findUnique({
                where: { id: request.params.id },
                select: { companyId: true, dealerId: true }
            });
            if (integration) {
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
            reply.status(500).send({ message: "Sync sirasinda hata olustu", detail: message });
        }
    });
}
