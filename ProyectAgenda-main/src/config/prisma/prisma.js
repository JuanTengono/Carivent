const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

async function connectWithRetry(maxRetries = 5, delayMs = 2000) {
    for (let i = 1; i <= maxRetries; i++) {
        try {
            await prisma.$connect();
            console.log(`Prisma conectado a la base de datos (intento ${i}/${maxRetries})`);
            return true;
        } catch (error) {
            console.error(`Prisma intento de conexion ${i}/${maxRetries} fallido:`, error.message);
            if (i === maxRetries) {
                console.error("Prisma agoto todos los intentos de conexion. Verifica que PostgreSQL este corriendo.");
                throw error;
            }
            await new Promise((resolve) => setTimeout(resolve, delayMs * i));
        }
    }
    return false;
}

module.exports = { prisma, connectWithRetry };