import { FastifyInstance } from "fastify";
import prisma from "../lib/prisma";

export async function registerAuditRoutes(app: FastifyInstance) {
  app.get("/audit", async (request, reply) => {
    const companyId = (request.query as any).companyId as string | undefined;
    const logs = await prisma.auditLog.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: { createdAt: "desc" }
    });
    reply.send(logs);
  });
}

