require("dotenv").config();

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@email.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "123456";

async function apiRequest(path, method = "GET", body = null, token = null) {
  const headers = { "Content-Type": "application/json" };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    const message = data?.message || `Error HTTP ${response.status}`;
    const details = data?.data ? ` | details: ${JSON.stringify(data.data)}` : "";
    throw new Error(`${method} ${path} -> ${message}${details}`);
  }

  return data;
}

function logStep(step, details = "") {
  const suffix = details ? `: ${details}` : "";
  console.log(`✅ ${step}${suffix}`);
}

async function run() {
  console.log("🚀 Iniciando seed por endpoints (módulos 3 y 4)...");
  console.log(`🌐 BASE_URL: ${BASE_URL}`);

  const login = await apiRequest("/api/v1/auth/login", "POST", {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  const token = login?.data?.token;
  const adminUser = login?.data?.user;

  if (!token || !adminUser?.id) {
    throw new Error("No se obtuvo token o usuario desde login");
  }

  logStep("Login admin", `${adminUser.email}`);

  const unique = Date.now();
  const startTime = new Date(Date.now() + 60 * 60 * 1000);
  const endTime = new Date(Date.now() + 3 * 60 * 60 * 1000);

  const siteBody = {
    name: `Site Seed ${unique}`,
    ubication: "Bogotá",
    direction: "Zona Norte",
    phone: `3${String(unique).slice(-9)}`,
    email: `site${unique}@mail.com`,
    capacity: 300,
  };

  const site = await apiRequest("/api/v1/sites/create-site", "POST", siteBody, token);
  const siteId = site?.data?.id;
  logStep("Sitio creado", `id=${siteId}`);

  const eventBody = {
    name: `Evento Seed ${unique}`,
    type: "PUBLIC",
    description: "Evento para validar módulos 3 y 4",
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    siteId,
  };

  const event = await apiRequest("/api/v1/events/create-event", "POST", eventBody, token);
  const eventId = event?.data?.id;
  logStep("Evento creado", `id=${eventId}`);

  const eventUpdateBody = {
    ...eventBody,
    status: "CONFIRMED",
  };

  await apiRequest(`/api/v1/events/update-event/${eventId}`, "PUT", eventUpdateBody, token);
  logStep("Evento actualizado", "status=CONFIRMED");

  const agendaBody = {
    activity: "Apertura",
    startTime: startTime.toISOString(),
    endTime: new Date(startTime.getTime() + 30 * 60 * 1000).toISOString(),
    eventId,
  };

  await apiRequest("/api/v1/agendas/create-agenda", "POST", agendaBody, token);
  logStep("Agenda creada");

  const ticket = await apiRequest("/api/v1/tickets/create-ticket", "POST", { eventId }, token);
  const codeQr = ticket?.data?.codeQr;
  logStep("Ticket creado", `${codeQr}`);

  await apiRequest(`/api/v1/tickets/validate-ticket/${encodeURIComponent(codeQr)}`, "PUT", null, token);
  logStep("Ticket validado en puerta");

  const notification = await apiRequest("/api/v1/notifications/create-notification", "POST", {
    title: "Notificación Seed",
    message: "Prueba de notificaciones módulo 4",
    userId: adminUser.id,
  }, token);

  const notificationId = notification?.data?.id;
  logStep("Notificación creada", `id=${notificationId}`);

  await apiRequest(`/api/v1/notifications/mark-notification-as-read/${notificationId}`, "PUT", null, token);
  logStep("Notificación marcada como leída", `id=${notificationId}`);

  const survey = await apiRequest("/api/v1/surveys/create-survey", "POST", {
    titleSurvey: `Encuesta Seed ${unique}`,
    eventId,
  }, token);

  const surveyId = survey?.data?.id;
  logStep("Encuesta creada", `id=${surveyId}`);

  await apiRequest("/api/v1/surveys/create-survey-response", "POST", {
    surveyId,
    stars: 5,
    comment: "Todo funcionando correctamente",
  }, token);
  logStep("Respuesta de encuesta creada");

  await apiRequest("/api/v1/tickets/get-tickets", "GET", null, token);
  await apiRequest("/api/v1/notifications/get-notifications", "GET", null, token);
  await apiRequest("/api/v1/surveys/get-surveys", "GET", null, token);
  await apiRequest("/api/v1/surveys/get-survey-responses", "GET", null, token);
  logStep("Consultas de verificación ejecutadas", "tickets + notifications + surveys + responses");

  console.log("\n🎉 Seed por endpoints completado sin errores.");
}

run().catch((error) => {
  console.error("\n❌ Seed por endpoints falló:");
  console.error(error.message || error);
  process.exit(1);
});
