-- Create notification devices for push providers (FCM)
CREATE TABLE "notification_devices" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "notification_devices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_devices_token_key" ON "notification_devices"("token");
CREATE INDEX "notification_devices_user_id_deleted_at_idx" ON "notification_devices"("user_id", "deleted_at");

ALTER TABLE "notification_devices"
ADD CONSTRAINT "notification_devices_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
