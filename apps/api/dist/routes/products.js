import { z } from "zod";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prisma from "../lib/prisma";
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
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../../public/uploads/products");
function sanitizeFileName(value) {
    return value
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9_-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60);
}
function extensionByMime(mimeType) {
    if (mimeType === "image/jpeg")
        return "jpg";
    if (mimeType === "image/png")
        return "png";
    if (mimeType === "image/webp")
        return "webp";
    if (mimeType === "image/gif")
        return "gif";
    if (mimeType === "image/avif")
        return "avif";
    return null;
}
function parseImageData(dataUrl, fallbackMimeType) {
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
async function saveProductImage(params) {
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
export async function registerProductRoutes(app) {
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
        const companyId = request.query.companyId;
        const products = await prisma.product.findMany({
            where: { ...(companyId ? { companyId } : {}), active: true },
            orderBy: { createdAt: "desc" }
        });
        reply.send(products);
    });
    app.patch("/products/:id", async (request, reply) => {
        const data = updateSchema.parse(request.body);
        const product = await prisma.product.update({
            where: { id: request.params.id },
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
            where: { id: request.params.id },
            data: { active: false }
        });
        reply.send(product);
    });
    app.post("/products/:id/variants", async (request, reply) => {
        const data = variantSchema.parse(request.body);
        const variant = await prisma.productVariant.create({
            data: {
                productId: request.params.id,
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
            where: { id: request.params.id },
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
            where: { id: request.params.id },
            data: { active: false }
        });
        reply.send(variant);
    });
    app.post("/products/:id/images", async (request, reply) => {
        const data = imageSchema.parse(request.body);
        const image = await prisma.productImage.create({
            data: {
                productId: request.params.id,
                url: data.url
            }
        });
        reply.send(image);
    });
    app.post("/products/:id/images/upload", async (request, reply) => {
        try {
            const data = uploadImageSchema.parse(request.body);
            const product = await prisma.product.findUnique({ where: { id: request.params.id } });
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Gorsel yukleme hatasi";
            reply.status(400).send({ message });
        }
    });
    app.get("/products/:id/images", async (request, reply) => {
        const images = await prisma.productImage.findMany({
            where: { productId: request.params.id },
            orderBy: { createdAt: "desc" }
        });
        reply.send(images);
    });
    app.get("/variants", async (request, reply) => {
        const companyId = request.query.companyId;
        const productId = request.query.productId;
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
