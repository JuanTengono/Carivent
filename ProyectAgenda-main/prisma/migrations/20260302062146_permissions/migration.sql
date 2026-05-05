-- CreateEnum
CREATE TYPE "TypePermission" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TypePermission" NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_type_deleted_at_key" ON "permissions"("name", "type") WHERE "deleted_at" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Función que bloquea cambios en los permisos
CREATE OR REPLACE FUNCTION prevent_permission_update()
RETURNS trigger AS $$
BEGIN
  IF NEW.name <> OLD.name OR NEW.type <> OLD.type THEN
    RAISE EXCEPTION 'El campo nombre o tipo no puede modificarse';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER no_update_permission
BEFORE UPDATE ON "permissions"
FOR EACH ROW
EXECUTE FUNCTION prevent_permission_update();

-- Función que bloquea eliminación de permisos
CREATE OR REPLACE FUNCTION prevent_permission_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'El permiso no puede eliminarse';
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER no_delete_permission
BEFORE DELETE ON "permissions"
FOR EACH ROW
EXECUTE FUNCTION prevent_permission_delete();