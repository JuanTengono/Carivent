-- Adminer 5.4.2 PostgreSQL 16.13 dump

DROP TABLE IF EXISTS "_prisma_migrations";
CREATE TABLE "public"."_prisma_migrations" (
    "id" character varying(36) NOT NULL,
    "checksum" character varying(64) NOT NULL,
    "finished_at" timestamptz,
    "migration_name" character varying(255) NOT NULL,
    "logs" text,
    "rolled_back_at" timestamptz,
    "started_at" timestamptz DEFAULT now() NOT NULL,
    "applied_steps_count" integer DEFAULT '0' NOT NULL,
    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);

INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count") VALUES
('3efef4c5-594b-4dae-904d-2d46b8c49807',	'402c8fad44ffa889a94fd0da1cf28fcf77a64c4c0307a9adfa7e6485f74825f9',	'2026-03-02 16:48:27.905726+00',	'20260302051617_init',	NULL,	NULL,	'2026-03-02 16:48:27.844448+00',	1),
('421e5b2e-3577-43ed-8304-b8c648da35c7',	'96d9338ede9ac0d6910668aca7bfe9b53d1cc33f09f72af62f4f3602ba31ee30',	'2026-03-02 16:48:27.918433+00',	'20260302055146_rename_user_id',	NULL,	NULL,	'2026-03-02 16:48:27.908643+00',	1),
('53e18318-4c30-40e8-928d-8b279a2b26c1',	'255751f32a778d6b0cfd1088e8b724ca72630d2975642c3ff4f0c50f6a95afe0',	'2026-03-02 16:48:27.955857+00',	'20260302062146_permissions',	NULL,	NULL,	'2026-03-02 16:48:27.920978+00',	1),
('a5a161e1-ab47-4715-90d1-af3a238032e0',	'df8f8dfe08ddfdb4c07da8bfcb918289bdab17fcacc6256b3e38b2bf75a0fc79',	'2026-03-02 16:48:27.97794+00',	'20260302082806_sities',	NULL,	NULL,	'2026-03-02 16:48:27.958617+00',	1),
('5d6ca17c-a9e5-472d-80f1-133063927550',	'41565488b3c1d34b7a1a4bc6ec39b9f513eb811c29e9514698a6383f9ed1e5df',	'2026-03-02 16:48:27.999166+00',	'20260302093552_events',	NULL,	NULL,	'2026-03-02 16:48:27.980676+00',	1),
('00aa450b-7375-493a-a16c-accfe25c5472',	'0dd40436e18d3f00a5d32c9baf13c077ac6ed256688830f53c40a8f196f9626a',	'2026-03-02 16:48:28.021673+00',	'20260302103931_agendas',	NULL,	NULL,	'2026-03-02 16:48:28.001723+00',	1),
('24114176-f9a6-4eee-9471-cbb2cf3bbf3c',	'16da6366c44dbcee8efee87fd8bef8cd0b18089d38d2d1eccde1126e1517e685',	'2026-03-02 16:48:28.079297+00',	'20260302120000_module3_module4_swagger',	NULL,	NULL,	'2026-03-02 16:48:28.024356+00',	1);

DROP TABLE IF EXISTS "agendas";
DROP SEQUENCE IF EXISTS "public".agendas_id_seq;
CREATE SEQUENCE "public".agendas_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."agendas" (
    "id" integer DEFAULT nextval('agendas_id_seq') NOT NULL,
    "activity" text NOT NULL,
    "event_id" integer NOT NULL,
    "start_time" timestamp(3) NOT NULL,
    "end_time" timestamp(3) NOT NULL,
    "status" "StatusAgenda" DEFAULT PENDING NOT NULL,
    "created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) NOT NULL,
    "deleted_at" timestamp(3),
    CONSTRAINT "agendas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "agendas_start_time_end_time_check" CHECK (((start_time < end_time)))
)
WITH (oids = false);


