-- Carivent Schema for Supabase (PostgreSQL)

-- ENUM Types
DO $$ BEGIN
    CREATE TYPE "StatusAgenda" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "StatusEvent" AS ENUM ('PENDING', 'ACTIVE', 'CANCELLED', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "StatusSite" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "StatusTicket" AS ENUM ('ACTIVE', 'USED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "StatusUser" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TypeEvent" AS ENUM ('CONCERT', 'CONFERENCE', 'WORKSHOP', 'EXHIBITION', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TypePermission" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Functions for triggers
CREATE OR REPLACE FUNCTION prevent_permission_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Cannot delete permissions';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_permission_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Cannot update permissions';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_token_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Cannot update tokens';
END;
$$ LANGUAGE plpgsql;

-- Tables
CREATE TABLE IF NOT EXISTS "roles" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "users" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "roleId" INTEGER NOT NULL,
    "status" "StatusUser" DEFAULT 'ACTIVE' NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "permissions" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" "TypePermission" NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "role_permissions" (
    "id" SERIAL PRIMARY KEY,
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "sites" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ubication" TEXT,
    "direction" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "capacity" INTEGER,
    "user_id" INTEGER NOT NULL,
    "status" "StatusSite" DEFAULT 'ACTIVE' NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "events" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" "TypeEvent" NOT NULL,
    "status" "StatusEvent" DEFAULT 'PENDING' NOT NULL,
    "description" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "site_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "agendas" (
    "id" SERIAL PRIMARY KEY,
    "activity" TEXT NOT NULL,
    "event_id" INTEGER NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "status" "StatusAgenda" DEFAULT 'PENDING' NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "tickets" (
    "id" SERIAL PRIMARY KEY,
    "code_qr" TEXT NOT NULL,
    "event_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "validated" BOOLEAN DEFAULT FALSE NOT NULL,
    "validated_at" TIMESTAMP(3),
    "status" "StatusTicket" DEFAULT 'ACTIVE' NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "notifications" (
    "id" SERIAL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN DEFAULT FALSE NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "surveys" (
    "id" SERIAL PRIMARY KEY,
    "title_survey" TEXT NOT NULL,
    "event_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "survey_responses" (
    "id" SERIAL PRIMARY KEY,
    "survey_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "stars" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "tokens_users" (
    "id" SERIAL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "user_id" INTEGER NOT NULL
);

-- Foreign Keys
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id");
ALTER TABLE "role_permissions" ADD CONSTRAINT "rp_role_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id");
ALTER TABLE "role_permissions" ADD CONSTRAINT "rp_permission_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id");
ALTER TABLE "sites" ADD CONSTRAINT "sites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");
ALTER TABLE "events" ADD CONSTRAINT "events_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id");
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");
ALTER TABLE "agendas" ADD CONSTRAINT "agendas_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id");
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id");
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id");
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");
ALTER TABLE "survey_responses" ADD CONSTRAINT "sr_survey_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id");
ALTER TABLE "survey_responses" ADD CONSTRAINT "sr_user_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");
ALTER TABLE "tokens_users" ADD CONSTRAINT "tu_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");

-- Unique Indexes (separate from table creation for PostgreSQL)
CREATE UNIQUE INDEX IF NOT EXISTS roles_name_deleted_at_key ON "roles" ("name") WHERE ("deleted_at" IS NULL);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_deleted_at_key ON "users" ("email") WHERE ("deleted_at" IS NULL);
CREATE UNIQUE INDEX IF NOT EXISTS permissions_name_type_deleted_at_key ON "permissions" ("name", "type") WHERE ("deleted_at" IS NULL);
CREATE UNIQUE INDEX IF NOT EXISTS tokens_users_token_deleted_at_key ON "tokens_users" ("token") WHERE ("deleted_at" IS NULL);
CREATE UNIQUE INDEX IF NOT EXISTS tickets_code_qr_key ON "tickets" ("code_qr");
CREATE UNIQUE INDEX IF NOT EXISTS role_permissions_role_id_permission_id_key ON "role_permissions" ("role_id", "permission_id");

