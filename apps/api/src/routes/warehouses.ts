import { FastifyInstance } from "fastify";
import { z } from "zod";
import prisma from "../lib/prisma";

const createSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(1),
  address: z.string().optional()
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional()
});

export async function registerWarehouseRoutes(app: FastifyInstance) {
  app.post("/warehouses", async (request, reply) => {
    const data = createSchema.parse(request.body);
    const warehouse = await prisma.$transaction(async (tx) => {
      const created = await tx.warehouse.create({
        data: {
          companyId: data.companyId,
          name: data.name,
          address: data.address
        }
      });

      await tx.location.create({
        data: {
          companyId: data.companyId,
          type: "WAREHOUSE",
          referenceId: created.id,
          name: created.name
        }
      });

      return created;
    });

    reply.send(warehouse);
  });

  app.get("/warehouses", async (request, reply) => {
    const companyId = (request.query as any).companyId as string | undefined;
    const warehouses = await prisma.warehouse.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: { createdAt: "desc" }
    });
    reply.send(warehouses);
  });

  app.patch("/warehouses/:id", async (request, reply) => {
    const data = updateSchema.parse(request.body);

    const updated = await prisma.$transaction(async (tx) => {
      const warehouse = await tx.warehouse.update({
        where: { id: (request.params as any).id },
        data
      });

      if (data.name) {
        await tx.location.updateMany({
          where: { type: "WAREHOUSE", referenceId: warehouse.id },
          data: { name: data.name }
        });
      }

      return warehouse;
    });

    reply.send(updated);
  });

  app.delete("/warehouses/:id", async (request, reply) => {
    const warehouse = await prisma.warehouse.delete({
      where: { id: (request.params as any).id }
    });
    await prisma.location.deleteMany({
      where: { referenceId: warehouse.id, type: "WAREHOUSE" }
    });
    reply.send(warehouse);
  });
}