DROP TABLE IF EXISTS "events";
DROP SEQUENCE IF EXISTS "public".events_id_seq;
CREATE SEQUENCE "public".events_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."events" (
    "id" integer DEFAULT nextval('events_id_seq') NOT NULL,
    "name" text NOT NULL,
    "type" "TypeEvent" NOT NULL,
    "status" "StatusEvent" DEFAULT PENDING NOT NULL,
    "description" text,
    "start_time" timestamp(3) NOT NULL,
    "end_time" timestamp(3) NOT NULL,
    "site_id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) NOT NULL,
    "deleted_at" timestamp(3),
    CONSTRAINT "events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "events_start_time_end_time_check" CHECK (((start_time < end_time)))
)
WITH (oids = false);


DROP TABLE IF EXISTS "notifications";
DROP SEQUENCE IF EXISTS "public".notifications_id_seq;
CREATE SEQUENCE "public".notifications_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."notifications" (
    "id" integer DEFAULT nextval('notifications_id_seq') NOT NULL,
    "title" text NOT NULL,
    "message" text NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "user_id" integer NOT NULL,
    "created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) NOT NULL,
    "deleted_at" timestamp(3),
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);


DROP TABLE IF EXISTS "permissions";
DROP SEQUENCE IF EXISTS "public".permissions_id_seq;
CREATE SEQUENCE "public".permissions_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."permissions" (
    "id" integer DEFAULT nextval('permissions_id_seq') NOT NULL,
    "name" text NOT NULL,
    "type" "TypePermission" NOT NULL,
    "description" text,
    "created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) NOT NULL,
    "deleted_at" timestamp(3),
    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);

CREATE UNIQUE INDEX permissions_name_type_deleted_at_key ON public.permissions USING btree (name, type) WHERE (deleted_at IS NULL);

INSERT INTO "permissions" ("id", "name", "type", "description", "created_at", "updated_at", "deleted_at") VALUES
(1,	'CREATE_ROLE',	'CREATE',	NULL,	'2026-03-02 16:55:09.904',	'2026-03-02 16:55:09.904',	NULL),
(2,	'READ_ROLES',	'READ',	NULL,	'2026-03-02 16:55:09.911',	'2026-03-02 16:55:09.911',	NULL),
(3,	'UPDATE_ROLE',	'UPDATE',	NULL,	'2026-03-02 16:55:09.916',	'2026-03-02 16:55:09.916',	NULL),
(4,	'DELETE_ROLE',	'DELETE',	NULL,	'2026-03-02 16:55:09.922',	'2026-03-02 16:55:09.922',	NULL),
(5,	'CREATE_PERMISSION',	'CREATE',	NULL,	'2026-03-02 16:55:09.928',	'2026-03-02 16:55:09.928',	NULL),
(6,	'READ_PERMISSIONS',	'READ',	NULL,	'2026-03-02 16:55:09.933',	'2026-03-02 16:55:09.933',	NULL),
(7,	'ASSIGN_PERMISSION_TO_ROLE',	'CREATE',	NULL,	'2026-03-02 16:55:09.938',	'2026-03-02 16:55:09.938',	NULL),
(8,	'CREATE_SITE',	'CREATE',	NULL,	'2026-03-02 16:55:09.944',	'2026-03-02 16:55:09.944',	NULL),
(9,	'READ_SITES',	'READ',	NULL,	'2026-03-02 16:55:09.949',	'2026-03-02 16:55:09.949',	NULL),
(10,	'UPDATE_SITE',	'UPDATE',	NULL,	'2026-03-02 16:55:09.954',	'2026-03-02 16:55:09.954',	NULL),
(11,	'DELETE_SITE',	'DELETE',	NULL,	'2026-03-02 16:55:09.959',	'2026-03-02 16:55:09.959',	NULL),
(12,	'CREATE_EVENT',	'CREATE',	NULL,	'2026-03-02 16:55:09.964',	'2026-03-02 16:55:09.964',	NULL),
(13,	'READ_EVENTS',	'READ',	NULL,	'2026-03-02 16:55:09.968',	'2026-03-02 16:55:09.968',	NULL),
(14,	'UPDATE_EVENT',	'UPDATE',	NULL,	'2026-03-02 16:55:09.974',	'2026-03-02 16:55:09.974',	NULL),
(15,	'DELETE_EVENT',	'DELETE',	NULL,	'2026-03-02 16:55:09.978',	'2026-03-02 16:55:09.978',	NULL),
(16,	'CREATE_AGENDA',	'CREATE',	NULL,	'2026-03-02 16:55:09.983',	'2026-03-02 16:55:09.983',	NULL),
(17,	'UPDATE_AGENDA',	'UPDATE',	NULL,	'2026-03-02 16:55:09.988',	'2026-03-02 16:55:09.988',	NULL),
(18,	'DELETE_AGENDA',	'DELETE',	NULL,	'2026-03-02 16:55:09.993',	'2026-03-02 16:55:09.993',	NULL),
(19,	'CREATE_TICKET',	'CREATE',	NULL,	'2026-03-02 16:55:09.997',	'2026-03-02 16:55:09.997',	NULL),
(20,	'READ_TICKETS',	'READ',	NULL,	'2026-03-02 16:55:10.002',	'2026-03-02 16:55:10.002',	NULL),
(21,	'VALIDATE_TICKET',	'UPDATE',	NULL,	'2026-03-02 16:55:10.006',	'2026-03-02 16:55:10.006',	NULL),
(22,	'CREATE_NOTIFICATION',	'CREATE',	NULL,	'2026-03-02 16:55:10.01',	'2026-03-02 16:55:10.01',	NULL),
(23,	'READ_NOTIFICATIONS',	'READ',	NULL,	'2026-03-02 16:55:10.015',	'2026-03-02 16:55:10.015',	NULL),
(24,	'UPDATE_NOTIFICATION',	'UPDATE',	NULL,	'2026-03-02 16:55:10.02',	'2026-03-02 16:55:10.02',	NULL),
(25,	'CREATE_SURVEY',	'CREATE',	NULL,	'2026-03-02 16:55:10.025',	'2026-03-02 16:55:10.025',	NULL),
(26,	'READ_SURVEYS',	'READ',	NULL,	'2026-03-02 16:55:10.029',	'2026-03-02 16:55:10.029',	NULL),
(27,	'CREATE_SURVEY_RESPONSE',	'CREATE',	NULL,	'2026-03-02 16:55:10.034',	'2026-03-02 16:55:10.034',	NULL),
(28,	'READ_SURVEY_RESPONSES',	'READ',	NULL,	'2026-03-02 16:55:10.039',	'2026-03-02 16:55:10.039',	NULL);

