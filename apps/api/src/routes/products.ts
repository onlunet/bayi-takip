import { FastifyInstance } from "fastify";
import { z } from "zod";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prisma from "../lib/prisma.js";
import {
  buildCsv,
  buildXlsxBuffer,
  detectFormat,
  parseSpreadsheetFromBase64,
  pickBoolean,
  pickNumber,
  pickString
} from "../lib/spreadsheet.js";

const createSchema = z.object({
  companyId: z.string().min(1),
  categoryId: z.string().optional(),
  name: z.string().min(1),
  sku: z.string().optional(),
  unit: z.enum(["PIECE", "KG", "LT"]),
  weight: z.coerce.number().nonnegative().optional(),
  basePrice: z.coerce.number().nonnegative().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional()
});

const updateSchema = createSchema.partial().omit({ companyId: true });

const variantSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  unit: z.enum(["PIECE", "KG", "LT"]),
  multiplier: z.coerce.number().positive().optional().default(1)
});

const variantUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().optional(),
  unit: z.enum(["PIECE", "KG", "LT"]).optional(),
  multiplier: z.coerce.number().positive().optional(),
  active: z.boolean().optional()
});

const imageSchema = z.object({
  url: z.string().min(1)
});

const uploadImageSchema = z.object({
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  dataUrl: z.string().min(20),
  setAsMain: z.boolean().optional().default(true),
  addToGallery: z.boolean().optional().default(true)
});

