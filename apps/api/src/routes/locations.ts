import { FastifyInstance } from "fastify";
import { z } from "zod";
import prisma from "../lib/prisma.js";

const createSchema = z.object({
  companyId: z.string().min(1),
  type: z.enum(["WAREHOUSE", "DEALER"]),
  referenceId: z.string().min(1),
  name: z.string().min(1)
});

export async function registerLocationRoutes(app: FastifyInstance) {
  app.post("/locations", async (request, reply) => {
    const data = createSchema.parse(request.body);
    const location = await prisma.location.create({ data });
    reply.send(location);
  });

  app.get("/locations", async (request, reply) => {
    const companyId = (request.query as any).companyId as string | undefined;
    const locations = await prisma.location.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: { createdAt: "desc" }
    });
    reply.send(locations);
  });
}