DELIMITER ;;

CREATE TRIGGER "no_delete_permission" BEFORE DELETE ON "public"."permissions" FOR EACH ROW EXECUTE FUNCTION prevent_permission_delete();;

CREATE TRIGGER "no_update_permission" BEFORE UPDATE ON "public"."permissions" FOR EACH ROW EXECUTE FUNCTION prevent_permission_update();;

DELIMITER ;

DROP TABLE IF EXISTS "role_permissions";
DROP SEQUENCE IF EXISTS "public".role_permissions_id_seq;
CREATE SEQUENCE "public".role_permissions_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."role_permissions" (
    "id" integer DEFAULT nextval('role_permissions_id_seq') NOT NULL,
    "role_id" integer NOT NULL,
    "permission_id" integer NOT NULL,
    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);

CREATE UNIQUE INDEX role_permissions_role_id_permission_id_key ON public.role_permissions USING btree (role_id, permission_id);

INSERT INTO "role_permissions" ("id", "role_id", "permission_id") VALUES
(1,	2,	1),
(2,	2,	2),
(3,	2,	3),
(4,	2,	4),
(5,	2,	5),
(6,	2,	6),
(7,	2,	7),
(8,	2,	8),
(9,	2,	9),
(10,	2,	10),
(11,	2,	11),
(12,	2,	12),
(13,	2,	13),
(14,	2,	14),
(15,	2,	15),
(16,	2,	16),
(17,	2,	17),
(18,	2,	18),
(19,	2,	19),
(20,	2,	20),
(21,	2,	21),
(22,	2,	22),
(23,	2,	23),
(24,	2,	24),
(25,	2,	25),
(26,	2,	26),
(27,	2,	27),
(28,	2,	28);

