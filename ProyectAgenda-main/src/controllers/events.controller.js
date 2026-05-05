const { prisma } = require("../config/prisma/prisma");
const { successResponse } = require("../config/interfaces/success.interface");
const { validateFields } = require("../config/utils/rulesValidations");
const { enrichSiteWithMapData } = require("../config/utils/siteMaps");
const { getEventDashboardSummary } = require("../services/ticketing.service");
const { getEventsDashboardSummary } = require("../services/events-dashboard.service");
const { notifyEventStatusChange, runLifecycleJobs } = require("../services/lifecycle.service");

const MAX_IMAGE_URL_LENGTH = 2048;

async function assertSiteForEvent(siteId, user) {
    const parsedSiteId = Number.parseInt(siteId, 10);
    if (!Number.isInteger(parsedSiteId) || parsedSiteId < 1) {
        throw new Error("El sitio del evento es requerido");
    }

    const site = await prisma.sites.findFirst({
        where: {
            id: parsedSiteId,
            deletedAt: null,
            status: "ACTIVE",
        },
        select: {
            id: true,
            userId: true,
        },
    });

    if (!site) {
        throw new Error("El sitio no existe o no esta activo");
    }

    if (user.role.id !== 1 && site.userId !== Number.parseInt(user.id, 10)) {
        throw new Error("Solo puedes asociar eventos a sitios propios");
    }

    return site;
}

function normalizeEventFilters(query) {
    const where = {
        deletedAt: null,
        site: {
            is: {
                deletedAt: null,
            },
        },
    };

    if (query.status) {
        where.status = String(query.status).toUpperCase();
    }

    if (query.type) {
        where.type = String(query.type).toUpperCase();
    }

    if (query.siteId) {
        where.siteId = Number.parseInt(query.siteId, 10);
    }

    if (query.search) {
        where.OR = [
            { name: { contains: String(query.search), mode: "insensitive" } },
            { description: { contains: String(query.search), mode: "insensitive" } },
        ];
    }

    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : null;
    const dateTo = query.dateTo ? new Date(query.dateTo) : null;

    if (dateFrom && Number.isNaN(dateFrom.getTime())) {
        throw new Error("dateFrom debe ser una fecha valida");
    }

    if (dateTo && Number.isNaN(dateTo.getTime())) {
        throw new Error("dateTo debe ser una fecha valida");
    }

    if (dateFrom && dateTo && dateFrom > dateTo) {
        throw new Error("dateFrom no puede ser mayor a dateTo");
    }

    if (dateFrom || dateTo) {
        where.startTime = {};
        if (dateFrom) where.startTime.gte = dateFrom;
        if (dateTo) where.startTime.lte = dateTo;
    }

    return where;
}

function normalizeOptionalImageUrl(body) {
    if (!Object.prototype.hasOwnProperty.call(body, "imageUrl")) {
        return;
    }

    if (body.imageUrl === null) {
        return;
    }

    if (typeof body.imageUrl === "string") {
        const normalizedValue = body.imageUrl.trim();
        body.imageUrl = normalizedValue === "" ? null : normalizedValue;
    }
}

function buildImageUrlValidation() {
    return {
        field: "imageUrl",
        validations: [
            { type: "string", message: "imageUrl debe ser un texto" },
            { type: "max", value: MAX_IMAGE_URL_LENGTH, message: `imageUrl debe tener maximo ${MAX_IMAGE_URL_LENGTH} caracteres` },
            { type: "url", message: "imageUrl debe ser una URL valida" },
        ],
    };
}

