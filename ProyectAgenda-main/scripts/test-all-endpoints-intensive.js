require("dotenv").config();

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@email.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "123456";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function callApi(path, { method = "GET", token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  const success = response.ok && payload?.success !== false;

  if (!success) {
    throw new Error(`${method} ${path} -> ${payload?.message || response.status}`);
  }

  return payload;
}

function futureIso(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

async function main() {
  console.log("🧪 Prueba intensiva total de endpoints...");
  console.log(`🌐 BASE_URL: ${BASE_URL}`);

  await callApi("/", { method: "GET" });

  const unique = Date.now();
  const registerEmail = `e2e.user.${unique}@mail.com`;

  await callApi("/api/v1/auth/register", {
    method: "POST",
    body: {
      name: `E2E User ${unique}`,
      email: registerEmail,
      password: "12345678",
    },
  });

  await callApi("/api/v1/auth/login", {
    method: "POST",
    body: {
      email: registerEmail,
      password: "12345678",
    },
  });

  const adminLogin = await callApi("/api/v1/auth/login", {
    method: "POST",
    body: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    },
  });

  const token = adminLogin?.data?.token;
  const adminUserId = adminLogin?.data?.user?.id;

  assert(token, "No se obtuvo token admin");
  assert(adminUserId, "No se obtuvo userId admin");

  const perms = await callApi("/api/v1/security/get-permissions", { method: "GET", token });
  const roles = await callApi("/api/v1/security/get-roles", { method: "GET", token });
  assert(Array.isArray(perms?.data?.data), "Permisos inválidos");
  assert(Array.isArray(roles?.data?.data), "Roles inválidos");

  const newRole = await callApi("/api/v1/security/store-role", {
    method: "POST",
    token,
    body: { name: `role-e2e-${unique}` },
  });
  const roleId = newRole?.data?.id;
  assert(roleId, "No se obtuvo roleId");

  await callApi(`/api/v1/security/update-role/${roleId}`, {
    method: "PUT",
    token,
    body: { name: `role-e2e-upd-${unique}` },
  });

  const newPermission = await callApi("/api/v1/security/create-permission", {
    method: "POST",
    token,
    body: {
      name: `READ_E2E_${unique}`,
      type: "READ",
    },
  });
  const newPermissionId = newPermission?.data?.id;
  assert(newPermissionId, "No se obtuvo permissionId");

  await callApi("/api/v1/security/assign-permission-to-role", {
    method: "POST",
    token,
    body: {
      roleId,
      permissionIds: [newPermissionId],
    },
  });

  const createdSite = await callApi("/api/v1/sites/create-site", {
    method: "POST",
    token,
    body: {
      name: `Site E2E ${unique}`,
      ubication: "Bogotá",
      direction: "Calle 10 # 20-30",
      phone: `3${String(unique).slice(-9)}`,
      email: `site.${unique}@mail.com`,
      capacity: 10,
    },
  });
  const siteId = createdSite?.data?.id;
  assert(siteId, "No se obtuvo siteId");

  await callApi("/api/v1/sites/get-sites", { method: "GET", token });

  await callApi(`/api/v1/sites/update-site/${siteId}`, {
    method: "PUT",
    token,
    body: {
      name: `Site E2E Updated ${unique}`,
      ubication: "Bogotá",
      direction: "Calle 11 # 21-31",
      phone: `3${String(unique + 1).slice(-9)}`,
      email: `site.updated.${unique}@mail.com`,
      capacity: 20,
      status: "ACTIVE",
    },
  });

  const createdEvent = await callApi("/api/v1/events/create-event", {
    method: "POST",
    token,
    body: {
      name: `Event E2E ${unique}`,
      type: "PUBLIC",
      description: "Evento E2E",
      startTime: futureIso(3),
      endTime: futureIso(5),
      siteId,
    },
  });
  const eventId = createdEvent?.data?.id;
  assert(eventId, "No se obtuvo eventId");

  await callApi("/api/v1/events/get-events", { method: "GET", token });

  await callApi(`/api/v1/events/update-event/${eventId}`, {
    method: "PUT",
    token,
    body: {
      name: `Event E2E Updated ${unique}`,
      status: "CONFIRMED",
      type: "PUBLIC",
      description: "Evento E2E actualizado",
      startTime: futureIso(3),
      endTime: futureIso(5),
      siteId,
    },
  });

  const createdAgenda = await callApi("/api/v1/agendas/create-agenda", {
    method: "POST",
    token,
    body: {
      activity: "Registro asistentes",
      startTime: futureIso(3),
      endTime: futureIso(4),
      eventId,
    },
  });
  const agendaId = createdAgenda?.data?.id;
  assert(agendaId, "No se obtuvo agendaId");

  await callApi(`/api/v1/agendas/update-agenda/${agendaId}`, {
    method: "PUT",
    token,
    body: {
      activity: "Registro y bienvenida",
      startTime: futureIso(3),
      endTime: futureIso(4),
      eventId,
      status: "CONFIRMED",
    },
  });

  const createdTicket = await callApi("/api/v1/tickets/create-ticket", {
    method: "POST",
    token,
    body: { eventId },
  });
  const codeQr = createdTicket?.data?.codeQr;
  assert(codeQr, "No se obtuvo codeQr");

  await callApi("/api/v1/tickets/get-tickets", { method: "GET", token });

  await callApi(`/api/v1/tickets/validate-ticket/${encodeURIComponent(codeQr)}`, {
    method: "PUT",
    token,
  });

  const createdNotification = await callApi("/api/v1/notifications/create-notification", {
    method: "POST",
    token,
    body: {
      title: `Notificación E2E ${unique}`,
      message: "Mensaje E2E",
      userId: adminUserId,
    },
  });
  const notificationId = createdNotification?.data?.id;
  assert(notificationId, "No se obtuvo notificationId");

  await callApi("/api/v1/notifications/get-notifications", { method: "GET", token });

  await callApi(`/api/v1/notifications/mark-notification-as-read/${notificationId}`, {
    method: "PUT",
    token,
  });

  const createdSurvey = await callApi("/api/v1/surveys/create-survey", {
    method: "POST",
    token,
    body: {
      titleSurvey: `Encuesta E2E ${unique}`,
      eventId,
    },
  });
  const surveyId = createdSurvey?.data?.id;
  assert(surveyId, "No se obtuvo surveyId");

  await callApi("/api/v1/surveys/get-surveys", { method: "GET", token });

  await callApi("/api/v1/surveys/create-survey-response", {
    method: "POST",
    token,
    body: {
      surveyId,
      stars: 5,
      comment: "Excelente",
    },
  });

  await callApi("/api/v1/surveys/get-survey-responses", { method: "GET", token });

  await callApi(`/api/v1/agendas/delete-agenda/${agendaId}`, {
    method: "DELETE",
    token,
  });

  await callApi(`/api/v1/events/delete-event/${eventId}`, {
    method: "DELETE",
    token,
  });

  await callApi(`/api/v1/sites/delete-site/${siteId}`, {
    method: "DELETE",
    token,
  });

  await callApi(`/api/v1/security/delete-role/${roleId}`, {
    method: "DELETE",
    token,
  });

  await callApi("/api/v1/auth/logout", {
    method: "POST",
    token,
    body: { token },
  });

  console.log("✅ Todos los endpoints fueron probados correctamente (sin excepción)");
}

main().catch((error) => {
  console.error("\n❌ Falló prueba total de endpoints:");
  console.error(error.message || error);
  process.exit(1);
});
