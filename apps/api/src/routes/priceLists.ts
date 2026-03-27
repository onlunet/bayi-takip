import { FastifyInstance } from "fastify";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import {
  buildCsv,
  buildXlsxBuffer,
  detectFormat,
  parseSpreadsheetFromBase64,
  pickNumber,
  pickString
} from "../lib/spreadsheet.js";

const priceListSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(1),
  currency: z.string().optional()
});

const priceListUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  currency: z.string().min(1).optional()
});

const priceItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  price: z.coerce.number().nonnegative()
});

const assignSchema = z.object({
  priceListId: z.string().min(1)
});

const importProductsSchema = z.object({
  overwriteExisting: z.boolean().optional().default(false)
});

const dealerPriceImportSchema = z.object({
  fileName: z.string().optional(),
  contentBase64: z.string().min(20)
});

async function ensureDealerPriceList(dealerId: string) {
  const dealer = await prisma.dealer.findUnique({
    where: { id: dealerId },
    select: { id: true, name: true, companyId: true }
  });
  if (!dealer) return null;

  const assigned = await prisma.dealerPriceList.findFirst({
    where: { dealerId },
    include: { priceList: true },
    orderBy: { createdAt: "desc" }
  });

  if (assigned?.priceList) {
    return {
      dealer,
      priceList: assigned.priceList
    };
  }

  const priceList = await prisma.$transaction(async (tx) => {
    const created = await tx.priceList.create({
      data: {
        companyId: dealer.companyId,
        name: `${dealer.name} Ozel Fiyat Listesi`,
        currency: "TRY"
      }
    });
    await tx.dealerPriceList.create({
      data: {
        dealerId,
        priceListId: created.id
      }
    });
    return created;
  });

  return {
    dealer,
    priceList
  };
}