exports.createEvent = async (req, res, next) => {
    try {
        normalizeOptionalImageUrl(req.body);

        const validations = [
            {
                field: "name",
                validations: [
                    { type: "required", message: "El nombre del evento es requerido" },
                ],
            },
            {
                field: "type",
                validations: [
                    { type: "required", message: "El tipo de evento es requerido" },
                    { type: "in", value: ["PUBLIC", "PRIVATE"], message: "El tipo de evento debe ser PUBLIC o PRIVATE" },
                ],
            },
            {
                field: "status",
                validations: [
                    { type: "in", value: ["PENDING", "IN_PROGRESS", "CONFIRMED", "CANCELLED", "COMPLETED", "ARCHIVED"], message: "Estado invalido" },
                ],
            },
            {
                field: "description",
                validations: [
                    { type: "required", message: "La descripcion del evento es requerida" },
                    { type: "min", value: 3, message: "La descripcion del evento debe tener al menos 3 caracteres" },
                    { type: "max", value: 255, message: "La descripcion del evento debe tener menos de 255 caracteres" },
                ],
            },
            {
                field: "ticketPrice",
                validations: [
                    { type: "number", message: "ticketPrice debe ser numerico" },
                    { type: "min", value: 0, message: "ticketPrice no puede ser negativo" },
                ],
            },
            {
                field: "maxTicketsPerUser",
                validations: [
                    { type: "number", message: "maxTicketsPerUser debe ser numerico" },
                    { type: "min", value: 1, message: "maxTicketsPerUser minimo 1" },
                    { type: "max", value: 100, message: "maxTicketsPerUser maximo 100" },
                ],
            },
            {
                field: "startTime",
                validations: [
                    { type: "required", message: "La hora de inicio del evento es requerida" },
                    { type: "datetime", message: "La hora de inicio del evento debe ser una fecha y hora valida" },
                    { type: "max", value: req.body.endTime, message: "La hora de inicio debe ser menor a la hora de fin" },
                ],
            },
            {
                field: "endTime",
                validations: [
                    { type: "required", message: "La hora de fin del evento es requerida" },
                    { type: "datetime", message: "La hora de fin del evento debe ser una fecha y hora valida" },
                    { type: "min", value: req.body.startTime, message: "La hora de fin debe ser mayor a la hora de inicio" },
                ],
            },
            {
                field: "siteId",
                validations: [
                    { type: "required", message: "El sitio del evento es requerido" },
                    { type: "number", message: "El sitio del evento debe ser un numero" },
                ],
            },
            buildImageUrlValidation(),
        ];

        const validationErrors = validateFields(req.body, validations, res);
        if (validationErrors) return;

        const {
            name,
            type,
            status,
            description,
            imageUrl,
            ticketPrice,
            maxTicketsPerUser,
            startTime,
            endTime,
            siteId,
        } = req.body;
        const userId = Number.parseInt(req.user.id, 10);

        await assertSiteForEvent(siteId, req.user);

        const newEvent = await prisma.events.create({
            data: {
                name,
                type,
                status: status || "PENDING",
                description,
                imageUrl,
                ticketPrice: ticketPrice !== undefined ? ticketPrice : 0,
                maxTicketsPerUser: maxTicketsPerUser || 1,
                startTime,
                endTime,
                siteId,
                userId,
            },
        });

        return res.json(successResponse("Evento creado", newEvent, 201));
    } catch (error) {
        next(error);
    }
};

exports.updateEvent = async (req, res, next) => {
    try {
        normalizeOptionalImageUrl(req.body);

        const validations = [
            {
                field: "name",
                validations: [
                    { type: "required", message: "El nombre del evento es requerido" },
                ],
            },
            {
                field: "status",
                validations: [
                    { type: "required", message: "El estado del evento es requerido" },
                    { type: "in", value: ["PENDING", "IN_PROGRESS", "CONFIRMED", "CANCELLED", "COMPLETED", "ARCHIVED"], message: "Estado invalido" },
                ],
            },
            {
                field: "type",
                validations: [
                    { type: "required", message: "El tipo de evento es requerido" },
                    { type: "in", value: ["PUBLIC", "PRIVATE"], message: "El tipo de evento debe ser PUBLIC o PRIVATE" },
                ],
            },
            {
                field: "description",
                validations: [
                    { type: "required", message: "La descripcion del evento es requerida" },
                    { type: "min", value: 3, message: "La descripcion del evento debe tener al menos 3 caracteres" },
                    { type: "max", value: 255, message: "La descripcion del evento debe tener menos de 255 caracteres" },
                ],
            },
            {
                field: "ticketPrice",
                validations: [
                    { type: "number", message: "ticketPrice debe ser numerico" },
                    { type: "min", value: 0, message: "ticketPrice no puede ser negativo" },
                ],
            },
            {
                field: "maxTicketsPerUser",
                validations: [
                    { type: "number", message: "maxTicketsPerUser debe ser numerico" },
                    { type: "min", value: 1, message: "maxTicketsPerUser minimo 1" },
                    { type: "max", value: 100, message: "maxTicketsPerUser maximo 100" },
                ],
            },
            {
                field: "startTime",
                validations: [
                    { type: "required", message: "La hora de inicio del evento es requerida" },
                    { type: "datetime", message: "La hora de inicio del evento debe ser una fecha y hora valida" },
                    { type: "max", value: req.body.endTime, message: "La hora de inicio debe ser menor a la hora de fin" },
                ],
            },
            {
                field: "endTime",
                validations: [
                    { type: "required", message: "La hora de fin del evento es requerida" },
                    { type: "datetime", message: "La hora de fin del evento debe ser una fecha y hora valida" },
                    { type: "min", value: req.body.startTime, message: "La hora de fin debe ser mayor a la hora de inicio" },
                ],
            },
            {
                field: "siteId",
                validations: [
                    { type: "required", message: "El sitio del evento es requerido" },
                    { type: "number", message: "El sitio del evento debe ser un numero" },
                ],
            },
            buildImageUrlValidation(),
        ];

        const validationErrors = validateFields(req.body, validations, res);
        if (validationErrors) return;

        const eventId = Number.parseInt(req.params.id, 10);
        const userId = Number.parseInt(req.user.id, 10);

        const currentEvent = await prisma.events.findFirst({
            where: {
                id: eventId,
                deletedAt: null,
            },
            select: {
                id: true,
                userId: true,
                status: true,
                name: true,
            },
        });

        if (!currentEvent) {
            throw new Error("El evento no existe");
        }

        if (req.user.role.id !== 1 && currentEvent.userId !== userId) {
            throw new Error("Solo el organizador del evento puede actualizarlo");
        }

        await assertSiteForEvent(req.body.siteId, req.user);

        const eventData = {
            name: req.body.name,
            status: req.body.status,
            type: req.body.type,
            description: req.body.description,
            ticketPrice: req.body.ticketPrice !== undefined ? req.body.ticketPrice : 0,
            maxTicketsPerUser: req.body.maxTicketsPerUser || 1,
            startTime: req.body.startTime,
            endTime: req.body.endTime,
            siteId: req.body.siteId,
        };

        if (Object.prototype.hasOwnProperty.call(req.body, "imageUrl")) {
            eventData.imageUrl = req.body.imageUrl;
        }

        const updatedEvent = await prisma.events.update({
            where: { id: eventId },
            data: eventData,
        });

        if (currentEvent.status !== updatedEvent.status) {
            await notifyEventStatusChange({
                eventId: updatedEvent.id,
                eventName: updatedEvent.name,
                newStatus: updatedEvent.status,
            });
        }

        return res.json(successResponse("Evento actualizado", updatedEvent, 200));
    } catch (error) {
        next(error);
    }
};

