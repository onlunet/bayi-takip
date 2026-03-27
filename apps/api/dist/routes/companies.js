import { z } from "zod";
import prisma from "../lib/prisma.js";
import { getDealerRegistrationEnabled, setDealerRegistrationEnabled } from "../lib/dealerMembership.js";
const createSchema = z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional()
});
const updateSchema = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional()
});
const deleteQuerySchema = z.object({
    force: z
        .string()
        .optional()
        .transform((value) => value === "true" || value === "1")
});
const dealerRegistrationSchema = z.object({
    enabled: z.boolean()
});
export async function registerCompanyRoutes(app) {
    app.post("/companies", async (request, reply) => {
        const data = createSchema.parse(request.body);
        const company = await prisma.company.create({ data });
        reply.send(company);
    });
    app.get("/companies", async (request, reply) => {
        const scopedCompanyId = request.scopedCompanyId;
        const companies = await prisma.company.findMany({
            where: scopedCompanyId ? { id: scopedCompanyId } : undefined,
            orderBy: { createdAt: "desc" }
        });
        reply.send(companies);
    });
    app.get("/companies/:id", async (request, reply) => {
        const company = await prisma.company.findUnique({ where: { id: request.params.id } });
        if (!company) {
            reply.status(404).send({ message: "Company not found" });
            return;
        }
        reply.send(company);
    });
    app.patch("/companies/:id", async (request, reply) => {
        const data = updateSchema.parse(request.body);
        const company = await prisma.company.update({
            where: { id: request.params.id },
            data
        });
        reply.send(company);
    });
    app.get("/companies/:id/dealer-registration", async (request, reply) => {
        const companyId = request.params.id;
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { id: true }
        });
        if (!company) {
            reply.status(404).send({ message: "Company not found" });
            return;
        }
        const enabled = await getDealerRegistrationEnabled(companyId);
        reply.send({ companyId, enabled });
    });
    app.post("/companies/:id/dealer-registration", async (request, reply) => {
        const companyId = request.params.id;
        const data = dealerRegistrationSchema.parse(request.body);
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { id: true }
        });
        if (!company) {
            reply.status(404).send({ message: "Company not found" });
            return;
        }
        await setDealerRegistrationEnabled(companyId, data.enabled);
        reply.send({ companyId, enabled: data.enabled });
    });
    app.delete("/companies/:id", async (request, reply) => {
        const { force } = deleteQuerySchema.parse(request.query ?? {});
        const companyId = request.params.id;
        if (!force) {
            try {
                const deleted = await prisma.company.delete({ where: { id: companyId } });
                reply.send(deleted);
            }
            catch {
                reply.status(400).send({
                    message: "Firma kaydi bagli veriler nedeniyle silinemedi. Once kayitlari temizleyin veya bagli verilerle silmeyi secin."
                });
            }
            return;
        }
        await prisma.$transaction(async (tx) => {
            const dealers = await tx.dealer.findMany({ where: { companyId }, select: { id: true } });
            const dealerIds = dealers.map((d) => d.id);
            const products = await tx.product.findMany({ where: { companyId }, select: { id: true } });
            const productIds = products.map((p) => p.id);
            const priceLists = await tx.priceList.findMany({ where: { companyId }, select: { id: true } });
            const priceListIds = priceLists.map((p) => p.id);
            const orders = await tx.order.findMany({ where: { companyId }, select: { id: true } });
            const orderIds = orders.map((o) => o.id);
            const dispatches = await tx.dispatch.findMany({ where: { companyId }, select: { id: true } });
            const dispatchIds = dispatches.map((d) => d.id);
            await tx.auditLog.deleteMany({ where: { companyId } });
            await tx.integrationLog.deleteMany({ where: { companyId } });
            await tx.integrationSyncAttempt.deleteMany({
                where: { job: { is: { companyId } } }
            });
            await tx.integrationSyncJob.deleteMany({ where: { companyId } });
            await tx.dealerServiceRequest.deleteMany({ where: { companyId } });
            await tx.attributeValue.deleteMany({ where: { companyId } });
            await tx.attributeDefinition.deleteMany({ where: { companyId } });
            await tx.pricingRule.deleteMany({ where: { companyId } });
            await tx.workflowTemplate.deleteMany({ where: { companyId } });
            await tx.reportPreset.deleteMany({ where: { companyId } });
            await tx.industryProfile.deleteMany({ where: { companyId } });
            await tx.productionBatch.deleteMany({ where: { companyId } });
            await tx.stockMovement.deleteMany({ where: { companyId } });
            await tx.ledgerTransaction.deleteMany({ where: { companyId } });
            if (orderIds.length) {
                await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
            }
            if (dispatchIds.length) {
                await tx.dispatchItem.deleteMany({ where: { dispatchId: { in: dispatchIds } } });
            }
            await tx.order.deleteMany({ where: { companyId } });
            await tx.dispatch.deleteMany({ where: { companyId } });
            await tx.productMapping.deleteMany({ where: { companyId } });
            await tx.dealerIntegration.deleteMany({ where: { companyId } });
            if (dealerIds.length) {
                await tx.dealerSettings.deleteMany({ where: { dealerId: { in: dealerIds } } });
                await tx.dealerPriceList.deleteMany({ where: { dealerId: { in: dealerIds } } });
            }
            await tx.user.deleteMany({ where: { companyId } });
            if (priceListIds.length) {
                await tx.priceListItem.deleteMany({ where: { priceListId: { in: priceListIds } } });
            }
            await tx.priceList.deleteMany({ where: { companyId } });
            if (productIds.length) {
                await tx.productImage.deleteMany({ where: { productId: { in: productIds } } });
                await tx.productVariant.deleteMany({ where: { productId: { in: productIds } } });
            }
            await tx.product.deleteMany({ where: { companyId } });
            await tx.category.deleteMany({ where: { companyId } });
            await tx.location.deleteMany({ where: { companyId } });
            await tx.warehouse.deleteMany({ where: { companyId } });
            await tx.dealer.deleteMany({ where: { companyId } });
            await tx.company.delete({ where: { id: companyId } });
        });
        reply.send({ success: true });
    });
}
