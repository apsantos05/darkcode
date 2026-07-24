-- CreateTable
CREATE TABLE "payment_charges" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'BLACKCAT',
    "providerTransactionId" TEXT,
    "externalReference" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "grossCents" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL DEFAULT 0,
    "netCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT NOT NULL DEFAULT 'PIX',
    "invoiceUrl" TEXT,
    "pixCopyPaste" TEXT,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "clientId" TEXT,
    "projectId" TEXT,
    "revenueId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payment_charges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_charges_providerTransactionId_key" ON "payment_charges"("providerTransactionId");
CREATE UNIQUE INDEX "payment_charges_externalReference_key" ON "payment_charges"("externalReference");
CREATE UNIQUE INDEX "payment_charges_revenueId_key" ON "payment_charges"("revenueId");
CREATE INDEX "payment_charges_status_idx" ON "payment_charges"("status");
CREATE INDEX "payment_charges_clientId_idx" ON "payment_charges"("clientId");
CREATE INDEX "payment_charges_projectId_idx" ON "payment_charges"("projectId");
CREATE INDEX "payment_charges_createdAt_idx" ON "payment_charges"("createdAt");
CREATE INDEX "payment_charges_createdById_idx" ON "payment_charges"("createdById");

ALTER TABLE "payment_charges" ADD CONSTRAINT "payment_charges_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_charges" ADD CONSTRAINT "payment_charges_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_charges" ADD CONSTRAINT "payment_charges_revenueId_fkey" FOREIGN KEY ("revenueId") REFERENCES "revenues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_charges" ADD CONSTRAINT "payment_charges_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_charges" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "payment_charges" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "payment_charges" FROM authenticated;
  END IF;
END $$;
