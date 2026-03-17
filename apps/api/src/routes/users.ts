import { FastifyInstance } from "fastify";
import { z } from "zod";
import prisma from "../lib/prisma";

const createSchema = z.object({
  companyId: z.string().min(1),
  dealerId: z.string().optional(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["OWNER", "ADMIN", "WAREHOUSE", "ACCOUNTING", "DEALER"]).optional()
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["OWNER", "ADMIN", "WAREHOUSE", "ACCOUNTING", "DEALER"]).optional(),
  active: z.boolean().optional()
});

function generateKey() {
  return `key_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export async function registerUserRoutes(app: FastifyInstance) {
  app.post("/users", async (request, reply) => {
    const data = createSchema.parse(request.body);
    const user = await prisma.user.create({
      data: {
        companyId: data.companyId,
        dealerId: data.dealerId,
        name: data.name,
        email: data.email,
        role: data.role ?? "DEALER",
        apiKey: generateKey()
      }
    });
    reply.send(user);
  });

  app.get("/users", async (request, reply) => {
    const companyId = (request.query as any).companyId as string | undefined;
    const users = await prisma.user.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: { createdAt: "desc" }
    });
    reply.send(users);
  });

  app.patch("/users/:id", async (request, reply) => {
    const data = updateSchema.parse(request.body);
    const user = await prisma.user.update({
      where: { id: (request.params as any).id },
      data
    });
    reply.send(user);
  });
}

