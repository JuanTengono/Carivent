-- User email verification columns
ALTER TABLE "users"
    ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "email_verified_at" TIMESTAMP(3);

-- Auth token enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuthTokenType') THEN
        CREATE TYPE "AuthTokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');
    END IF;
END
$$;

-- Auth action tokens table
CREATE TABLE IF NOT EXISTS "user_auth_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" "AuthTokenType" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_auth_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_auth_tokens_type_token_hash_deleted_at_key"
ON "user_auth_tokens"("type", "token_hash", "deleted_at");

CREATE INDEX IF NOT EXISTS "user_auth_tokens_user_id_type_deleted_at_idx"
ON "user_auth_tokens"("user_id", "type", "deleted_at");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_auth_tokens_user_id_fkey'
    ) THEN
        ALTER TABLE "user_auth_tokens"
            ADD CONSTRAINT "user_auth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END
$$;
