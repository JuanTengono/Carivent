require("dotenv").config();

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@email.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "123456";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function callApi(path, { method = "GET", token, body, expectFailure = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  const success = response.ok && payload?.success !== false;

  if (!expectFailure && !success) {
    throw new Error(`${method} ${path} failed -> ${payload?.message || response.status}`);
  }

  if (expectFailure && success) {
    throw new Error(`${method} ${path} expected failure but succeeded`);
  }

  return payload;
}

function futureIso(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

async function runIteration(iteration, token, adminUserId) {
  const unique = `${Date.now()}-${iteration}`;

  const site = await callApi("/api/v1/sites/create-site", {
    method: "POST",
    token,
    body: {
      name: `Site Stress ${unique}`,
      ubication: "Bogota",
      direction: "Zona Norte",
      phone: `3${String(Date.now()).slice(-9)}`,
      email: `stress.site.${unique}@mail.com`,
      capacity: 2,
    },
  });

  const siteId = site?.data?.id;
  assert(siteId, "Site ID no retornado");

  const event = await callApi("/api/v1/events/create-event", {
    method: "POST",
    token,
    body: {
      name: `Event Stress ${unique}`,
      type: "PUBLIC",
      description: "Evento de pruebas intensivas para modulo 3 y 4",
      startTime: futureIso(2),
      endTime: futureIso(4),
      siteId,
    },
  });

  const eventId = event?.data?.id;
  assert(eventId, "Event ID no retornado");

  await callApi(`/api/v1/events/update-event/${eventId}`, {
    method: "PUT",
    token,
    body: {
      name: `Event Stress ${unique}`,
      type: "PUBLIC",
      status: "CONFIRMED",
      description: "Evento de pruebas intensivas para modulo 3 y 4",
      startTime: futureIso(2),
      endTime: futureIso(4),
      siteId,
    },
  });

  await callApi("/api/v1/agendas/create-agenda", {
    method: "POST",
    token,
    body: {
      activity: "Apertura",
      startTime: futureIso(2),
      endTime: futureIso(3),
      eventId,
    },
  });

  const ticket = await callApi("/api/v1/tickets/create-ticket", {
    method: "POST",
    token,
    body: { eventId },
  });

  const codeQr = ticket?.data?.codeQr;
  assert(codeQr, "Ticket QR no retornado");

  await callApi("/api/v1/tickets/create-ticket", {
    method: "POST",
    token,
    body: { eventId },
    expectFailure: true,
  });

  await callApi(`/api/v1/tickets/validate-ticket/${encodeURIComponent(codeQr)}`, {
    method: "PUT",
    token,
  });

  await callApi(`/api/v1/tickets/validate-ticket/${encodeURIComponent(codeQr)}`, {
    method: "PUT",
    token,
    expectFailure: true,
  });

  const notification = await callApi("/api/v1/notifications/create-notification", {
    method: "POST",
    token,
    body: {
      title: `Notificacion Stress ${unique}`,
      message: "Mensaje de prueba para modulo 4",
      userId: adminUserId,
    },
  });

  const notificationId = notification?.data?.id;
  assert(notificationId, "Notification ID no retornado");

  await callApi(`/api/v1/notifications/mark-notification-as-read/${notificationId}`, {
    method: "PUT",
    token,
  });

  const survey = await callApi("/api/v1/surveys/create-survey", {
    method: "POST",
    token,
    body: {
      titleSurvey: `Encuesta Stress ${unique}`,
      eventId,
    },
  });

  const surveyId = survey?.data?.id;
  assert(surveyId, "Survey ID no retornado");

  await callApi("/api/v1/surveys/create-survey", {
    method: "POST",
    token,
    body: {
      titleSurvey: `Encuesta Duplicada ${unique}`,
      eventId,
    },
    expectFailure: true,
  });

  await callApi("/api/v1/surveys/create-survey-response", {
    method: "POST",
    token,
    body: {
      surveyId,
      stars: 5,
      comment: "Excelente",
    },
  });

  await callApi("/api/v1/surveys/create-survey-response", {
    method: "POST",
    token,
    body: {
      surveyId,
      stars: 4,
      comment: "Duplicada",
    },
    expectFailure: true,
  });

  const listTickets = await callApi("/api/v1/tickets/get-tickets", { method: "GET", token });
  const listNotifications = await callApi("/api/v1/notifications/get-notifications", { method: "GET", token });
  const listSurveys = await callApi("/api/v1/surveys/get-surveys", { method: "GET", token });
  const listResponses = await callApi("/api/v1/surveys/get-survey-responses", { method: "GET", token });

  assert(Array.isArray(listTickets?.data?.data), "Listado tickets inválido");
  assert(Array.isArray(listNotifications?.data?.data), "Listado notificaciones inválido");
  assert(Array.isArray(listSurveys?.data?.data), "Listado encuestas inválido");
  assert(Array.isArray(listResponses?.data?.data), "Listado respuestas inválido");

  return {
    eventId,
    siteId,
    surveyId,
    ticketQr: codeQr,
  };
}

async function main() {
  console.log("🧪 Pruebas intensivas módulos 3 y 4...");
  console.log(`🌐 BASE_URL: ${BASE_URL}`);

  const login = await callApi("/api/v1/auth/login", {
    method: "POST",
    body: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    },
  });

  const token = login?.data?.token;
  const adminUserId = login?.data?.user?.id;

  assert(token, "Token no obtenido");
  assert(adminUserId, "Usuario admin no obtenido");

  const rounds = 3;
  const results = [];

  for (let i = 1; i <= rounds; i++) {
    const res = await runIteration(i, token, adminUserId);
    results.push(res);
    console.log(`✅ Iteración ${i}/${rounds} OK (eventId=${res.eventId}, surveyId=${res.surveyId})`);
  }

  console.log("\n🎉 Pruebas intensivas completadas correctamente");
  console.log(`📌 Iteraciones exitosas: ${results.length}`);
}

main().catch((error) => {
  console.error("\n❌ Falló la prueba intensiva:");
  console.error(error.message || error);
  process.exit(1);
});
