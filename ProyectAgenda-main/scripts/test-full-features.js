require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { patchDatabaseUrlForHostExecution } = require("./lib/database-url");

patchDatabaseUrlForHostExecution();

const prisma = new PrismaClient();

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@email.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "123456";

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

async function callApi(pathname, { method = "GET", token, body } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

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

function futureIso(hoursAhead) {
    return new Date(Date.now() + hoursAhead * 60 * 60 * 1000).toISOString();
}

async function main() {
    console.log("Full feature regression starting...");
    console.log(`BASE_URL: ${BASE_URL}`);

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

    const unique = `${Date.now()}`;

    const siteRes = await callApi("/api/v1/sites/create-site", {
        method: "POST",
        token: adminToken,
        body: {
            name: `Site Full ${unique}`,
            ubication: "Bogota",
            direction: "Calle 100",
            phone: `3${String(Date.now()).slice(-9)}`,
            email: `site.full.${unique}@mail.com`,
            capacity: 5,
            description: "Sede para test full",
        },
    });

    assert(siteRes.response.status === 200, "No se pudo crear site");
    const siteId = siteRes.payload?.data?.id;
    assert(siteId, "No se obtuvo siteId");

    const eventRes = await callApi("/api/v1/events/create-event", {
        method: "POST",
        token: adminToken,
        body: {
            name: `Event Full ${unique}`,
            type: "PUBLIC",
            description: "Evento para test full",
            ticketPrice: 100000,
            maxTicketsPerUser: 3,
            startTime: futureIso(4),
            endTime: futureIso(5),
            siteId,
        },
    });

    assert(eventRes.response.status === 200, "No se pudo crear event");
    const eventId = eventRes.payload?.data?.id;
    assert(eventId, "No se obtuvo eventId");

    const updateEventRes = await callApi(`/api/v1/events/update-event/${eventId}`, {
        method: "PUT",
        token: adminToken,
        body: {
            name: `Event Full ${unique}`,
            status: "CONFIRMED",
            type: "PUBLIC",
            description: "Evento para test full confirmado",
            ticketPrice: 100000,
            maxTicketsPerUser: 3,
            startTime: futureIso(4),
            endTime: futureIso(5),
            siteId,
        },
    });

    assert(updateEventRes.response.status === 200, "No se pudo confirmar event");

    const agendaRes = await callApi("/api/v1/agendas/create-agenda", {
        method: "POST",
        token: adminToken,
        body: {
            activity: "Registro asistentes",
            startTime: futureIso(4),
            endTime: futureIso(4.5),
            eventId,
        },
    });

    assert(agendaRes.response.status === 200, "No se pudo crear agenda");

    const getAgendasRes = await callApi(`/api/v1/agendas/get-agendas?eventId=${eventId}`, {
        method: "GET",
        token: adminToken,
    });

    assert(getAgendasRes.response.status === 200, "No se pudo consultar agendas");

    const promotionRes = await callApi("/api/v1/promotions/create-promotion", {
        method: "POST",
        token: adminToken,
        body: {
            code: `DESC${String(Date.now()).slice(-4)}`,
            title: "Descuento QA",
            description: "Promo regression",
            discountType: "PERCENT",
            discountValue: 10,
            minQuantity: 2,
            maxUses: 10,
            validFrom: futureIso(-1),
            validTo: futureIso(24),
            eventId,
            isActive: true,
        },
    });

    assert(promotionRes.response.status === 200, "No se pudo crear promocion");
    const promotionCode = promotionRes.payload?.data?.code;
    assert(promotionCode, "No se obtuvo promotionCode");

    const userEmail = `assistant.full.${unique}@mail.com`;
    const userPassword = "12345678";

    const registerUserRes = await callApi("/api/v1/auth/register", {
        method: "POST",
        body: {
            name: `Asistente Full ${unique}`,
            email: userEmail,
            password: userPassword,
        },
    });

    assert(registerUserRes.response.status === 200, "No se pudo registrar user");

    const loginUserRes = await callApi("/api/v1/auth/login", {
        method: "POST",
        body: {
            email: userEmail,
            password: userPassword,
        },
    });

    assert(loginUserRes.response.status === 200, "No se pudo hacer login user");
    const userToken = loginUserRes.payload?.data?.token;
    assert(userToken, "No se obtuvo token user");

    const pendingPurchaseRes = await callApi("/api/v1/tickets/create-ticket", {
        method: "POST",
        token: userToken,
        body: {
            eventId,
            quantity: 2,
            promotionCode,
            paymentProvider: "manual",
            paymentReference: `REF-${unique}`,
            currency: "COP",
        },
    });

    assert(pendingPurchaseRes.response.status === 200, "No se pudo crear compra pendiente");
    const paymentId = pendingPurchaseRes.payload?.data?.payment?.id;
    const ticketCount = pendingPurchaseRes.payload?.data?.totalTickets;
    assert(paymentId, "No se obtuvo paymentId");
    assert(ticketCount === 2, "La compra no genero 2 boletas");
    assert(
        pendingPurchaseRes.payload?.data?.payment?.status === "PENDING",
        "La compra inicial debe quedar en PENDING"
    );

    const adminNotificationsRes = await callApi("/api/v1/notifications/get-notifications?onlyUnread=true", {
        method: "GET",
        token: adminToken,
    });
    assert(adminNotificationsRes.response.status === 200, "No se pudieron consultar notificaciones del admin");
    const adminNotifications = adminNotificationsRes.payload?.data?.data || [];
    const pendingApprovalNotification = adminNotifications.find((item) =>
        String(item.message || "").includes(`pago #${paymentId}`) &&
        String(item.message || "").toLowerCase().includes("requiere aprobacion")
    );
    assert(pendingApprovalNotification, "No se genero notificacion al admin para pago pendiente");

    const paymentDetailRes = await callApi(`/api/v1/payments/get-payment/${paymentId}`, {
        method: "GET",
        token: userToken,
    });

    assert(paymentDetailRes.response.status === 200, "No se pudo consultar detalle de pago");

    const userConfirmAttemptRes = await callApi(`/api/v1/payments/confirm-payment/${paymentId}`, {
        method: "PUT",
        token: userToken,
    });
    assert(
        [400, 403].includes(userConfirmAttemptRes.response.status),
        "Un usuario no admin no deberia poder confirmar pagos"
    );

    const confirmPaymentRes = await callApi(`/api/v1/payments/confirm-payment/${paymentId}`, {
        method: "PUT",
        token: adminToken,
    });

    assert(confirmPaymentRes.response.status === 200, "No se pudo confirmar pago");

    const ticketsAfterPaymentRes = await callApi(`/api/v1/tickets/get-tickets?paymentId=${paymentId}`, {
        method: "GET",
        token: userToken,
    });

    assert(ticketsAfterPaymentRes.response.status === 200, "No se pudo consultar boletas por pago");
    const tickets = ticketsAfterPaymentRes.payload?.data?.data || [];
    assert(tickets.length >= 2, "No se encontraron boletas tras confirmar pago");

    const ticketCodeToValidate = tickets[0]?.codeQr;
    assert(ticketCodeToValidate, "No se obtuvo codeQr para validar ingreso");

    const validateRes = await callApi(`/api/v1/tickets/validate-ticket/${ticketCodeToValidate}`, {
        method: "PUT",
        token: adminToken,
    });

    assert(validateRes.response.status === 200, "No se pudo validar boleta");

    const attendeesRes = await callApi(`/api/v1/tickets/get-attendees/${eventId}`, {
        method: "GET",
        token: adminToken,
    });

    assert(attendeesRes.response.status === 200, "No se pudo consultar asistentes");
    assert((attendeesRes.payload?.data?.items || []).length >= 1, "No hay asistentes validados");

    const privateCapacityRes = await callApi(`/api/v1/events/get-capacity/${eventId}`, {
        method: "GET",
        token: adminToken,
    });
    assert(privateCapacityRes.response.status === 200, "No se pudo consultar aforo privado");

    const publicCapacityRes = await callApi(`/api/v1/public/events/${eventId}/capacity`, {
        method: "GET",
    });
    assert(publicCapacityRes.response.status === 200, "No se pudo consultar aforo publico");

    const broadcastPromotionRes = await callApi("/api/v1/notifications/broadcast-promotion", {
        method: "POST",
        token: adminToken,
        body: {
            title: "Promo de prueba",
            message: "Aprovecha descuento especial",
            eventId,
        },
    });

    assert(broadcastPromotionRes.response.status === 200, "No se pudo enviar notificacion promocional");

    const broadcastEventRes = await callApi("/api/v1/notifications/broadcast-event", {
        method: "POST",
        token: adminToken,
        body: {
            eventId,
            title: "Recordatorio",
            message: "El evento inicia pronto",
            type: "REMINDER",
        },
    });

    assert(broadcastEventRes.response.status === 200, "No se pudo enviar notificacion de evento");

    const getPaymentsRes = await callApi("/api/v1/payments/get-payments", {
        method: "GET",
        token: adminToken,
    });
    assert(getPaymentsRes.response.status === 200, "No se pudo listar pagos");

    const getPromotionsRes = await callApi("/api/v1/promotions/get-promotions", {
        method: "GET",
        token: adminToken,
    });
    assert(getPromotionsRes.response.status === 200, "No se pudo listar promociones");

    const publicAgendasRes = await callApi(`/api/v1/public/agendas?eventId=${eventId}`, {
        method: "GET",
    });
    assert(publicAgendasRes.response.status === 200, "No se pudo consultar agendas publicas");

    const runJobsRes = await callApi("/api/v1/events/run-automation-jobs", {
        method: "POST",
        token: adminToken,
    });
    assert(runJobsRes.response.status === 200, "No se pudieron ejecutar automatizaciones");

    console.log("OK: full feature regression completed");
}

main()
    .catch((error) => {
        console.error("Fallo en test:full:features");
        console.error(error.message || error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
