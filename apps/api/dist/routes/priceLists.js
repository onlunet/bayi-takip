import { z } from "zod";
import prisma from "../lib/prisma";
const priceListSchema = z.object({
    companyId: z.string().min(1),
    name: z.string().min(1),
    currency: z.string().optional()
});
const priceListUpdateSchema = z.object({
    name: z.string().min(1).optional(),
    currency: z.string().min(1).optional()
});
const priceItemSchema = z.object({
    productId: z.string().min(1),
    variantId: z.string().optional(),
    price: z.coerce.number().nonnegative()
});
const assignSchema = z.object({
    priceListId: z.string().min(1)
});
const importProductsSchema = z.object({
    overwriteExisting: z.boolean().optional().default(false)
});
export async function registerPriceListRoutes(app) {
    app.post("/price-lists", async (request, reply) => {
        const data = priceListSchema.parse(request.body);
        const priceList = await prisma.priceList.create({
            data: {
                companyId: data.companyId,
                name: data.name,
                currency: data.currency ?? "TRY"
            }
        });
        reply.send(priceList);
    });
    app.get("/price-lists", async (request, reply) => {
        const companyId = request.query.companyId;
        const lists = await prisma.priceList.findMany({
            where: companyId ? { companyId } : undefined,
            orderBy: { createdAt: "desc" }
        });
        reply.send(lists);
    });
    app.patch("/price-lists/:id", async (request, reply) => {
        const data = priceListUpdateSchema.parse(request.body);
        const updated = await prisma.priceList.update({
            where: { id: request.params.id },
            data
        });
        reply.send(updated);
    });
    app.delete("/price-lists/:id", async (request, reply) => {
        const priceListId = request.params.id;
        await prisma.$transaction(async (tx) => {
            await tx.dealerPriceList.deleteMany({
                where: { priceListId }
            });
            await tx.priceListItem.deleteMany({
                where: { priceListId }
            });
            await tx.priceList.delete({
                where: { id: priceListId }
            });
        });
        reply.send({ success: true });
    });
    app.post("/price-lists/:id/items", async (request, reply) => {
        const data = priceItemSchema.parse(request.body);
        const variantId = data.variantId?.trim() ? data.variantId.trim() : null;
        let item;
        if (variantId) {
            item = await prisma.priceListItem.upsert({
                where: {
                    priceListId_productId_variantId: {
                        priceListId: request.params.id,
                        productId: data.productId,
                        variantId
                    }
                },
                update: { price: data.price },
                create: {
                    priceListId: request.params.id,
                    productId: data.productId,
                    variantId,
                    price: data.price
                }
            });
        }
        else {
            const existing = await prisma.priceListItem.findFirst({
                where: {
                    priceListId: request.params.id,
                    productId: data.productId,
                    variantId: null
                }
            });
            if (existing) {
                item = await prisma.priceListItem.update({
                    where: { id: existing.id },
                    data: { price: data.price }
                });
            }
            else {
                item = await prisma.priceListItem.create({
                    data: {
                        priceListId: request.params.id,
                        productId: data.productId,
                        variantId: null,
                        price: data.price
                    }
                });
            }
        }
        reply.send(item);
    });
    app.get("/price-lists/:id/items", async (request, reply) => {
        const items = await prisma.priceListItem.findMany({
            where: { priceListId: request.params.id },
            include: { product: true, variant: true },
            orderBy: { productId: "asc" }
        });
        reply.send(items);
    });
    app.post("/price-lists/:id/import-products", async (request, reply) => {
        const payload = importProductsSchema.parse(request.body ?? {});
        const priceListId = request.params.id;
        const priceList = await prisma.priceList.findUnique({
            where: { id: priceListId }
        });
        if (!priceList) {
            reply.status(404).send({ message: "Fiyat listesi bulunamadi" });
            return;
        }
        const products = await prisma.product.findMany({
            where: {
                companyId: priceList.companyId,
                active: true
            },
            select: {
                id: true,
                basePrice: true
            }
        });
        if (!products.length) {
            reply.send({ created: 0, updated: 0, skipped: 0, total: 0 });
            return;
        }
        const existingItems = await prisma.priceListItem.findMany({
            where: {
                priceListId,
                variantId: null
            },
            select: {
                id: true,
                productId: true
            }
        });
        const existingSet = new Set(existingItems.map((item) => item.productId));
        let created = 0;
        let updated = 0;
        let skipped = 0;
        await prisma.$transaction(async (tx) => {
            for (const product of products) {
                const exists = existingSet.has(product.id);
                if (!exists) {
                    await tx.priceListItem.create({
                        data: {
                            priceListId,
                            productId: product.id,
                            variantId: null,
                            price: product.basePrice
                        }
                    });
                    created += 1;
                    continue;
                }
                if (payload.overwriteExisting) {
                    await tx.priceListItem.updateMany({
                        where: {
                            priceListId,
                            productId: product.id,
                            variantId: null
                        },
                        data: {
                            price: product.basePrice
                        }
                    });
                    updated += 1;
                }
                else {
                    skipped += 1;
                }
            }
        });
        reply.send({
            created,
            updated,
            skipped,
            total: products.length
        });
    });
    app.post("/dealers/:id/price-lists", async (request, reply) => {
        const data = assignSchema.parse(request.body);
        const assigned = await prisma.$transaction(async (tx) => {
            await tx.dealerPriceList.deleteMany({
                where: { dealerId: request.params.id }
            });
            return tx.dealerPriceList.create({
                data: {
                    dealerId: request.params.id,
                    priceListId: data.priceListId
                }
            });
        });
        reply.send(assigned);
    });
    app.get("/dealers/:id/price-lists", async (request, reply) => {
        const assigned = await prisma.dealerPriceList.findMany({
            where: { dealerId: request.params.id },
            include: { priceList: true },
            orderBy: { createdAt: "desc" }
        });
        reply.send(assigned);
    });
    app.delete("/dealers/:id/price-lists/:priceListId", async (request, reply) => {
        const removed = await prisma.dealerPriceList.delete({
            where: {
                dealerId_priceListId: {
                    dealerId: request.params.id,
                    priceListId: request.params.priceListId
                }
            }
        });
        reply.send(removed);
    });
}
