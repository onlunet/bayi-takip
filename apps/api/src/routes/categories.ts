import { FastifyInstance } from "fastify";
import { z } from "zod";
import prisma from "../lib/prisma.js";

const createSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(1)
});

const updateSchema = z.object({
  name: z.string().min(1)
});

export async function registerCategoryRoutes(app: FastifyInstance) {
  app.post("/categories", async (request, reply) => {
    const data = createSchema.parse(request.body);
    const category = await prisma.category.create({ data });
    reply.send(category);
  });

  app.get("/categories", async (request, reply) => {
    const companyId = (request.query as any).companyId as string | undefined;
    const categories = await prisma.category.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: { name: "asc" }
    });
    reply.send(categories);
  });

  app.patch("/categories/:id", async (request, reply) => {
    const data = updateSchema.parse(request.body);
    const category = await prisma.category.update({
      where: { id: (request.params as any).id },
      data: { name: data.name }
    });
    reply.send(category);
  });

  app.delete("/categories/:id", async (request, reply) => {
    const categoryId = (request.params as any).id;

    await prisma.$transaction(async (tx) => {
      await tx.product.updateMany({
        where: { categoryId },
        data: { categoryId: null }
      });

      await tx.category.delete({
        where: { id: categoryId }
      });
    });

    reply.send({ ok: true });
  });
}

