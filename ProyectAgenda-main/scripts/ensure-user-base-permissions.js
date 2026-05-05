require("dotenv").config();
const { patchDatabaseUrlForHostExecution } = require("./lib/database-url");
patchDatabaseUrlForHostExecution();

const { PrismaClient } = require("@prisma/client");
const { ensureUserBasePermissions } = require("./lib/user-base-permissions");

const prisma = new PrismaClient();

async function main() {
    const result = await ensureUserBasePermissions(prisma);
    console.log("Permisos base del rol user aplicados correctamente:");
    console.log(result);
}

main()
    .catch((error) => {
        console.error("Error al garantizar permisos base del rol user:");
        console.error(error.message || error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
