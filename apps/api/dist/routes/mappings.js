import { z } from "zod";
import prisma from "../lib/prisma.js";
import { normalizeMatchText, rankMappingSuggestions } from "../lib/mappingSuggestions.js";
const mappingSchema = z.object({
    companyId: z.string().min(1),
    dealerId: z.string().min(1),
    platform: z.enum(["WOO", "SHOPIFY", "MARKETPLACE", "OTHER"]),
    localProductId: z.string().min(1),
    localVariantId: z.string().optional(),
    externalProductId: z.string().min(1),
    externalVariantId: z.string().optional()
});
const importSchema = z.object({
    companyId: z.string().min(1),
    dealerId: z.string().min(1),
    platform: z.enum(["WOO", "SHOPIFY", "MARKETPLACE", "OTHER"]),
    rows: z.array(z.object({
        externalProductId: z.string().min(1),
        externalVariantId: z.string().optional(),
        localProductId: z.string().min(1),
        localVariantId: z.string().optional()
    }))
});
const suggestionQuerySchema = z.object({
    companyId: z.string().min(1),
    dealerId: z.string().min(1),
    platform: z.enum(["WOO", "SHOPIFY", "MARKETPLACE", "OTHER"]).optional().default("WOO"),
    limit: z.coerce.number().int().min(1).max(500).optional().default(200)
});
export async function registerMappingRoutes(app) {
    app.post("/mappings", async (request, reply) => {
        const data = mappingSchema.parse(request.body);
        const externalVariantId = data.externalVariantId?.trim() ? data.externalVariantId.trim() : null;
        let mapping;
        if (externalVariantId) {
            mapping = await prisma.productMapping.upsert({
                where: {
                    dealerId_platform_externalProductId_externalVariantId: {
                        dealerId: data.dealerId,
                        platform: data.platform,
                        externalProductId: data.externalProductId,
                        externalVariantId
                    }
                },
                update: {
                    companyId: data.companyId,
                    localProductId: data.localProductId,
                    localVariantId: data.localVariantId
                },
                create: {
                    companyId: data.companyId,
                    dealerId: data.dealerId,
                    platform: data.platform,
                    localProductId: data.localProductId,
                    localVariantId: data.localVariantId,
                    externalProductId: data.externalProductId,
                    externalVariantId
                }
            });
        }
        else {
            const existing = await prisma.productMapping.findFirst({
                where: {
                    dealerId: data.dealerId,
                    platform: data.platform,
                    externalProductId: data.externalProductId,
                    externalVariantId: null
                }
            });
            if (existing) {
                mapping = await prisma.productMapping.update({
                    where: { id: existing.id },
                    data: {
                        companyId: data.companyId,
                        localProductId: data.localProductId,
                        localVariantId: data.localVariantId
                    }
                });
            }
            else {
                mapping = await prisma.productMapping.create({
                    data: {
                        companyId: data.companyId,
                        dealerId: data.dealerId,
                        platform: data.platform,
                        localProductId: data.localProductId,
                        localVariantId: data.localVariantId,
                        externalProductId: data.externalProductId,
                        externalVariantId: null
                    }
                });
            }
        }
        reply.send(mapping);
    });
    app.post("/mappings/import", async (request, reply) => {
        const data = importSchema.parse(request.body);
        const errors = [];
        let success = 0;
        for (let i = 0; i < data.rows.length; i++) {
            const row = data.rows[i];
            try {
                const externalVariantId = row.externalVariantId?.trim() ? row.externalVariantId.trim() : null;
                if (externalVariantId) {
                    await prisma.productMapping.upsert({
                        where: {
                            dealerId_platform_externalProductId_externalVariantId: {
                                dealerId: data.dealerId,
                                platform: data.platform,
                                externalProductId: row.externalProductId,
                                externalVariantId
                            }
                        },
                        update: {
                            companyId: data.companyId,
                            localProductId: row.localProductId,
                            localVariantId: row.localVariantId
                        },
                        create: {
                            companyId: data.companyId,
                            dealerId: data.dealerId,
                            platform: data.platform,
                            localProductId: row.localProductId,
                            localVariantId: row.localVariantId,
                            externalProductId: row.externalProductId,
                            externalVariantId
                        }
                    });
                }
                else {
                    const existing = await prisma.productMapping.findFirst({
                        where: {
                            dealerId: data.dealerId,
                            platform: data.platform,
                            externalProductId: row.externalProductId,
                            externalVariantId: null
                        }
                    });
                    if (existing) {
                        await prisma.productMapping.update({
                            where: { id: existing.id },
                            data: {
                                companyId: data.companyId,
                                localProductId: row.localProductId,
                                localVariantId: row.localVariantId
                            }
                        });
                    }
                    else {
                        await prisma.productMapping.create({
                            data: {
                                companyId: data.companyId,
                                dealerId: data.dealerId,
                                platform: data.platform,
                                localProductId: row.localProductId,
                                localVariantId: row.localVariantId,
                                externalProductId: row.externalProductId,
                                externalVariantId: null
                            }
                        });
                    }
                }
                success += 1;
            }
            catch (error) {
                const message = error instanceof Error ? error.message : "Unknown error";
                errors.push({
                    row: i + 1,
                    reason: message,
                    externalProductId: row.externalProductId,
                    externalVariantId: row.externalVariantId
                });
            }
        }
        reply.send({ success, errors });
    });
    app.get("/mappings/suggestions", async (request, reply) => {
        const query = suggestionQuerySchema.parse(request.query);
        const logs = await prisma.integrationLog.findMany({
            where: {
                companyId: query.companyId,
                dealerId: query.dealerId,
                platform: query.platform,
                status: "UNMAPPED"
            },
            select: {
                externalId: true,
                payload: true,
                createdAt: true
            },
            orderBy: { createdAt: "desc" },
            take: 5000
        });
        const uniqueLineMap = new Map();
        for (const log of logs) {
            const payload = (log.payload ?? {});
            const externalProductId = payload.product_id ? String(payload.product_id) : "";
            if (!externalProductId)
                continue;
            const externalVariantId = payload.variation_id && Number(payload.variation_id) > 0 ? String(payload.variation_id) : "";
            const productName = payload.parent_name?.trim() ||
                payload.name?.trim() ||
                `Harici Urun ${externalProductId}`;
            const quantity = Number(payload.quantity ?? 0);
            const lineIdentity = String(payload.id ??
                `${externalProductId}:${externalVariantId}:${productName}`);
            const lineKey = `${log.externalId ?? "-"}:${lineIdentity}`;
            if (!uniqueLineMap.has(lineKey)) {
                uniqueLineMap.set(lineKey, {
                    externalProductId,
                    externalVariantId,
                    name: productName,
                    quantity: Number.isFinite(quantity) ? quantity : 0
                });
            }
        }
        const groupedExternal = new Map();
        for (const line of uniqueLineMap.values()) {
            const groupKey = `${line.externalProductId}:${line.externalVariantId}`;
            const current = groupedExternal.get(groupKey) ?? {
                externalProductId: line.externalProductId,
                externalVariantId: line.externalVariantId,
                name: line.name,
                totalQuantity: 0,
                occurrenceCount: 0
            };
            current.totalQuantity += line.quantity;
            current.occurrenceCount += 1;
            if (!current.name && line.name) {
                current.name = line.name;
            }
            groupedExternal.set(groupKey, current);
        }
        const products = await prisma.product.findMany({
            where: {
                companyId: query.companyId,
                active: true
            },
            select: {
                id: true,
                name: true,
                variants: {
                    where: { active: true },
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        const candidates = [];
        for (const product of products) {
            candidates.push({
                localProductId: product.id,
                localVariantId: null,
                label: product.name,
                sourceText: product.name
            });
            for (const variant of product.variants) {
                candidates.push({
                    localProductId: product.id,
                    localVariantId: variant.id,
                    label: `${product.name} / ${variant.name}`,
                    sourceText: `${product.name} ${variant.name}`
                });
            }
        }
        const rows = Array.from(groupedExternal.values())
            .map((row) => {
            const sourceName = normalizeMatchText(row.name);
            const suggestions = rankMappingSuggestions(sourceName, candidates, 3, 0.3);
            return {
                externalProductId: row.externalProductId,
                externalVariantId: row.externalVariantId || null,
                name: row.name,
                totalQuantity: Number(row.totalQuantity.toFixed(2)),
                occurrenceCount: row.occurrenceCount,
                suggestions: suggestions.map((item) => ({
                    localProductId: item.localProductId,
                    localVariantId: item.localVariantId ?? null,
                    label: item.label,
                    score: Number(item.score.toFixed(4))
                }))
            };
        })
            .filter((row) => row.suggestions.length > 0)
            .sort((a, b) => b.totalQuantity - a.totalQuantity)
            .slice(0, query.limit);
        reply.send(rows);
    });
    app.get("/mappings", async (request, reply) => {
        const companyId = request.query.companyId;
        const dealerId = request.query.dealerId;
        const platform = request.query.platform;
        const mappings = await prisma.productMapping.findMany({
            where: {
                ...(companyId ? { companyId } : {}),
                ...(dealerId ? { dealerId } : {}),
                ...(platform ? { platform } : {})
            },
            orderBy: { createdAt: "desc" }
        });
        reply.send(mappings);
    });
    app.delete("/mappings/:id", async (request, reply) => {
        const mapping = await prisma.productMapping.delete({
            where: { id: request.params.id }
        });
        reply.send(mapping);
    });
}
