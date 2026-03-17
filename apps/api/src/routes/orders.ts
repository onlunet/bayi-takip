import { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../lib/prisma";
import { buildRiskBlockMessage, calculateDealerRisk } from "../lib/risk";

const itemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  quantity: z.coerce.number().positive(),
  unit: z.enum(["PIECE", "KG", "LT"]),
  price: z.coerce.number().nonnegative()
});

const orderSchema = z.object({
  companyId: z.string().min(1),
  dealerId: z.string().min(1),
  channel: z.enum(["MANUAL", "WOO", "SHOPIFY", "MARKETPLACE", "OTHER"]),
  externalId: z.string().optional(),
  status: z.enum(["NEW", "PROCESSING", "COMPLETED", "CANCELLED"]).optional(),
  currency: z.string().optional(),
  syncStatus: z.enum(["PENDING", "SYNCED", "ERROR"]).optional(),
  allowOverLimit: z.boolean().optional().default(false),
  items: z.array(itemSchema).min(1)
});

async function getOrCreateDealerLocation(companyId: string, dealerId: string) {
  const existing = await prisma.location.findFirst({
    where: {
      companyId,
      type: "DEALER",
      referenceId: dealerId
    }
  });

  if (existing) return existing;

  const dealer = await prisma.dealer.findFirst({
    where: {
      id: dealerId,
      companyId
    }
  });

  if (!dealer) return null;

  try {
    return await prisma.location.create({
      data: {
        companyId,
        type: "DEALER",
        referenceId: dealerId,
        name: dealer.name
      }
    });
  } catch {
    return prisma.location.findFirst({
      where: {
        companyId,
        type: "DEALER",
        referenceId: dealerId
      }
    });
  }
}

export async function registerOrderRoutes(app: FastifyInstance) {
  app.post("/orders", async (request, reply) => {
    const data = orderSchema.parse(request.body);
    const authRole = (request as any).authUser?.role ?? "OWNER";
    const canBypassRisk = Boolean(
      data.allowOverLimit && (authRole === "OWNER" || authRole === "ADMIN")
    );

    const projectedDebtAmount = data.items.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0),
      0
    );

    if (data.channel === "MANUAL") {
      const dealer = await prisma.dealer.findFirst({
        where: {
          id: data.dealerId,
          companyId: data.companyId
        },
        select: {
          id: true,
          creditLimit: true,
          paymentTerms: true
        }
      });

      if (!dealer) {
        reply.status(400).send({ message: "Bayi bulunamadi" });
        return;
      }

      const ledgerEntries = await prisma.ledgerTransaction.findMany({
        where: { dealerId: dealer.id },
        select: { type: true, amount: true, date: true },
        orderBy: { date: "asc" }
      });

      const risk = calculateDealerRisk(
        ledgerEntries.map((entry) => ({
          type: entry.type,
          amount: Number(entry.amount ?? 0),
          date: entry.date
        })),
        {
          creditLimit: Number(dealer.creditLimit ?? 0),
          paymentTerms: Number(dealer.paymentTerms ?? 0)
        },
        projectedDebtAmount
      );

      if (!canBypassRisk && (risk.limitExceeded || risk.overdue)) {
        reply.status(400).send({
          message: buildRiskBlockMessage(risk),
          risk
        });
        return;
      }
    }

    const dealerLocation = await getOrCreateDealerLocation(data.companyId, data.dealerId);
    if (!dealerLocation) {
      reply.status(400).send({ message: "Bayi lokasyonu bulunamadi" });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const totals = data.items.map((item) =>
        new Prisma.Decimal(item.quantity).mul(new Prisma.Decimal(item.price))
      );
      const totalPrice = totals.reduce((sum, value) => sum.plus(value), new Prisma.Decimal(0));

      const order = await tx.order.create({
        data: {
          companyId: data.companyId,
          dealerId: data.dealerId,
          channel: data.channel,
          externalId: data.externalId,
          status: data.status ?? "NEW",
          currency: data.currency ?? "TRY",
          totalPrice,
          syncStatus: data.syncStatus ?? "PENDING",
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              unit: item.unit,
              price: item.price,
              total: new Prisma.Decimal(item.quantity).mul(new Prisma.Decimal(item.price))
            }))
          }
        }
      });

      for (const item of data.items) {
        const variant = item.variantId
          ? await tx.productVariant.findUnique({ where: { id: item.variantId } })
          : null;
        const multiplier = variant ? new Prisma.Decimal(variant.multiplier) : new Prisma.Decimal(1);
        const effectiveQuantity = new Prisma.Decimal(item.quantity).mul(multiplier).mul(-1);

        await tx.stockMovement.create({
          data: {
            companyId: data.companyId,
            productId: item.productId,
            variantId: item.variantId,
            locationId: dealerLocation.id,
            type: "SALE",
            quantity: effectiveQuantity,
            referenceType: "ORDER",
            referenceId: order.id
          }
        });
      }

      return order;
    });

    reply.send(result);
  });

  app.get("/orders", async (request, reply) => {
    const companyId = (request.query as any).companyId as string | undefined;
    const dealerId = (request.query as any).dealerId as string | undefined;
    const orders = await prisma.order.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(dealerId ? { dealerId } : {})
      },
      include: { items: true },
      orderBy: { createdAt: "desc" }
    });
    reply.send(orders);
  });
}


