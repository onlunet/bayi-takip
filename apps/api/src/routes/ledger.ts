import { FastifyInstance } from "fastify";
import { z } from "zod";
import prisma from "../lib/prisma";

const ledgerSchema = z.object({
  companyId: z.string().min(1),
  dealerId: z.string().min(1),
  type: z.enum(["DISPATCH", "PAYMENT", "RETURN", "ADJUSTMENT"]),
  amount: z.coerce.number().positive(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  date: z.coerce.date().optional()
});

export async function registerLedgerRoutes(app: FastifyInstance) {
  app.post("/ledger", async (request, reply) => {
    const data = ledgerSchema.parse(request.body);
    const entry = await prisma.ledgerTransaction.create({
      data: {
        companyId: data.companyId,
        dealerId: data.dealerId,
        type: data.type,
        amount: data.amount,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        date: data.date ?? new Date()
      }
    });
    reply.send(entry);
  });

  app.get("/ledger", async (request, reply) => {
    const companyId = (request.query as any).companyId as string | undefined;
    const dealerId = (request.query as any).dealerId as string | undefined;
    const entries = await prisma.ledgerTransaction.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(dealerId ? { dealerId } : {})
      },
      orderBy: { date: "desc" }
    });
    reply.send(entries);
  });
}
