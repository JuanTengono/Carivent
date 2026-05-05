/**
 * Crea o actualiza usuarios de prueba para desarrollo local.
 * Requiere haber ejecutado antes `npx prisma db seed` (roles y permisos).
 *
 * Credenciales generadas:
 *   Administrador (todas las vistas del panel): admin.demo@carivent.local
 *   Usuario estándar (permisos base):           usuario.demo@carivent.local
 * Contraseña común: CariventDemo1
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SHARED_PASSWORD = "CariventDemo1";

const TEST_USERS = [
  {
    email: "admin.demo@carivent.local",
    name: "Admin Demo",
    roleName: "administrator",
    emailVerified: true,
  },
  {
    email: "usuario.demo@carivent.local",
    name: "Usuario Demo",
    roleName: "user",
    emailVerified: true,
  },
];

async function main() {
  const hash = await bcrypt.hash(SHARED_PASSWORD, 10);

  for (const spec of TEST_USERS) {
    const role = await prisma.roles.findFirst({
      where: { name: spec.roleName, deletedAt: null },
    });

    if (!role) {
      throw new Error(
        `No existe el rol "${spec.roleName}". Ejecuta primero: npx prisma db seed`
      );
    }

    const existing = await prisma.user.findFirst({
      where: { email: spec.email, deletedAt: null },
    });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: spec.name,
          password: hash,
          roleId: role.id,
          status: "ACTIVE",
          emailVerified: spec.emailVerified,
        },
      });
      // eslint-disable-next-line no-console
      console.log(`Actualizado: ${spec.email} (rol: ${spec.roleName})`);
    } else {
      await prisma.user.create({
        data: {
          name: spec.name,
          email: spec.email,
          password: hash,
          roleId: role.id,
          status: "ACTIVE",
          emailVerified: spec.emailVerified,
        },
      });
      // eslint-disable-next-line no-console
      console.log(`Creado: ${spec.email} (rol: ${spec.roleName})`);
    }
  }

  // eslint-disable-next-line no-console
  console.log("\nListo. Contraseña para ambos:", SHARED_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
