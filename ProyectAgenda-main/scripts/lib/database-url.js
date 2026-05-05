const fs = require("fs");

function patchDatabaseUrlForHostExecution() {
    let databaseUrl = process.env.DATABASE_URL || "";
    const isRunningInDocker = fs.existsSync("/.dockerenv");

    if (isRunningInDocker) return;

    if (process.env.DB_HOST === "db") {
        process.env.DB_HOST = "localhost";
    }

    databaseUrl = databaseUrl.replace(/\$\{([A-Z0-9_]+)\}/g, (_, envName) => {
        return process.env[envName] || "";
    });

    if (databaseUrl.includes("@db:")) {
        databaseUrl = databaseUrl.replace("@db:", "@localhost:");
    }

    process.env.DATABASE_URL = databaseUrl;
}

module.exports = {
    patchDatabaseUrlForHostExecution,
};
