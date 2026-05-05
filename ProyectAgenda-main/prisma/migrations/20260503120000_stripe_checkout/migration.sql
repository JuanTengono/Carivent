-- AlterEnum
ALTER TYPE "StatusTicket" ADD VALUE IF NOT EXISTS 'PAYMENT_PENDING';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "stripe_payment_intent_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "payments_stripe_payment_intent_id_key" ON "payments"("stripe_payment_intent_id");
