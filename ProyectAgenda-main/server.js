require("dotenv").config();
const app = require("./src/app");
const { connectWithRetry } = require("./src/config/prisma/prisma");

connectWithRetry()
    .then(() => {
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Servidor corriendo en http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error("No se pudo iniciar el servidor:", error.message);
        process.exit(1);
    });