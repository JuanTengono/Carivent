require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { patchDatabaseUrlForHostExecution } = require("./lib/database-url");
patchDatabaseUrlForHostExecution();

const { PrismaClient } = require("@prisma/client");
const { USER_BASE_PERMISSION_NAMES, ensureUserBasePermissions } = require("./lib/user-base-permissions");

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@email.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "123456";
const EMAIL_LOG_PATH = path.resolve(process.cwd(), process.env.EMAIL_LOG_PATH || "logs/email.log");

const prisma = new PrismaClient();

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

async function callApi(pathname, { method = "GET", token, body } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${BASE_URL}${pathname}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    let payload = null;
    try {
        payload = await response.json();
    } catch (error) {
        payload = null;
    }

    return { response, payload };
}

function futureIso(hours) {
    return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

async function waitFor(predicate, { timeoutMs = 8000, intervalMs = 250 } = {}) {
    const startedAt = Date.now();
    while (Date.now() - startedAt <= timeoutMs) {
        if (await predicate()) return true;
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return false;
}

async function main() {
    console.log("Regression: user onboarding, permissions and ticket email...");
    console.log(`BASE_URL: ${BASE_URL}`);

    // 1) idempotent user permissions
    await ensureUserBasePermissions(prisma);
    await ensureUserBasePermissions(prisma);

    const userRole = await prisma.roles.findFirst({
        where: { name: "user", deletedAt: null },
        include: {
            rolePermissions: {
                include: {
                    permission: true,
                },
            },
        },
    });

    assert(userRole, "No existe el rol user");
    const permissionNames = userRole.rolePermissions
        .filter((item) => item.permission && item.permission.deletedAt === null)
        .map((item) => item.permission.name);
    const permissionSet = new Set(permissionNames);
    const uniquePermissionIds = new Set(userRole.rolePermissions.map((item) => item.permissionId));

    assert(
        uniquePermissionIds.size === userRole.rolePermissions.length,
        "Se detectaron relaciones role-permission duplicadas para el rol user"
    );
    for (const requiredPermission of USER_BASE_PERMISSION_NAMES) {
        assert(permissionSet.has(requiredPermission), `Falta permiso base en rol user: ${requiredPermission}`);
    }

    // 2) register creates user with role user
    const unique = `${Date.now()}`;
    const newUserEmail = `assistant.${unique}@mail.com`;
    const newUserPassword = "12345678";
    const newUserName = `Asistente ${unique}`;

    const registerRes = await callApi("/api/v1/auth/register", {
        method: "POST",
        body: {
            name: newUserName,
            email: newUserEmail,
            password: newUserPassword,
        },
    });

    assert(registerRes.response.status === 200, "Register fallo");

    const dbUser = await prisma.user.findFirst({
        where: { email: newUserEmail, deletedAt: null },
        include: { role: true },
    });

    assert(dbUser, "El usuario recien registrado no existe en DB");
    assert(dbUser.role?.name === "user", "El usuario nuevo no quedo con rol user");

    // 3) login returns effective permissions
    const loginUserRes = await callApi("/api/v1/auth/login", {
        method: "POST",
        body: {
            email: newUserEmail,
            password: newUserPassword,
        },
    });

    assert(loginUserRes.response.status === 200, "Login del usuario nuevo fallo");
    const userToken = loginUserRes.payload?.data?.token;
    const userPermissions = loginUserRes.payload?.data?.user?.permissions;
    assert(userToken, "Login no devolvio token");
    assert(Array.isArray(userPermissions), "Login no devolvio data.user.permissions como array");
    for (const requiredPermission of USER_BASE_PERMISSION_NAMES) {
        assert(userPermissions.includes(requiredPermission), `Login no incluye permiso efectivo requerido: ${requiredPermission}`);
    }

    // fixtures
    const loginAdminRes = await callApi("/api/v1/auth/login", {
        method: "POST",
        body: {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
        },
    });
    assert(loginAdminRes.response.status === 200, "Login admin fallo");
    const adminToken = loginAdminRes.payload?.data?.token;
    assert(adminToken, "No se obtuvo token admin");

    const siteRes = await callApi("/api/v1/sites/create-site", {
        method: "POST",
        token: adminToken,
        body: {
            name: `Site Regression ${unique}`,
            ubication: "Bogota",
            direction: "Norte",
            phone: `3${String(Date.now()).slice(-9)}`,
            email: `site.reg.${unique}@mail.com`,
            capacity: 2,
        },
    });
    assert(siteRes.response.status === 200, "No se pudo crear sitio para pruebas");
    const siteId = siteRes.payload?.data?.id;
    assert(siteId, "No se obtuvo siteId para pruebas");

    const eventRes = await callApi("/api/v1/events/create-event", {
        method: "POST",
        token: adminToken,
        body: {
            name: `Event Regression ${unique}`,
            type: "PUBLIC",
            description: "Evento para regression user",
            startTime: futureIso(3),
            endTime: futureIso(4),
            siteId,
        },
    });
    assert(eventRes.response.status === 200, "No se pudo crear evento para pruebas");
    const eventId = eventRes.payload?.data?.id;
    assert(eventId, "No se obtuvo eventId para pruebas");

    const updateEventRes = await callApi(`/api/v1/events/update-event/${eventId}`, {
        method: "PUT",
        token: adminToken,
        body: {
            name: `Event Regression ${unique}`,
            type: "PUBLIC",
            status: "CONFIRMED",
            description: "Evento para regression user",
            startTime: futureIso(3),
            endTime: futureIso(4),
            siteId,
        },
    });
    assert(updateEventRes.response.status === 200, "No se pudo confirmar evento para pruebas");

    // 4) user can read events and create ticket (pending)
    const getEventsByUserRes = await callApi("/api/v1/events/get-events", {
        method: "GET",
        token: userToken,
    });
    assert(getEventsByUserRes.response.status === 200, "User con READ_EVENTS no pudo consultar eventos");

    const logSizeBefore = fs.existsSync(EMAIL_LOG_PATH) ? fs.statSync(EMAIL_LOG_PATH).size : 0;

    const createTicketRes = await callApi("/api/v1/tickets/create-ticket", {
        method: "POST",
        token: userToken,
        body: {
            eventId,
        },
    });
    assert(createTicketRes.response.status === 200, "User con CREATE_TICKET no pudo comprar ticket");

    const paymentId = createTicketRes.payload?.data?.payment?.id;
    assert(paymentId, "La compra no devolvio paymentId");
    assert(createTicketRes.payload?.data?.payment?.status === "PENDING", "La compra inicial debe quedar en PENDING");

    const confirmPaymentRes = await callApi(`/api/v1/payments/confirm-payment/${paymentId}`, {
        method: "PUT",
        token: adminToken,
    });
    assert(confirmPaymentRes.response.status === 200, "Admin no pudo confirmar pago pendiente");

    const ticketId = (confirmPaymentRes.payload?.data?.updatedTickets || [])[0]?.id;
    assert(ticketId, "No se obtuvo ticketId despues de confirmar pago");

    // 5) protected routes still 401/403
    const protected401Res = await callApi("/api/v1/events/get-events", { method: "GET" });
    assert(protected401Res.response.status === 401, "Endpoint protegido sin token ya no responde 401");

    const protected403Res = await callApi("/api/v1/security/get-roles", {
        method: "GET",
        token: userToken,
    });
    assert(protected403Res.response.status === 403, "Endpoint protegido sin permiso ya no responde 403");

    // 6) email attempt should happen after admin payment confirmation
    const emailAttemptLogged = await waitFor(async () => {
        if (!fs.existsSync(EMAIL_LOG_PATH)) return false;
        const logContent = fs.readFileSync(EMAIL_LOG_PATH, "utf8");
        const newLogChunk = logContent.slice(logSizeBefore);
        return (
            newLogChunk.includes("\"event\":\"EMAIL_SEND_ATTEMPT\"") &&
            newLogChunk.includes(`\"ticketId\":${ticketId}`)
        );
    });

    assert(emailAttemptLogged, "No se detecto intento de envio de email tras confirmar el pago");

    const invoiceEmailAttemptLogged = await waitFor(async () => {
        if (!fs.existsSync(EMAIL_LOG_PATH)) return false;
        const logContent = fs.readFileSync(EMAIL_LOG_PATH, "utf8");
        const newLogChunk = logContent.slice(logSizeBefore);
        return (
            newLogChunk.includes("\"type\":\"PAYMENT_INVOICE\"") &&
            newLogChunk.includes(`\"paymentId\":${paymentId}`)
        );
    });

    assert(invoiceEmailAttemptLogged, "No se detecto intento de envio de factura por email tras confirmar el pago");

    console.log("OK: regresion de user onboarding y tickets completada");
}

main()
    .catch((error) => {
        console.error("Fallo en test:user:regression");
        console.error(error.message || error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
