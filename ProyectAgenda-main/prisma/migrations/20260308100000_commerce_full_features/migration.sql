-- Extend ticket status enum
ALTER TYPE "StatusTicket" ADD VALUE IF NOT EXISTS 'AVAILABLE';
ALTER TYPE "StatusTicket" ADD VALUE IF NOT EXISTS 'PURCHASED';
ALTER TYPE "StatusTicket" ADD VALUE IF NOT EXISTS 'USED';
ALTER TYPE "StatusTicket" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "StatusTicket" ADD VALUE IF NOT EXISTS 'EXPIRED';

-- Create enums for promotions, payments and notifications
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DiscountType') THEN
        CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'FIXED');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
        CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
        CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'PURCHASE', 'PROMOTION', 'REMINDER', 'SURVEY', 'EVENT');
    END IF;
END
$$;

-- Event commercialization fields
ALTER TABLE "events"
    ADD COLUMN IF NOT EXISTS "ticket_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "max_tickets_per_user" INTEGER NOT NULL DEFAULT 1;

-- Tickets extended fields
ALTER TABLE "tickets"
    ADD COLUMN IF NOT EXISTS "payment_id" INTEGER,
    ADD COLUMN IF NOT EXISTS "amount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Notifications type
ALTER TABLE "notifications"
    ADD COLUMN IF NOT EXISTS "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM';

-- Promotions table
CREATE TABLE IF NOT EXISTS "promotions" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "discount_type" "DiscountType" NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "min_quantity" INTEGER NOT NULL DEFAULT 1,
    "max_uses" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "valid_from" TIMESTAMP(3),
    "valid_to" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "event_id" INTEGER,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- Payments table
CREATE TABLE IF NOT EXISTS "payments" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "event_id" INTEGER NOT NULL,
    "promotion_id" INTEGER,
    "quantity" INTEGER NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PAID',
    "provider" TEXT,
    "reference" TEXT,
    "paid_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "promotions_code_deleted_at_key" ON "promotions"("code", "deleted_at");
CREATE INDEX IF NOT EXISTS "promotions_event_id_idx" ON "promotions"("event_id");
CREATE INDEX IF NOT EXISTS "promotions_user_id_idx" ON "promotions"("user_id");
CREATE INDEX IF NOT EXISTS "payments_user_id_idx" ON "payments"("user_id");
CREATE INDEX IF NOT EXISTS "payments_event_id_idx" ON "payments"("event_id");
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments"("status");
CREATE INDEX IF NOT EXISTS "tickets_payment_id_idx" ON "tickets"("payment_id");
CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notifications"("type");

-- Foreign keys
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'promotions_event_id_fkey'
    ) THEN
        ALTER TABLE "promotions"
            ADD CONSTRAINT "promotions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'promotions_user_id_fkey'
    ) THEN
        ALTER TABLE "promotions"
            ADD CONSTRAINT "promotions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payments_user_id_fkey'
    ) THEN
        ALTER TABLE "payments"
            ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payments_event_id_fkey'
    ) THEN
        ALTER TABLE "payments"
            ADD CONSTRAINT "payments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payments_promotion_id_fkey'
    ) THEN
        ALTER TABLE "payments"
            ADD CONSTRAINT "payments_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tickets_payment_id_fkey'
    ) THEN
        ALTER TABLE "tickets"
            ADD CONSTRAINT "tickets_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END
$$;
