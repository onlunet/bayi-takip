import { z } from "zod";
import prisma from "../lib/prisma.js";
const movementSchema = z.object({
    companyId: z.string().min(1),
    productId: z.string().min(1),
    variantId: z.string().optional(),
    locationId: z.string().min(1),
    type: z.enum(["PRODUCTION", "DISPATCH", "SALE", "RETURN", "ADJUSTMENT"]),
    quantity: z
        .coerce
        .number()
        .refine((value) => Number.isFinite(value) && value !== 0, { message: "Miktar sifir olamaz" }),
    referenceType: z.string().optional(),
    referenceId: z.string().optional()
});
const deleteQuerySchema = z.object({
    force: z
        .string()
        .optional()
        .transform((value) => value === "true" || value === "1")
});
export async function registerStockMovementRoutes(app) {
    app.post("/stock-movements", async (request, reply) => {
        const data = movementSchema.parse(request.body);
        if (["PRODUCTION", "DISPATCH", "SALE", "RETURN"].includes(data.type) && data.quantity < 0) {
            reply.status(400).send({ message: "Bu hareket tipi icin miktar negatif olamaz" });
            return;
        }
        const movement = await prisma.stockMovement.create({
            data: {
                companyId: data.companyId,
                productId: data.productId,
                variantId: data.variantId,
                locationId: data.locationId,
                type: data.type,
                quantity: data.quantity,
                referenceType: data.referenceType,
                referenceId: data.referenceId
            }
        });
        reply.send(movement);
    });
    app.get("/stock-movements", async (request, reply) => {
        const companyId = request.query.companyId;
        const productId = request.query.productId;
        const locationId = request.query.locationId;
        const movements = await prisma.stockMovement.findMany({
            where: {
                ...(companyId ? { companyId } : {}),
                ...(productId ? { productId } : {}),
                ...(locationId ? { locationId } : {})
            },
            orderBy: { createdAt: "desc" }
        });
        reply.send(movements);
    });
    app.delete("/stock-movements/:id", async (request, reply) => {
        const { force } = deleteQuerySchema.parse(request.query ?? {});
        const movement = await prisma.stockMovement.findUnique({
            where: { id: request.params.id }
        });
        if (!movement) {
            reply.status(404).send({ message: "Stok hareketi bulunamadi" });
            return;
        }
        const isReferenced = Boolean(movement.referenceType && movement.referenceId);
        const isProtectedReference = movement.referenceType === "ORDER" || movement.referenceType === "DISPATCH";
        if (isReferenced && isProtectedReference && !force) {
            reply.status(400).send({
                message: "Bu hareket siparis/sevkiyat kaydina bagli. Once ilgili siparis veya sevkiyat kaydini duzeltin."
            });
            return;
        }
        const deleted = await prisma.stockMovement.delete({
            where: { id: movement.id }
        });
        reply.send(deleted);
    });
}