-- Triggers
CREATE TRIGGER "no_delete_permission" BEFORE DELETE ON "permissions" FOR EACH ROW EXECUTE FUNCTION prevent_permission_delete();
CREATE TRIGGER "no_update_permission" BEFORE UPDATE ON "permissions" FOR EACH ROW EXECUTE FUNCTION prevent_permission_update();
CREATE TRIGGER "no_update_token" BEFORE UPDATE ON "tokens_users" FOR EACH ROW EXECUTE FUNCTION prevent_token_update();

-- Check constraints
ALTER TABLE "events" ADD CONSTRAINT events_start_time_end_time_check CHECK ("start_time" < "end_time");
ALTER TABLE "agendas" ADD CONSTRAINT agendas_start_time_end_time_check CHECK ("start_time" < "end_time");

-- Insert initial data
INSERT INTO "roles" ("id", "name", "created_at", "updated_at", "deleted_at") VALUES
(1, 'admin', '2026-03-02 16:55:10.048', '2026-03-02 16:55:10.048', NULL),
(2, 'administrator', '2026-03-02 16:55:10.053', '2026-03-02 16:55:10.053', NULL),
(3, 'user', '2026-03-02 16:55:10.062', '2026-03-02 16:55:10.062', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO "permissions" ("id", "name", "type", "description", "created_at", "updated_at", "deleted_at") VALUES
(1, 'CREATE_ROLE', 'CREATE', NULL, '2026-03-02 16:55:09.904', '2026-03-02 16:55:09.904', NULL),
(2, 'READ_ROLES', 'READ', NULL, '2026-03-02 16:55:09.911', '2026-03-02 16:55:09.911', NULL),
(3, 'UPDATE_ROLE', 'UPDATE', NULL, '2026-03-02 16:55:09.916', '2026-03-02 16:55:09.916', NULL),
(4, 'DELETE_ROLE', 'DELETE', NULL, '2026-03-02 16:55:09.922', '2026-03-02 16:55:09.922', NULL),
(5, 'CREATE_PERMISSION', 'CREATE', NULL, '2026-03-02 16:55:09.928', '2026-03-02 16:55:09.928', NULL),
(6, 'READ_PERMISSIONS', 'READ', NULL, '2026-03-02 16:55:09.933', '2026-03-02 16:55:09.933', NULL),
(7, 'ASSIGN_PERMISSION_TO_ROLE', 'CREATE', NULL, '2026-03-02 16:55:09.938', '2026-03-02 16:55:09.938', NULL),
(8, 'CREATE_SITE', 'CREATE', NULL, '2026-03-02 16:55:09.944', '2026-03-02 16:55:09.944', NULL),
(9, 'READ_SITES', 'READ', NULL, '2026-03-02 16:55:09.949', '2026-03-02 16:55:09.949', NULL),
(10, 'UPDATE_SITE', 'UPDATE', NULL, '2026-03-02 16:55:09.954', '2026-03-02 16:55:09.954', NULL),
(11, 'DELETE_SITE', 'DELETE', NULL, '2026-03-02 16:55:09.959', '2026-03-02 16:55:09.959', NULL),
(12, 'CREATE_EVENT', 'CREATE', NULL, '2026-03-02 16:55:09.964', '2026-03-02 16:55:09.964', NULL),
(13, 'READ_EVENTS', 'READ', NULL, '2026-03-02 16:55:09.968', '2026-03-02 16:55:09.968', NULL),
(14, 'UPDATE_EVENT', 'UPDATE', NULL, '2026-03-02 16:55:09.974', '2026-03-02 16:55:09.974', NULL),
(15, 'DELETE_EVENT', 'DELETE', NULL, '2026-03-02 16:55:09.978', '2026-03-02 16:55:09.978', NULL),
(16, 'CREATE_AGENDA', 'CREATE', NULL, '2026-03-02 16:55:09.983', '2026-03-02 16:55:09.983', NULL),
(17, 'READ_AGENDAS', 'READ', NULL, '2026-03-02 16:55:09.988', '2026-03-02 16:55:09.988', NULL),
(18, 'UPDATE_AGENDA', 'UPDATE', NULL, '2026-03-02 16:55:09.993', '2026-03-02 16:55:09.993', NULL),
(19, 'DELETE_AGENDA', 'DELETE', NULL, '2026-03-02 16:55:09.997', '2026-03-02 16:55:09.997', NULL),
(20, 'CREATE_TICKET', 'CREATE', NULL, '2026-03-02 16:55:10.002', '2026-03-02 16:55:10.002', NULL),
(21, 'READ_TICKETS', 'READ', NULL, '2026-03-02 16:55:10.006', '2026-03-02 16:55:10.006', NULL),
(22, 'VALIDATE_TICKET', 'UPDATE', NULL, '2026-03-02 16:55:10.01', '2026-03-02 16:55:10.01', NULL),
(23, 'CREATE_NOTIFICATION', 'CREATE', NULL, '2026-03-02 16:55:10.015', '2026-03-02 16:55:10.015', NULL),
(24, 'READ_NOTIFICATIONS', 'READ', NULL, '2026-03-02 16:55:10.02', '2026-03-02 16:55:10.02', NULL),
(25, 'UPDATE_NOTIFICATION', 'UPDATE', NULL, '2026-03-02 16:55:10.025', '2026-03-02 16:55:10.025', NULL),
(26, 'CREATE_SURVEY', 'CREATE', NULL, '2026-03-02 16:55:10.029', '2026-03-02 16:55:10.029', NULL),
(27, 'READ_SURVEYS', 'READ', NULL, '2026-03-02 16:55:10.034', '2026-03-02 16:55:10.034', NULL),
(28, 'CREATE_SURVEY_RESPONSE', 'CREATE', NULL, '2026-03-02 16:55:10.039', '2026-03-02 16:55:10.039', NULL),
(29, 'READ_SURVEY_RESPONSES', 'READ', NULL, '2026-03-02 16:55:10.044', '2026-03-02 16:55:10.044', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO "role_permissions" ("id", "role_id", "permission_id") VALUES
(1, 2, 1), (2, 2, 2), (3, 2, 3), (4, 2, 4), (5, 2, 5), (6, 2, 6), (7, 2, 7), (8, 2, 8),
(9, 2, 9), (10, 2, 10), (11, 2, 11), (12, 2, 12), (13, 2, 13), (14, 2, 14), (15, 2, 15), (16, 2, 16),
(17, 2, 17), (18, 2, 18), (19, 2, 19), (20, 2, 20), (21, 2, 21), (22, 2, 22), (23, 2, 23), (24, 2, 24),
(25, 2, 25), (26, 2, 26), (27, 2, 27), (28, 2, 28), (29, 2, 29)
ON CONFLICT DO NOTHING;

INSERT INTO "users" ("id", "name", "email", "password", "roleId", "status", "created_at", "updated_at", "deleted_at") VALUES
(1, 'Admin', 'admin@email.com', '$2a$10$wMNjEDMffmq42qSmdcRUzeyrC7S.R4u2mvwZPxvT/JSCunirKyq46', 1, 'ACTIVE', '2026-03-02 16:55:10.160', '2026-03-02 16:55:10.160', NULL),
(2, 'Administrator', 'administrator@email.com', '$2a$10$wMNjEDMffmq42qSmdcRUzeyrC7S.R4u2mvwZPxvT/JSCunirKyq46', 2, 'ACTIVE', '2026-03-02 16:55:10.166', '2026-03-02 16:55:10.166', NULL),
(3, 'William Bonilla', 'wsbonilladiaz@gmail.com', '$2a$10$wMNjEDMffmq42qSmdcRUzeyrC7S.R4u2mvwZPxvT/JSCunirKyq46', 3, 'ACTIVE', '2026-03-02 16:55:10.172', '2026-03-02 16:55:10.172', NULL)
ON CONFLICT DO NOTHING;