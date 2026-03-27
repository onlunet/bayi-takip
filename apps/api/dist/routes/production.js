import { z } from "zod";
import prisma from "../lib/prisma.js";
const batchSchema = z.object({
    companyId: z.string().min(1),
    productId: z.string().min(1),
    warehouseId: z.string().optional(),
    batchNumber: z.string().min(1),
    quantity: z.coerce.number().positive(),
    productionDate: z.coerce.date(),
    expiryDate: z.coerce.date().optional()
});
export async function registerProductionRoutes(app) {
    app.post("/production/batches", async (request, reply) => {
        const data = batchSchema.parse(request.body);
        if (data.warehouseId) {
            const warehouse = await prisma.warehouse.findFirst({
                where: { id: data.warehouseId, companyId: data.companyId }
            });
            if (!warehouse) {
                reply.status(400).send({ message: "Secilen depo bulunamadi" });
                return;
            }
        }
        const batch = await prisma.$transaction(async (tx) => {
            const created = await tx.productionBatch.create({
                data: {
                    companyId: data.companyId,
                    productId: data.productId,
                    batchNumber: data.batchNumber,
                    quantity: data.quantity,
                    productionDate: data.productionDate,
                    expiryDate: data.expiryDate
                }
            });
            if (data.warehouseId) {
                let location = await tx.location.findFirst({
                    where: {
                        companyId: data.companyId,
                        type: "WAREHOUSE",
                        referenceId: data.warehouseId
                    }
                });
                if (!location) {
                    const warehouse = await tx.warehouse.findFirst({
                        where: { id: data.warehouseId, companyId: data.companyId }
                    });
                    if (warehouse) {
                        location = await tx.location.create({
                            data: {
                                companyId: data.companyId,
                                type: "WAREHOUSE",
                                referenceId: data.warehouseId,
                                name: warehouse.name
                            }
                        });
                    }
                }
                if (location) {
                    await tx.stockMovement.create({
                        data: {
                            companyId: data.companyId,
                            productId: data.productId,
                            locationId: location.id,
                            type: "PRODUCTION",
                            quantity: data.quantity,
                            referenceType: "PRODUCTION_BATCH",
                            referenceId: created.id
                        }
                    });
                }
            }
            return created;
        });
        reply.send(batch);
    });
    app.get("/production/batches", async (request, reply) => {
        const companyId = request.query.companyId;
        const batches = await prisma.productionBatch.findMany({
            where: companyId ? { companyId } : undefined,
            orderBy: { productionDate: "desc" }
        });
        reply.send(batches);
    });
}