export async function registerPriceListRoutes(app: FastifyInstance) {
  app.post("/price-lists", async (request, reply) => {
    const data = priceListSchema.parse(request.body);
    const priceList = await prisma.priceList.create({
      data: {
        companyId: data.companyId,
        name: data.name,
        currency: data.currency ?? "TRY"
      }
    });
    reply.send(priceList);
  });

  app.get("/price-lists", async (request, reply) => {
    const companyId = (request.query as any).companyId as string | undefined;
    const lists = await prisma.priceList.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: { createdAt: "desc" }
    });
    reply.send(lists);
  });

  app.patch("/price-lists/:id", async (request, reply) => {
    const data = priceListUpdateSchema.parse(request.body);
    const updated = await prisma.priceList.update({
      where: { id: (request.params as any).id },
      data
    });
    reply.send(updated);
  });

  app.delete("/price-lists/:id", async (request, reply) => {
    const priceListId = (request.params as any).id as string;
    await prisma.$transaction(async (tx) => {
      await tx.dealerPriceList.deleteMany({
        where: { priceListId }
      });
      await tx.priceListItem.deleteMany({
        where: { priceListId }
      });
      await tx.priceList.delete({
        where: { id: priceListId }
      });
    });
    reply.send({ success: true });
  });

  app.post("/price-lists/:id/items", async (request, reply) => {
    const data = priceItemSchema.parse(request.body);
    const variantId = data.variantId?.trim() ? data.variantId.trim() : null;
    let item;

    if (variantId) {
      item = await prisma.priceListItem.upsert({
        where: {
          priceListId_productId_variantId: {
            priceListId: (request.params as any).id,
            productId: data.productId,
            variantId
          }
        },
        update: { price: data.price },
        create: {
          priceListId: (request.params as any).id,
          productId: data.productId,
          variantId,
          price: data.price
        }
      });
    } else {
      const existing = await prisma.priceListItem.findFirst({
        where: {
          priceListId: (request.params as any).id,
          productId: data.productId,
          variantId: null
        }
      });

      if (existing) {
        item = await prisma.priceListItem.update({
          where: { id: existing.id },
          data: { price: data.price }
        });
      } else {
        item = await prisma.priceListItem.create({
          data: {
            priceListId: (request.params as any).id,
            productId: data.productId,
            variantId: null,
            price: data.price
          }
        });
      }
    }

    reply.send(item);
  });

  app.get("/price-lists/:id/items", async (request, reply) => {
    const items = await prisma.priceListItem.findMany({
      where: { priceListId: (request.params as any).id },
      include: { product: true, variant: true },
      orderBy: { productId: "asc" }
    });
    reply.send(items);
  });

  app.post("/price-lists/:id/import-products", async (request, reply) => {
    const payload = importProductsSchema.parse(request.body ?? {});
    const priceListId = (request.params as any).id as string;

    const priceList = await prisma.priceList.findUnique({
      where: { id: priceListId }
    });

    if (!priceList) {
      reply.status(404).send({ message: "Fiyat listesi bulunamadi" });
      return;
    }

    const products = await prisma.product.findMany({
      where: {
        companyId: priceList.companyId,
        active: true
      },
      select: {
        id: true,
        basePrice: true
      }
    });

    if (!products.length) {
      reply.send({ created: 0, updated: 0, skipped: 0, total: 0 });
      return;
    }

    const existingItems = await prisma.priceListItem.findMany({
      where: {
        priceListId,
        variantId: null
      },
      select: {
        id: true,
        productId: true
      }
    });

    const existingSet = new Set(existingItems.map((item) => item.productId));
    let created = 0;
    let updated = 0;
    let skipped = 0;

    await prisma.$transaction(async (tx) => {
      for (const product of products) {
        const exists = existingSet.has(product.id);
        if (!exists) {
          await tx.priceListItem.create({
            data: {
              priceListId,
              productId: product.id,
              variantId: null,
              price: product.basePrice
            }
          });
          created += 1;
          continue;
        }

        if (payload.overwriteExisting) {
          await tx.priceListItem.updateMany({
            where: {
              priceListId,
              productId: product.id,
              variantId: null
            },
            data: {
              price: product.basePrice
            }
          });
          updated += 1;
        } else {
          skipped += 1;
        }
      }
    });

    reply.send({
      created,
      updated,
      skipped,
      total: products.length
    });
  });

  app.post("/dealers/:id/price-lists", async (request, reply) => {
    const data = assignSchema.parse(request.body);
    const assigned = await prisma.$transaction(async (tx) => {
      await tx.dealerPriceList.deleteMany({
        where: { dealerId: (request.params as any).id }
      });

      return tx.dealerPriceList.create({
        data: {
          dealerId: (request.params as any).id,
          priceListId: data.priceListId
        }
      });
    });
    reply.send(assigned);
  });

  app.get("/dealers/:id/price-lists", async (request, reply) => {
    const assigned = await prisma.dealerPriceList.findMany({
      where: { dealerId: (request.params as any).id },
      include: { priceList: true },
      orderBy: { createdAt: "desc" }
    });
    reply.send(assigned);
  });

  app.delete("/dealers/:id/price-lists/:priceListId", async (request, reply) => {
    const removed = await prisma.dealerPriceList.delete({
      where: {
        dealerId_priceListId: {
          dealerId: (request.params as any).id,
          priceListId: (request.params as any).priceListId
        }
      }
    });
    reply.send(removed);
  });

  app.get("/dealers/:id/price-lists/export", async (request, reply) => {
    const dealerId = (request.params as any).id as string;
    const format = detectFormat((request.query as any)?.format as string | undefined);
    const ensured = await ensureDealerPriceList(dealerId);

    if (!ensured) {
      reply.status(404).send({ message: "Bayi bulunamadi" });
      return;
    }

    const { dealer, priceList } = ensured;

    const [products, priceItems] = await Promise.all([
      prisma.product.findMany({
        where: {
          companyId: dealer.companyId,
          active: true
        },
        include: {
          variants: {
            where: { active: true }
          }
        },
        orderBy: { name: "asc" }
      }),
      prisma.priceListItem.findMany({
        where: { priceListId: priceList.id },
        select: { productId: true, variantId: true, price: true }
      })
    ]);

    const itemMap = new Map(
      priceItems.map((item) => [`${item.productId}:${item.variantId ?? ""}`, Number(item.price)])
    );

    const headers = [
      "productId",
      "variantId",
      "sku",
      "urun_adi",
      "varyasyon",
      "birim",
      "gramaj",
      "mevcut_fiyat",
      "yeni_fiyat",
      "not"
    ];

    const rows: Array<Array<unknown>> = [];
    for (const product of products) {
      const basePrice = itemMap.get(`${product.id}:`) ?? Number(product.basePrice ?? 0);
      rows.push([
        product.id,
        "",
        product.sku ?? "",
        product.name,
        "",
        product.unit,
        Number(product.weight ?? 0).toFixed(2),
        Number(basePrice).toFixed(2),
        "",
        ""
      ]);

      for (const variant of product.variants) {
        const variantPrice =
          itemMap.get(`${product.id}:${variant.id}`) ??
          itemMap.get(`${product.id}:`) ??
          Number(product.basePrice ?? 0);
        rows.push([
          product.id,
          variant.id,
          variant.sku ?? product.sku ?? "",
          product.name,
          variant.name,
          variant.unit,
          "",
          Number(variantPrice).toFixed(2),
          "",
          ""
        ]);
      }
    }

    const safeDealer = dealer.name.replace(/[^a-zA-Z0-9_-]/g, "-");
    const safeList = priceList.name.replace(/[^a-zA-Z0-9_-]/g, "-");

    if (format === "csv") {
      const csv = buildCsv(headers, rows);
      reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header(
          "Content-Disposition",
          `attachment; filename="bayi-${safeDealer}-${safeList}-fiyat.csv"`
        )
        .send(csv);
      return;
    }

    const buffer = buildXlsxBuffer(headers, rows, "BayiFiyatlari");
    reply
      .header(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
      .header(
        "Content-Disposition",
        `attachment; filename="bayi-${safeDealer}-${safeList}-fiyat.xlsx"`
      )
      .send(buffer);
  });

  app.post("/dealers/:id/price-lists/import", async (request, reply) => {
    const dealerId = (request.params as any).id as string;
    const payload = dealerPriceImportSchema.parse(request.body);
    let parsedRows: ReturnType<typeof parseSpreadsheetFromBase64>;
    try {
      parsedRows = parseSpreadsheetFromBase64(payload.contentBase64);
    } catch {
      reply.status(400).send({ message: "Dosya okunamadi. CSV/XLSX formatini kontrol edin." });
      return;
    }

    if (!parsedRows.length) {
      reply.status(400).send({ message: "Dosyada islenecek satir bulunamadi" });
      return;
    }

    const ensured = await ensureDealerPriceList(dealerId);
    if (!ensured) {
      reply.status(404).send({ message: "Bayi bulunamadi" });
      return;
    }

    const { dealer, priceList } = ensured;
    const [products, variants] = await Promise.all([
      prisma.product.findMany({
        where: { companyId: dealer.companyId, active: true },
        select: { id: true, name: true, sku: true }
      }),
      prisma.productVariant.findMany({
        where: { product: { companyId: dealer.companyId }, active: true },
        select: { id: true, productId: true, sku: true, name: true }
      })
    ]);

    const productById = new Map(products.map((item) => [item.id, item]));
    const productBySku = new Map(
      products
        .filter((item) => item.sku)
        .map((item) => [String(item.sku).toLocaleLowerCase("tr"), item])
    );
    const productByName = new Map(products.map((item) => [item.name.toLocaleLowerCase("tr"), item]));

    const variantById = new Map(variants.map((item) => [item.id, item]));
    const variantBySku = new Map(
      variants
        .filter((item) => item.sku)
        .map((item) => [String(item.sku).toLocaleLowerCase("tr"), item])
    );

    const result = await prisma.$transaction(async (tx) => {
      let created = 0;
      let updated = 0;
      let skipped = 0;
      const errors: Array<{ row: number; message: string }> = [];

      for (const row of parsedRows) {
        try {
          const normalized = row.normalized;
          const newPrice = pickNumber(normalized, ["yeni_fiyat", "yenifiyat", "newprice", "price"], NaN);
          if (!Number.isFinite(newPrice) || newPrice < 0) {
            skipped += 1;
            continue;
          }

          const productIdInput = pickString(normalized, ["productid", "urunid"], "");
          const variantIdInput = pickString(normalized, ["variantid", "varyasyonid"], "");
          const skuInput = pickString(normalized, ["sku", "stokkodu"], "").toLocaleLowerCase("tr");
          const variantSkuInput = pickString(normalized, ["varyasyonsku", "variantsku", "altsku"], "")
            .toLocaleLowerCase("tr");
          const productNameInput = pickString(normalized, ["urun_adi", "urunadi", "name", "product"], "")
            .toLocaleLowerCase("tr");

          let product = productIdInput ? productById.get(productIdInput) : undefined;
          if (!product && skuInput) product = productBySku.get(skuInput);
          if (!product && productNameInput) product = productByName.get(productNameInput);

          if (!product) {
            errors.push({ row: row.rowIndex, message: "Urun eslesmedi" });
            continue;
          }

          let variant = variantIdInput ? variantById.get(variantIdInput) : undefined;
          if (!variant && variantSkuInput) {
            const variantByCode = variantBySku.get(variantSkuInput);
            if (variantByCode && variantByCode.productId === product.id) {
              variant = variantByCode;
            }
          }

          if (variant) {
            const item = await tx.priceListItem.findFirst({
              where: {
                priceListId: priceList.id,
                productId: product.id,
                variantId: variant.id
              }
            });

            if (item) {
              await tx.priceListItem.update({
                where: { id: item.id },
                data: { price: newPrice }
              });
              updated += 1;
            } else {
              await tx.priceListItem.create({
                data: {
                  priceListId: priceList.id,
                  productId: product.id,
                  variantId: variant.id,
                  price: newPrice
                }
              });
              created += 1;
            }
            continue;
          }

          const baseItem = await tx.priceListItem.findFirst({
            where: {
              priceListId: priceList.id,
              productId: product.id,
              variantId: null
            }
          });

          if (baseItem) {
            await tx.priceListItem.update({
              where: { id: baseItem.id },
              data: { price: newPrice }
            });
            updated += 1;
          } else {
            await tx.priceListItem.create({
              data: {
                priceListId: priceList.id,
                productId: product.id,
                variantId: null,
                price: newPrice
              }
            });
            created += 1;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Satir islenemedi";
          errors.push({ row: row.rowIndex, message });
        }
      }

      return {
        totalRows: parsedRows.length,
        created,
        updated,
        skipped,
        errors
      };
    });

    reply.send({
      priceListId: priceList.id,
      ...result
    });
  });
}