DROP TABLE IF EXISTS "roles";
DROP SEQUENCE IF EXISTS "public".roles_id_seq;
CREATE SEQUENCE "public".roles_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."roles" (
    "id" integer DEFAULT nextval('roles_id_seq') NOT NULL,
    "name" text NOT NULL,
    "created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) NOT NULL,
    "deleted_at" timestamp(3),
    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);

CREATE UNIQUE INDEX roles_name_deleted_at_key ON public.roles USING btree (name) WHERE (deleted_at IS NULL);

INSERT INTO "roles" ("id", "name", "created_at", "updated_at", "deleted_at") VALUES
(1,	'admin',	'2026-03-02 16:55:10.048',	'2026-03-02 16:55:10.048',	NULL),
(2,	'administrator',	'2026-03-02 16:55:10.053',	'2026-03-02 16:55:10.053',	NULL),
(3,	'user',	'2026-03-02 16:55:10.062',	'2026-03-02 16:55:10.062',	NULL);

DROP TABLE IF EXISTS "sites";
DROP SEQUENCE IF EXISTS "public".sites_id_seq;
CREATE SEQUENCE "public".sites_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."sites" (
    "id" integer DEFAULT nextval('sites_id_seq') NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "ubication" text,
    "direction" text,
    "phone" text,
    "email" text,
    "capacity" integer,
    "user_id" integer NOT NULL,
    "status" "StatusSite" DEFAULT ACTIVE NOT NULL,
    "created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) NOT NULL,
    "deleted_at" timestamp(3),
    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);


DROP TABLE IF EXISTS "survey_responses";
DROP SEQUENCE IF EXISTS "public".survey_responses_id_seq;
CREATE SEQUENCE "public".survey_responses_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."survey_responses" (
    "id" integer DEFAULT nextval('survey_responses_id_seq') NOT NULL,
    "survey_id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "stars" integer NOT NULL,
    "comment" text,
    "created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) NOT NULL,
    "deleted_at" timestamp(3),
    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);


DROP TABLE IF EXISTS "surveys";
DROP SEQUENCE IF EXISTS "public".surveys_id_seq;
CREATE SEQUENCE "public".surveys_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."surveys" (
    "id" integer DEFAULT nextval('surveys_id_seq') NOT NULL,
    "title_survey" text NOT NULL,
    "event_id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) NOT NULL,
    "deleted_at" timestamp(3),
    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);


DROP TABLE IF EXISTS "tickets";
DROP SEQUENCE IF EXISTS "public".tickets_id_seq;
CREATE SEQUENCE "public".tickets_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."tickets" (
    "id" integer DEFAULT nextval('tickets_id_seq') NOT NULL,
    "code_qr" text NOT NULL,
    "event_id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "validated" boolean DEFAULT false NOT NULL,
    "validated_at" timestamp(3),
    "status" "StatusTicket" DEFAULT ACTIVE NOT NULL,
    "created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) NOT NULL,
    "deleted_at" timestamp(3),
    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);

CREATE UNIQUE INDEX tickets_code_qr_key ON public.tickets USING btree (code_qr);