exports.deleteEvent = async (req, res, next) => {
    try {
        const eventId = Number.parseInt(req.params.id, 10);
        const userId = Number.parseInt(req.user.id, 10);

        const currentEvent = await prisma.events.findFirst({
            where: {
                id: eventId,
                deletedAt: null,
            },
            select: {
                id: true,
                userId: true,
            },
        });

        if (!currentEvent) {
            throw new Error("El evento no existe");
        }

        if (req.user.role.id !== 1 && currentEvent.userId !== userId) {
            throw new Error("Solo el organizador del evento puede eliminarlo");
        }

        const deletedEvent = await prisma.events.update({
            where: { id: eventId },
            data: {
                deletedAt: new Date(),
                status: "ARCHIVED",
            },
        });

        return res.json(successResponse("Evento eliminado", deletedEvent, 200));
    } catch (error) {
        next(error);
    }
};

exports.getEvents = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, all = false } = req.query;
        const where = normalizeEventFilters(req.query);

        if (req.user.role.id !== 1 && req.user.role.name !== "user") {
            where.userId = Number.parseInt(req.user.id, 10);
        }

        const query = {
            where,
            include: {
                site: {
                    select: {
                        id: true,
                        name: true,
                        imageUrl: true,
                        capacity: true,
                        ubication: true,
                        direction: true,
                        latitude: true,
                        longitude: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                agendas: {
                    where: { deletedAt: null },
                    select: {
                        id: true,
                        activity: true,
                        startTime: true,
                        endTime: true,
                        status: true,
                    },
                    orderBy: {
                        startTime: "asc",
                    },
                },
                _count: {
                    select: {
                        tickets: {
                            where: {
                                deletedAt: null,
                            },
                        },
                    },
                },
            },
            orderBy: {
                startTime: "asc",
            },
        };

        if (!all || all === "false") {
            query.skip = (Number.parseInt(page, 10) - 1) * Number.parseInt(limit, 10);
            query.take = Number.parseInt(limit, 10);
        }

        const [events, total] = await Promise.all([
            prisma.events.findMany(query),
            prisma.events.count({ where }),
        ]);

        const serializedEvents = events.map((event) => ({
            ...event,
            site: enrichSiteWithMapData(event.site),
        }));

        return res.json(successResponse("Eventos obtenidos", {
            data: serializedEvents,
            pagination: {
                page: Number.parseInt(page, 10),
                limit: Number.parseInt(limit, 10),
                total,
                totalPages: Math.ceil(total / Number.parseInt(limit, 10)),
            },
        }, 200));
    } catch (error) {
        next(error);
    }
};

exports.getEventCapacity = async (req, res, next) => {
    try {
        const data = await getEventDashboardSummary(req.params.id);
        return res.json(successResponse("Resumen del evento obtenido", data, 200));
    } catch (error) {
        next(error);
    }
};

exports.getEventsDashboard = async (req, res, next) => {
    try {
        const data = await getEventsDashboardSummary({
            user: req.user,
            query: req.query,
        });

        return res.json(successResponse("Resumen general de eventos obtenido", data, 200));
    } catch (error) {
        next(error);
    }
};

exports.runAutomationJobs = async (req, res, next) => {
    try {
        const result = await runLifecycleJobs();
        return res.json(successResponse("Automatizaciones ejecutadas", result, 200));
    } catch (error) {
        next(error);
    }
};
