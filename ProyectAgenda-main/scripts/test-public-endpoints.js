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

async function setupPublicFixtures(token) {
    const unique = `public-${Date.now()}`;
    const city = `Bogota-${unique}`;

    const siteRes = await callApi("/api/v1/sites/create-site", {
        method: "POST",
        token,
        body: {
            name: `Site ${unique}`,
            ubication: city,
            direction: `Direccion ${unique}`,
            phone: `3${String(Date.now()).slice(-9)}`,
            email: `${unique}@mail.com`,
            capacity: 250,
        },
    });

    assert(siteRes.response.status === 200, "No se pudo crear sitio de prueba");
    const siteId = siteRes.payload?.data?.id;
    assert(siteId, "El sitio de prueba no retornó ID");

    const eventARes = await callApi("/api/v1/events/create-event", {
        method: "POST",
        token,
        body: {
            name: `Event Confirmed ${unique}`,
            type: "PUBLIC",
            description: `Evento confirmado ${unique}`,
            startTime: futureIso(4),
            endTime: futureIso(6),
            siteId,
        },
    });
    assert(eventARes.response.status === 200, "No se pudo crear evento CONFIRMED");
    const eventAId = eventARes.payload?.data?.id;
    assert(eventAId, "Evento CONFIRMED no retornó ID");

    const eventBRes = await callApi("/api/v1/events/create-event", {
        method: "POST",
        token,
        body: {
            name: `Event Cancelled ${unique}`,
            type: "PUBLIC",
            description: `Evento cancelado ${unique}`,
            startTime: futureIso(8),
            endTime: futureIso(10),
            siteId,
        },
    });
    assert(eventBRes.response.status === 200, "No se pudo crear evento CANCELLED");
    const eventBId = eventBRes.payload?.data?.id;
    assert(eventBId, "Evento CANCELLED no retornó ID");

    const updateARes = await callApi(`/api/v1/events/update-event/${eventAId}`, {
        method: "PUT",
        token,
        body: {
            name: `Event Confirmed ${unique}`,
            status: "CONFIRMED",
            type: "PUBLIC",
            description: `Evento confirmado ${unique}`,
            startTime: futureIso(4),
            endTime: futureIso(6),
            siteId,
        },
    });
    assert(updateARes.response.status === 200, "No se pudo confirmar el evento A");

    const updateBRes = await callApi(`/api/v1/events/update-event/${eventBId}`, {
        method: "PUT",
        token,
        body: {
            name: `Event Cancelled ${unique}`,
            status: "CANCELLED",
            type: "PUBLIC",
            description: `Evento cancelado ${unique}`,
            startTime: futureIso(8),
            endTime: futureIso(10),
            siteId,
        },
    });
    assert(updateBRes.response.status === 200, "No se pudo cancelar el evento B");

    return { unique, city, siteId };
}

async function main() {
    console.log("Probar endpoints publicos...");
    console.log(`BASE_URL: ${BASE_URL}`);

    const loginRes = await callApi("/api/v1/auth/login", {
        method: "POST",
        body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });

    assert(loginRes.response.status === 200, "Login admin falló para preparar fixtures");
    const token = loginRes.payload?.data?.token;
    assert(token, "No se obtuvo token admin");

    const fixtures = await setupPublicFixtures(token);

    const publicEvents = await callApi(`/api/v1/public/events?search=${encodeURIComponent(fixtures.unique)}`);
    assert(publicEvents.response.status === 200, "GET /public/events sin token debe responder 200");
    assert(Array.isArray(publicEvents.payload?.data?.items), "El payload de /public/events no tiene items[]");
    assert(!publicEvents.payload.data.items.some((e) => ["CANCELLED", "ARCHIVED"].includes(e.status)), "Eventos CANCELLED/ARCHIVED no deben salir por defecto");

    const publicSites = await callApi(`/api/v1/public/sites?city=${encodeURIComponent(fixtures.city)}`);
    assert(publicSites.response.status === 200, "GET /public/sites sin token debe responder 200");
    assert(Array.isArray(publicSites.payload?.data?.items), "El payload de /public/sites no tiene items[]");
    assert(publicSites.payload.data.items.some((s) => s.city === fixtures.city), "El filtro city no devolvió el sitio esperado");

    const aliasEvents = await callApi("/api/v1/public/get-events");
    assert(aliasEvents.response.status === 200, "GET /public/get-events (alias) debe responder 200");

    const aliasSites = await callApi("/api/v1/public/get-sites");
    assert(aliasSites.response.status === 200, "GET /public/get-sites (alias) debe responder 200");

    const protectedEvents = await callApi("/api/v1/events/get-events");
    assert(protectedEvents.response.status === 401, "/events/get-events sin token debe seguir en 401");

    const protectedSites = await callApi("/api/v1/sites/get-sites");
    assert(protectedSites.response.status === 401, "/sites/get-sites sin token debe seguir en 401");

    const pagedEvents = await callApi(`/api/v1/public/events?search=${encodeURIComponent(fixtures.unique)}&page=1&limit=1`);
    assert(pagedEvents.response.status === 200, "La paginacion de /public/events falló");
    assert(pagedEvents.payload?.data?.items?.length <= 1, "limit=1 debe devolver maximo un item");

    const allEvents = await callApi(`/api/v1/public/events?search=${encodeURIComponent(fixtures.unique)}&all=true`);
    assert(allEvents.response.status === 200, "all=true en /public/events falló");
    assert(allEvents.payload?.data?.pagination?.total === allEvents.payload?.data?.items?.length, "all=true debe devolver todos los items");

    const cancelledFiltered = await callApi(`/api/v1/public/events?search=${encodeURIComponent(fixtures.unique)}&status=CANCELLED`);
    assert(cancelledFiltered.response.status === 200, "Filtro status en /public/events falló");
    assert(cancelledFiltered.payload?.data?.items?.every((e) => e.status === "CANCELLED"), "El filtro status no aplicó correctamente");

    const sitesSearch = await callApi(`/api/v1/public/sites?search=${encodeURIComponent(fixtures.unique)}`);
    assert(sitesSearch.response.status === 200, "Filtro search en /public/sites falló");
    assert(sitesSearch.payload?.data?.items?.some((s) => s.name.includes(fixtures.unique)), "El filtro search no retornó el sitio esperado");

    console.log("OK: pruebas publicas completadas");
}

main().catch((error) => {
    console.error("Fallo en pruebas publicas:");
    console.error(error.message || error);
    process.exit(1);
});
