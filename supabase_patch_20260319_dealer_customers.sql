-- Dealer Customer Tracking Patch (2026-03-19)
-- Bu dosyayi Supabase SQL Editor'da tek seferde calistirabilirsiniz.

CREATE TABLE IF NOT EXISTS "DealerCustomer" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "dealerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "note" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DealerCustomer_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "customerId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "DealerCustomer_dealerId_name_phone_key"
ON "DealerCustomer"("dealerId", "name", "phone");

CREATE INDEX IF NOT EXISTS "DealerCustomer_companyId_dealerId_createdAt_idx"
ON "DealerCustomer"("companyId", "dealerId", "createdAt");

CREATE INDEX IF NOT EXISTS "DealerCustomer_dealerId_active_name_idx"
ON "DealerCustomer"("dealerId", "active", "name");

CREATE INDEX IF NOT EXISTS "Order_dealerId_customerId_createdAt_idx"
ON "Order"("dealerId", "customerId", "createdAt");

DO $$
BEGIN
  ALTER TABLE "DealerCustomer"
  ADD CONSTRAINT "DealerCustomer_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "DealerCustomer"
  ADD CONSTRAINT "DealerCustomer_dealerId_fkey"
  FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Order"
  ADD CONSTRAINT "Order_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "DealerCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
