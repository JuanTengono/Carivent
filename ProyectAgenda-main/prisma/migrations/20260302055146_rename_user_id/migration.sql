-- AlterTable
ALTER TABLE "tokens_users" DROP COLUMN "userId",
ADD COLUMN     "user_id" INTEGER NOT NULL;