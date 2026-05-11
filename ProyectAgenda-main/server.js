require("dotenv").config();
const app = require("./src/app");
const { connectWithRetry } = require("./src/config/prisma/prisma");

const DEFAULT_PORT = 3001;
const MAX_PORT_ATTEMPTS = 10;

function startServer(initialPort) {
    const port = Number(initialPort) || DEFAULT_PORT;
    let attempts = 0;

    const tryListen = (targetPort) => {
        const server = app.listen(targetPort, () => {
            console.log(`Servidor corriendo en http://localhost:${targetPort}`);
        });

        server.on("error", (error) => {
            if (error.code === "EADDRINUSE" && attempts < MAX_PORT_ATTEMPTS) {
                attempts += 1;
                const nextPort = targetPort + 1;
                console.warn(
                    `Puerto ${targetPort} en uso. Reintentando con el puerto ${nextPort}...`
                );
                return tryListen(nextPort);
            }

            console.error("No se pudo iniciar el servidor:", error.message);
            process.exit(1);
        });
    };

    tryListen(port);
}

connectWithRetry()
    .then(() => {
        startServer(process.env.PORT);
    })
    .catch((error) => {
        console.error("No se pudo iniciar el servidor:", error.message);
        process.exit(1);
    });
