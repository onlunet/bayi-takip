-- AlterTable
ALTER TABLE "DealerSettings"
ADD COLUMN IF NOT EXISTS "storefrontKey" TEXT;

UPDATE "DealerSettings"
SET "storefrontKey" = CONCAT(
  'store_',
  "dealerId",
  '_',
  SUBSTRING(md5(CAST(random() AS TEXT) || CAST(clock_timestamp() AS TEXT)) FOR 8)
)
WHERE "storefrontKey" IS NULL;

ALTER TABLE "DealerSettings"
ALTER COLUMN "storefrontKey" SET NOT NULL;

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "customerName" TEXT,
ADD COLUMN IF NOT EXISTS "customerPhone" TEXT,
ADD COLUMN IF NOT EXISTS "customerNote" TEXT;

-- AlterTable
ALTER TABLE "OrderItem"
ADD COLUMN IF NOT EXISTS "note" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DealerSettings_storefrontKey_key"
ON "DealerSettings"("storefrontKey");
