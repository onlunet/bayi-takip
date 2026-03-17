-- AlterTable
ALTER TABLE "UnmappedProduct" ADD COLUMN     "mappedProductId" TEXT,
ADD COLUMN     "mappedVariantId" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "UnmappedProduct" ADD CONSTRAINT "UnmappedProduct_mappedProductId_fkey" FOREIGN KEY ("mappedProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnmappedProduct" ADD CONSTRAINT "UnmappedProduct_mappedVariantId_fkey" FOREIGN KEY ("mappedVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
