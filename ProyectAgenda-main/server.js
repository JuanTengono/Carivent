require("dotenv").config();
const app = require("./src/app");
const { connectWithRetry } = require("./src/config/prisma/prisma");

connectWithRetry()
    .then(() => {
        app.listen(process.env.PORT, () => {
            console.log(`Servidor corriendo en http://localhost:${process.env.PORT}`);
        });
    })
    .catch((error) => {
        console.error("No se pudo iniciar el servidor:", error.message);
        process.exit(1);
    });