const bulkImportSchema = z.object({
  companyId: z.string().min(1),
  fileName: z.string().optional(),
  contentBase64: z.string().min(20),
  updateExisting: z.boolean().optional().default(true),
  createCategories: z.boolean().optional().default(true),
  defaultUnit: z.enum(["PIECE", "KG", "LT"]).optional().default("PIECE")
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../../public/uploads/products");

function sanitizeFileName(value: string) {
  return value
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function extensionByMime(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  if (mimeType === "image/avif") return "avif";
  return null;
}

function parseImageData(dataUrl: string, fallbackMimeType?: string) {
  const dataUrlMatch = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (dataUrlMatch) {
    return {
      mimeType: dataUrlMatch[1],
      base64: dataUrlMatch[2]
    };
  }

  if (fallbackMimeType?.startsWith("image/")) {
    return {
      mimeType: fallbackMimeType,
      base64: dataUrl
    };
  }

  return null;
}

function parseUnit(raw: string, defaultUnit: "PIECE" | "KG" | "LT") {
  const value = String(raw || "")
    .toLocaleLowerCase("tr")
    .trim();

  if (!value) return defaultUnit;
  if (["kg", "kilogram", "kilo"].includes(value)) return "KG";
  if (["lt", "l", "litre", "liter"].includes(value)) return "LT";
  if (["piece", "adet", "ad", "pcs", "pc"].includes(value)) return "PIECE";
  return defaultUnit;
}

async function saveProductImage(params: { productId: string; fileName?: string; dataUrl: string; mimeType?: string }) {
  const parsed = parseImageData(params.dataUrl, params.mimeType);
  if (!parsed) {
    throw new Error("Gecersiz gorsel verisi");
  }

  const extension = extensionByMime(parsed.mimeType);
  if (!extension) {
    throw new Error("Desteklenmeyen gorsel formati");
  }

  await fs.mkdir(uploadsDir, { recursive: true });

  const baseName = sanitizeFileName(params.fileName ?? `urun-${params.productId}`) || `urun-${params.productId}`;
  const finalName = `${baseName}-${Date.now()}.${extension}`;
  const finalPath = path.join(uploadsDir, finalName);

  const buffer = Buffer.from(parsed.base64, "base64");
  await fs.writeFile(finalPath, buffer);

  return `/uploads/products/${finalName}`;
}

export async function registerProductRoutes(app: FastifyInstance) {
  app.get("/products/import-template", async (request, reply) => {
    const format = detectFormat((request.query as any)?.format as string | undefined);
    const headers = [
      "urun_adi",
      "sku",
      "kategori",
      "birim",
      "gramaj",
      "baz_fiyat",
      "aciklama",
      "gorsel_url",
      "aktif"
    ];

    const rows = [
      ["Karakilcik Eriste", "ER-001", "Eriste", "KG", "1000", "165", "Klasik urun", "", "1"],
      ["Koy Tarhanasi", "TH-002", "Tarhana", "KG", "500", "220", "", "", "1"]
    ];

    if (format === "csv") {
      const content = buildCsv(headers, rows);
      reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", 'attachment; filename="urun-toplu-sablon.csv"')
        .send(content);
      return;
    }

    const buffer = buildXlsxBuffer(headers, rows, "UrunSablonu");
    reply
      .header(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
      .header("Content-Disposition", 'attachment; filename="urun-toplu-sablon.xlsx"')
      .send(buffer);
  });

  app.post("/products/import", async (request, reply) => {
    const payload = bulkImportSchema.parse(request.body);
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

    const result = await prisma.$transaction(async (tx) => {
      const categories = await tx.category.findMany({
        where: { companyId: payload.companyId },
        select: { id: true, name: true }
      });

      const categoryMap = new Map(
        categories.map((category) => [category.name.toLocaleLowerCase("tr"), category.id])
      );

      let created = 0;
      let updated = 0;
      let skipped = 0;
      const errors: Array<{ row: number; message: string }> = [];

      for (const row of parsedRows) {
        try {
          const normalized = row.normalized;
          const name = pickString(normalized, [
            "urun",
            "urunadi",
            "urun_adi",
            "name",
            "product",
            "productname"
          ]);

          if (!name) {
            skipped += 1;
            continue;
          }

          const sku = pickString(normalized, ["sku", "stokkodu", "kodu", "kod"], "");
          const categoryName = pickString(normalized, ["kategori", "category"], "");
          const unit = parseUnit(
            pickString(normalized, ["birim", "unit"], payload.defaultUnit),
            payload.defaultUnit
          );
          const weight = pickNumber(normalized, ["gramaj", "agirlik", "weight"], NaN);
          const basePrice = pickNumber(
            normalized,
            ["bazfiyat", "baz_fiyat", "fiyat", "price", "birimfiyat"],
            NaN
          );
          const description = pickString(normalized, ["aciklama", "description"], "");
          const imageUrl = pickString(normalized, ["gorsel", "gorselurl", "image", "imageurl"], "");
          const active = pickBoolean(normalized, ["aktif", "active"], true);

          let categoryId: string | undefined;
          if (categoryName) {
            const categoryKey = categoryName.toLocaleLowerCase("tr");
            if (categoryMap.has(categoryKey)) {
              categoryId = categoryMap.get(categoryKey);
            } else if (payload.createCategories) {
              const createdCategory = await tx.category.create({
                data: {
                  companyId: payload.companyId,
                  name: categoryName
                }
              });
              categoryMap.set(categoryKey, createdCategory.id);
              categoryId = createdCategory.id;
            }
          }

          const existing = sku
            ? await tx.product.findFirst({
                where: {
                  companyId: payload.companyId,
                  sku
                }
              })
            : await tx.product.findFirst({
                where: {
                  companyId: payload.companyId,
                  name
                }
              });

          const productData = {
            categoryId,
            name,
            sku: sku || undefined,
            unit,
            weight: Number.isFinite(weight) ? weight : undefined,
            basePrice: Number.isFinite(basePrice) ? basePrice : undefined,
            description: description || undefined,
            imageUrl: imageUrl || undefined,
            active
          };

          if (!existing) {
            await tx.product.create({
              data: {
                companyId: payload.companyId,
                ...productData
              }
            });
            created += 1;
            continue;
          }

          if (!payload.updateExisting) {
            skipped += 1;
            continue;
          }

          await tx.product.update({
            where: { id: existing.id },
            data: productData
          });
          updated += 1;
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

    reply.send(result);
  });

  app.post("/products", async (request, reply) => {
    const data = createSchema.parse(request.body);
    const product = await prisma.product.create({
      data: {
        companyId: data.companyId,
        categoryId: data.categoryId,
        name: data.name,
        sku: data.sku,
        unit: data.unit,
        weight: data.weight,
        basePrice: data.basePrice ?? 0,
        description: data.description,
        imageUrl: data.imageUrl
      }
    });
    reply.send(product);
  });

  app.get("/products", async (request, reply) => {
    const companyId = (request.query as any).companyId as string | undefined;
    const products = await prisma.product.findMany({
      where: { ...(companyId ? { companyId } : {}), active: true },
      orderBy: { createdAt: "desc" }
    });
    reply.send(products);
  });

  app.patch("/products/:id", async (request, reply) => {
    const data = updateSchema.parse(request.body);
    const product = await prisma.product.update({
      where: { id: (request.params as any).id },
      data: {
        categoryId: data.categoryId,
        name: data.name,
        sku: data.sku,
        unit: data.unit,
        weight: data.weight,
        basePrice: data.basePrice,
        description: data.description,
        imageUrl: data.imageUrl
      }
    });
    reply.send(product);
  });

  app.delete("/products/:id", async (request, reply) => {
    const product = await prisma.product.update({
      where: { id: (request.params as any).id },
      data: { active: false }
    });
    reply.send(product);
  });

  app.post("/products/:id/variants", async (request, reply) => {
    const data = variantSchema.parse(request.body);
    const variant = await prisma.productVariant.create({
      data: {
        productId: (request.params as any).id,
        name: data.name,
        sku: data.sku,
        unit: data.unit,
        multiplier: data.multiplier
      }
    });
    reply.send(variant);
  });

  app.patch("/variants/:id", async (request, reply) => {
    const data = variantUpdateSchema.parse(request.body);
    const variant = await prisma.productVariant.update({
      where: { id: (request.params as any).id },
      data: {
        name: data.name,
        sku: data.sku,
        unit: data.unit,
        multiplier: data.multiplier,
        active: data.active
      }
    });
    reply.send(variant);
  });

  app.delete("/variants/:id", async (request, reply) => {
    const variant = await prisma.productVariant.update({
      where: { id: (request.params as any).id },
      data: { active: false }
    });
    reply.send(variant);
  });

  app.post("/products/:id/images", async (request, reply) => {
    const data = imageSchema.parse(request.body);
    const image = await prisma.productImage.create({
      data: {
        productId: (request.params as any).id,
        url: data.url
      }
    });
    reply.send(image);
  });

  app.post("/products/:id/images/upload", async (request, reply) => {
    try {
      const data = uploadImageSchema.parse(request.body);
      const product = await prisma.product.findUnique({ where: { id: (request.params as any).id } });
      if (!product) {
        reply.status(404).send({ message: "Urun bulunamadi" });
        return;
      }

      const imageUrl = await saveProductImage({
        productId: product.id,
        fileName: data.fileName,
        dataUrl: data.dataUrl,
        mimeType: data.mimeType
      });

      const [image] = await prisma.$transaction(async (tx) => {
        if (data.setAsMain) {
          await tx.product.update({
            where: { id: product.id },
            data: { imageUrl }
          });
        }

        if (data.addToGallery) {
          const createdImage = await tx.productImage.create({
            data: {
              productId: product.id,
              url: imageUrl
            }
          });
          return [createdImage];
        }

        return [null];
      });

      reply.send({ ok: true, imageUrl, image });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gorsel yukleme hatasi";
      reply.status(400).send({ message });
    }
  });

  app.get("/products/:id/images", async (request, reply) => {
    const images = await prisma.productImage.findMany({
      where: { productId: (request.params as any).id },
      orderBy: { createdAt: "desc" }
    });
    reply.send(images);
  });

  app.get("/variants", async (request, reply) => {
    const companyId = (request.query as any).companyId as string | undefined;
    const productId = (request.query as any).productId as string | undefined;
    const variants = await prisma.productVariant.findMany({
      where: {
        active: true,
        ...(productId ? { productId } : {}),
        ...(companyId ? { product: { companyId } } : {})
      },
      orderBy: { createdAt: "desc" }
    });
    reply.send(variants);
  });
}



