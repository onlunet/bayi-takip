import prisma from "../lib/prisma.js";
export async function registerAuditRoutes(app) {
    app.get("/audit", async (request, reply) => {
        const companyId = request.query.companyId;
        const logs = await prisma.auditLog.findMany({
            where: companyId ? { companyId } : undefined,
            orderBy: { createdAt: "desc" }
        });
        reply.send(logs);
    });
}
