const fs = require("fs");
const path = require("path");

const swagger = require("../src/docs/swagger");

const routeFiles = [
  { file: "auth.routes.js", base: "/api/v1/auth" },
  { file: "security.routes.js", base: "/api/v1/security" },
  { file: "sites.routes.js", base: "/api/v1/sites" },
  { file: "events.routes.js", base: "/api/v1/events" },
  { file: "agendas.routes.js", base: "/api/v1/agendas" },
  { file: "tickets.routes.js", base: "/api/v1/tickets" },
  { file: "notifications.routes.js", base: "/api/v1/notifications" },
  { file: "surveys.routes.js", base: "/api/v1/surveys" },
  { file: "public.routes.js", base: "/api/v1/public" },
  { file: "promotions.routes.js", base: "/api/v1/promotions" },
  { file: "payments.routes.js", base: "/api/v1/payments" },
];

function normPath(p) {
  return p.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, "{$1}");
}

function getCodeEndpoints() {
  const endpoints = new Set(["GET /"]);

  for (const rf of routeFiles) {
    const full = path.join(__dirname, "..", "src", "routes", rf.file);
    const content = fs.readFileSync(full, "utf8");
    const regex = /router\.(get|post|put|delete)\(\s*["'`]([^"'`]+)["'`]/g;
    let match;

    while ((match = regex.exec(content))) {
      const method = match[1].toUpperCase();
      const routePath = match[2];
      endpoints.add(`${method} ${normPath(`${rf.base}${routePath}`)}`);
    }
  }

  return endpoints;
}

function getSwaggerEndpoints() {
  const endpoints = new Set();
  const paths = swagger.paths || {};

  for (const [p, methods] of Object.entries(paths)) {
    for (const method of Object.keys(methods || {})) {
      endpoints.add(`${method.toUpperCase()} ${p}`);
    }
  }

  return endpoints;
}

const codeEndpoints = getCodeEndpoints();
const swaggerEndpoints = getSwaggerEndpoints();

const missingInSwagger = [...codeEndpoints].filter((ep) => !swaggerEndpoints.has(ep));
const extraInSwagger = [...swaggerEndpoints].filter((ep) => !codeEndpoints.has(ep));

console.log(`Code endpoints: ${codeEndpoints.size}`);
console.log(`Swagger endpoints: ${swaggerEndpoints.size}`);
console.log(`Missing in Swagger: ${missingInSwagger.length}`);
console.log(`Extra in Swagger: ${extraInSwagger.length}`);

if (missingInSwagger.length) {
  console.log("\n-- Missing in Swagger --");
  missingInSwagger.forEach((e) => console.log(e));
}

if (extraInSwagger.length) {
  console.log("\n-- Extra in Swagger --");
  extraInSwagger.forEach((e) => console.log(e));
}
