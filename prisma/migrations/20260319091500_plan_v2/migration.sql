-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PREPARING';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'SHIPPED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'RETURNED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'EXCHANGED';

-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "IntegrationJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "ServiceRequestType" AS ENUM ('RETURN', 'EXCHANGE', 'PAYMENT_LINK', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "ServiceRequestStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "statusUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE IF NOT EXISTS "IntegrationSyncJob" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "dealerId" TEXT NOT NULL,
  "integrationId" TEXT NOT NULL,
  "platform" "Platform" NOT NULL,
  "status" "IntegrationJobStatus" NOT NULL DEFAULT 'PENDING',
  "idempotencyKey" TEXT,
  "options" JSONB,
  "summary" JSONB,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationSyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IntegrationSyncAttempt" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "attempt" INTEGER NOT NULL,
  "status" "IntegrationJobStatus" NOT NULL,
  "errorMessage" TEXT,
  "summary" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationSyncAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DealerServiceRequest" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "dealerId" TEXT NOT NULL,
  "orderId" TEXT,
  "type" "ServiceRequestType" NOT NULL,
  "status" "ServiceRequestStatus" NOT NULL DEFAULT 'OPEN',
  "note" TEXT,
  "payload" JSONB,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DealerServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationSyncJob_integrationId_idempotencyKey_key" ON "IntegrationSyncJob"("integrationId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "IntegrationSyncJob_companyId_createdAt_idx" ON "IntegrationSyncJob"("companyId", "createdAt");
CREATE INDEX IF NOT EXISTS "IntegrationSyncJob_integrationId_createdAt_idx" ON "IntegrationSyncJob"("integrationId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationSyncAttempt_jobId_attempt_key" ON "IntegrationSyncAttempt"("jobId", "attempt");
CREATE INDEX IF NOT EXISTS "IntegrationSyncAttempt_jobId_createdAt_idx" ON "IntegrationSyncAttempt"("jobId", "createdAt");
CREATE INDEX IF NOT EXISTS "DealerServiceRequest_companyId_dealerId_createdAt_idx" ON "DealerServiceRequest"("companyId", "dealerId", "createdAt");
CREATE INDEX IF NOT EXISTS "DealerServiceRequest_status_createdAt_idx" ON "DealerServiceRequest"("status", "createdAt");

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "IntegrationSyncJob"
  ADD CONSTRAINT "IntegrationSyncJob_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "IntegrationSyncJob"
  ADD CONSTRAINT "IntegrationSyncJob_dealerId_fkey"
  FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "IntegrationSyncJob"
  ADD CONSTRAINT "IntegrationSyncJob_integrationId_fkey"
  FOREIGN KEY ("integrationId") REFERENCES "DealerIntegration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "IntegrationSyncAttempt"
  ADD CONSTRAINT "IntegrationSyncAttempt_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "IntegrationSyncJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "DealerServiceRequest"
  ADD CONSTRAINT "DealerServiceRequest_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "DealerServiceRequest"
  ADD CONSTRAINT "DealerServiceRequest_dealerId_fkey"
  FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "DealerServiceRequest"
  ADD CONSTRAINT "DealerServiceRequest_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
