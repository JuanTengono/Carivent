const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const authRoutes = require("./routes/auth.routes");
const publicRoutes = require("./routes/public.routes");
const securityRoutes = require("./routes/security.routes");
const sitesRoutes = require("./routes/sites.routes");
const eventsRoutes = require("./routes/events.routes");
const agendasRoutes = require("./routes/agendas.routes");
const ticketsRoutes = require("./routes/tickets.routes");
const notificationsRoutes = require("./routes/notifications.routes");
const surveysRoutes = require("./routes/surveys.routes");
const promotionsRoutes = require("./routes/promotions.routes");
const paymentsRoutes = require("./routes/payments.routes");
const swaggerSpec = require("./docs/swagger");

const errorMiddleware = require("./middleware/error.middleware");
const { stripeWebhook } = require("./controllers/payments.controller");
const app = express();

function parseCsv(value) {
  return (value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function buildAllowedOrigins() {
  const configured = parseCsv(process.env.FRONTEND_URL);
  const defaults = ["http://localhost:5173"];
  return new Set([...defaults, ...configured]);
}

function buildOriginRegexes() {
  return parseCsv(process.env.FRONTEND_ORIGIN_REGEX)
    .map((pattern) => {
      try {
        return new RegExp(pattern);
      } catch (error) {
        console.warn(`FRONTEND_ORIGIN_REGEX inválido ignorado: ${pattern}`);
        return null;
      }
    })
    .filter(Boolean);
}

const allowedOrigins = buildAllowedOrigins();
const allowedOriginRegexes = buildOriginRegexes();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.post(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "API de eventos" });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/public", publicRoutes);

app.use("/api/v1/security", securityRoutes);

app.use("/api/v1/sites", sitesRoutes);

app.use("/api/v1/events", eventsRoutes);

app.use("/api/v1/agendas", agendasRoutes);

app.use("/api/v1/tickets", ticketsRoutes);

app.use("/api/v1/notifications", notificationsRoutes);

app.use("/api/v1/surveys", surveysRoutes);

app.use("/api/v1/promotions", promotionsRoutes);

app.use("/api/v1/payments", paymentsRoutes);

// 🔥 SIEMPRE EL ÚLTIMO
app.use(errorMiddleware);

module.exports = app;