DROP TABLE IF EXISTS "tokens_users";
DROP SEQUENCE IF EXISTS "public".tokens_users_id_seq;
CREATE SEQUENCE "public".tokens_users_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."tokens_users" (
    "id" integer DEFAULT nextval('tokens_users_id_seq') NOT NULL,
    "token" text NOT NULL,
    "expiresAt" timestamp(3) NOT NULL,
    "created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) NOT NULL,
    "deleted_at" timestamp(3),
    "user_id" integer NOT NULL,
    CONSTRAINT "tokens_users_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);

CREATE UNIQUE INDEX tokens_users_token_key ON public.tokens_users USING btree (token) WHERE (deleted_at IS NULL);

CREATE UNIQUE INDEX tokens_users_token_deleted_at_key ON public.tokens_users USING btree (token) WHERE (deleted_at IS NULL);

INSERT INTO "tokens_users" ("id", "token", "expiresAt", "created_at", "updated_at", "deleted_at", "user_id") VALUES
(1,	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc3MjQ3MTIwOSwiZXhwIjoxNzcyNDc0ODA5fQ.704brCobSGFCVBt8wl_YUL4k490EED8VtmkHFxExB4c',	'2026-03-02 18:06:49.452',	'2026-03-02 17:06:49.454',	'2026-03-02 17:06:49.454',	NULL,	1),
(2,	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc3MjQ3MTIyOSwiZXhwIjoxNzcyNDc0ODI5fQ.6A4J-LBc_QXHWoyaA_Kr6IsQtM3Fj77ag8NAPvx4xnI',	'2026-03-02 18:07:09.095',	'2026-03-02 17:07:09.096',	'2026-03-02 17:07:09.096',	NULL,	1);

DELIMITER ;;

CREATE TRIGGER "no_update_token" BEFORE UPDATE ON "public"."tokens_users" FOR EACH ROW EXECUTE FUNCTION prevent_token_update();;

DELIMITER ;

DROP TABLE IF EXISTS "users";
DROP SEQUENCE IF EXISTS "public".users_id_seq;
CREATE SEQUENCE "public".users_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."users" (
    "id" integer DEFAULT nextval('users_id_seq') NOT NULL,
    "name" text NOT NULL,
    "email" text NOT NULL,
    "password" text NOT NULL,
    "roleId" integer NOT NULL,
    "status" "StatusUser" DEFAULT ACTIVE NOT NULL,
    "created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) NOT NULL,
    "deleted_at" timestamp(3),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
)
WITH (oids = false);

CREATE UNIQUE INDEX users_email_deleted_at_key ON public.users USING btree (email) WHERE (deleted_at IS NULL);

INSERT INTO "users" ("id", "name", "email", "password", "roleId", "status", "created_at", "updated_at", "deleted_at") VALUES
(1,	'Admin',	'admin@email.com',	'$2a$10$wMNjEDMffmq42qSmdcRUzeyrC7S.R4u2mvwZPxvT/JSCunirKyq46',	1,	'ACTIVE',	'2026-03-02 16:55:10.16',	'2026-03-02 16:55:10.16',	NULL),
(2,	'Administrator',	'administrator@email.com',	'$2a$10$wMNjEDMffmq42qSmdcRUzeyrC7S.R4u2mvwZPxvT/JSCunirKyq46',	2,	'ACTIVE',	'2026-03-02 16:55:10.166',	'2026-03-02 16:55:10.166',	NULL),
(3,	'William Bonilla',	'wsbonilladiaz@gmail.com',	'$2a$10$wMNjEDMffmq42qSmdcRUzeyrC7S.R4u2mvwZPxvT/JSCunirKyq46',	3,	'ACTIVE',	'2026-03-02 16:55:10.172',	'2026-03-02 16:55:10.172',	NULL),
(4,	'Julian',	'julianmonj45@gmail.com',	'$2a$10$exTOOvxIt8Jzt2muDJv5hubf2sMu9RdlDm1jf2Mj4NEhWeTWzahc6',	2,	'ACTIVE',	'2026-03-02 17:25:58.922',	'2026-03-02 17:25:58.922',	NULL);

ALTER TABLE ONLY "public"."agendas" ADD CONSTRAINT "agendas_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."events" ADD CONSTRAINT "events_site_id_fkey" FOREIGN KEY (site_id) REFERENCES sites(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."events" ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY (permission_id) REFERENCES permissions(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY (role_id) REFERENCES roles(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."sites" ADD CONSTRAINT "sites_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."survey_responses" ADD CONSTRAINT "survey_responses_survey_id_fkey" FOREIGN KEY (survey_id) REFERENCES surveys(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."survey_responses" ADD CONSTRAINT "survey_responses_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."surveys" ADD CONSTRAINT "surveys_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."surveys" ADD CONSTRAINT "surveys_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."tickets" ADD CONSTRAINT "tickets_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."tickets" ADD CONSTRAINT "tickets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES roles(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- 2026-03-03 02:19:17 UTC