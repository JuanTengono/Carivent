-- CreateEnum
CREATE TYPE "StatusAgenda" AS ENUM ('PENDING', 'IN_PROGRESS', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "agendas" (
    "id" SERIAL NOT NULL,
    "activity" TEXT NOT NULL,
    "event_id" INTEGER NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "status" "StatusAgenda" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "agendas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "agendas" ADD CONSTRAINT "agendas_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendas"
ADD CONSTRAINT "agendas_start_time_end_time_check" CHECK ("start_time" < "end_time");