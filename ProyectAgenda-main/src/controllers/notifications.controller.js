const { prisma } = require("../config/prisma/prisma");
const { successResponse } = require("../config/interfaces/success.interface");
const { validateFields } = require("../config/utils/rulesValidations");
const { sendToNotificationRecords } = require("../services/push-notification.service");

function uniqueByUser(items) {
    const users = new Map();
    items.forEach((item) => {
        if (!users.has(item.userId)) {
            users.set(item.userId, item.userId);
        }
    });
    return Array.from(users.values());
}

function dispatchPushRecords(records, context) {
    if (!Array.isArray(records) || records.length === 0) return;

    sendToNotificationRecords(records).catch((error) => {
        console.error(JSON.stringify({
            event: "PUSH_NON_BLOCKING_ERROR",
            timestamp: new Date().toISOString(),
            context,
            error: error.message,
        }));
    });
}

exports.createNotification = async (req, res, next) => {
    try {
        const validations = [
            {
                field: "title",
                validations: [
                    { type: "required", message: "El titulo es requerido" },
                    { type: "min", value: 3, message: "El titulo debe tener al menos 3 caracteres" },
                    { type: "max", value: 100, message: "El titulo debe tener menos de 100 caracteres" },
                ],
            },
            {
                field: "message",
                validations: [
                    { type: "required", message: "El mensaje es requerido" },
                    { type: "min", value: 3, message: "El mensaje debe tener al menos 3 caracteres" },
                    { type: "max", value: 500, message: "El mensaje debe tener menos de 500 caracteres" },
                ],
            },
            {
                field: "userId",
                validations: [
                    { type: "required", message: "El usuario es requerido" },
                    { type: "number", message: "El usuario debe ser un numero" },
                ],
            },
            {
                field: "type",
                validations: [
                    { type: "in", value: ["SYSTEM", "PURCHASE", "PROMOTION", "REMINDER", "SURVEY", "EVENT"], message: "type invalido" },
                ],
            },
        ];

        const validationErrors = validateFields(req.body, validations, res);
        if (validationErrors) return;

        const notification = await prisma.notifications.create({
            data: {
                title: req.body.title,
                message: req.body.message,
                userId: Number.parseInt(req.body.userId, 10),
                type: req.body.type || "SYSTEM",
            },
        });

        dispatchPushRecords([notification], "notifications.createNotification");

        return res.json(successResponse("Notificacion creada", notification, 201));
    } catch (error) {
        next(error);
    }
};

exports.getNotifications = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, all = false, userId, onlyUnread = false, type } = req.query;
        const where = { deletedAt: null };

        if (req.user.role.id === 1 && userId) {
            where.userId = Number.parseInt(userId, 10);
        } else if (req.user.role.id !== 1) {
            where.userId = Number.parseInt(req.user.id, 10);
        }

        if (onlyUnread === "true") {
            where.isRead = false;
        }

        if (type) {
            where.type = String(type).toUpperCase();
        }

        const query = {
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                id: "desc",
            },
        };

        if (!all || all === "false") {
            query.skip = (Number.parseInt(page, 10) - 1) * Number.parseInt(limit, 10);
            query.take = Number.parseInt(limit, 10);
        }

        const [notifications, total] = await Promise.all([
            prisma.notifications.findMany(query),
            prisma.notifications.count({ where }),
        ]);

        return res.json(successResponse("Notificaciones obtenidas", {
            data: notifications,
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

exports.markNotificationAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;

        const where = {
            id: Number.parseInt(id, 10),
            deletedAt: null,
        };

        if (req.user.role.id !== 1) {
            where.userId = Number.parseInt(req.user.id, 10);
        }

        const notification = await prisma.notifications.findFirst({ where });

        if (!notification) {
            throw new Error("La notificacion no existe");
        }

        const updatedNotification = await prisma.notifications.update({
            where: { id: notification.id },
            data: { isRead: true },
        });

        return res.json(successResponse("Notificacion marcada como leida", updatedNotification, 200));
    } catch (error) {
        next(error);
    }
};

exports.registerDevice = async (req, res, next) => {
    try {
        if (typeof req.body.provider === "string") {
            req.body.provider = req.body.provider.toUpperCase().trim();
        }
        if (typeof req.body.platform === "string") {
            req.body.platform = req.body.platform.toUpperCase().trim();
        }
        if (typeof req.body.token === "string") {
            req.body.token = req.body.token.trim();
        }

        const validations = [
            {
                field: "provider",
                validations: [
                    { type: "required", message: "provider es requerido" },
                    { type: "string", message: "provider debe ser texto" },
                    { type: "in", value: ["FCM"], message: "provider invalido" },
                ],
            },
            {
                field: "platform",
                validations: [
                    { type: "required", message: "platform es requerido" },
                    { type: "string", message: "platform debe ser texto" },
                    { type: "in", value: ["ANDROID", "IOS", "WEB"], message: "platform invalido" },
                ],
            },
            {
                field: "token",
                validations: [
                    { type: "required", message: "token es requerido" },
                    { type: "string", message: "token debe ser texto" },
                    { type: "min", value: 10, message: "token invalido" },
                    { type: "max", value: 4096, message: "token demasiado largo" },
                ],
            },
        ];

        const validationErrors = validateFields(req.body, validations, res);
        if (validationErrors) return;

        const userId = Number.parseInt(req.user.id, 10);

        const device = await prisma.notificationDevices.upsert({
            where: {
                token: req.body.token,
            },
            create: {
                userId,
                provider: req.body.provider,
                platform: req.body.platform,
                token: req.body.token,
            },
            update: {
                userId,
                provider: req.body.provider,
                platform: req.body.platform,
                deletedAt: null,
            },
        });

        return res.json(successResponse("Dispositivo registrado", device, 200));
    } catch (error) {
        next(error);
    }
};

exports.unregisterDevice = async (req, res, next) => {
    try {
        if (typeof req.body.token === "string") {
            req.body.token = req.body.token.trim();
        }

        const validations = [
            {
                field: "token",
                validations: [
                    { type: "required", message: "token es requerido" },
                    { type: "string", message: "token debe ser texto" },
                    { type: "min", value: 10, message: "token invalido" },
                    { type: "max", value: 4096, message: "token demasiado largo" },
                ],
            },
        ];

        const validationErrors = validateFields(req.body, validations, res);
        if (validationErrors) return;

        await prisma.notificationDevices.updateMany({
            where: {
                userId: Number.parseInt(req.user.id, 10),
                token: req.body.token,
                deletedAt: null,
            },
            data: {
                deletedAt: new Date(),
            },
        });

        return res.json(successResponse("Dispositivo desregistrado", {
            token: req.body.token,
        }, 200));
    } catch (error) {
        next(error);
    }
};

exports.broadcastPromotion = async (req, res, next) => {
    try {
        const validations = [
            {
                field: "title",
                validations: [
                    { type: "required", message: "El titulo es requerido" },
                    { type: "string", message: "El titulo debe ser texto" },
                ],
            },
            {
                field: "message",
                validations: [
                    { type: "required", message: "El mensaje es requerido" },
                    { type: "string", message: "El mensaje debe ser texto" },
                ],
            },
            {
                field: "eventId",
                validations: [
                    { type: "number", message: "eventId debe ser numerico" },
                ],
            },
        ];

        const validationErrors = validateFields(req.body, validations, res);
        if (validationErrors) return;

        const eventId = req.body.eventId ? Number.parseInt(req.body.eventId, 10) : null;
        const requesterId = Number.parseInt(req.user.id, 10);

        if (eventId) {
            const event = await prisma.events.findFirst({
                where: {
                    id: eventId,
                    deletedAt: null,
                },
                select: {
                    id: true,
                    userId: true,
                },
            });

            if (!event) {
                throw new Error("El evento no existe");
            }

            if (req.user.role.id !== 1 && event.userId !== requesterId) {
                throw new Error("Solo el organizador del evento puede enviar promociones de este evento");
            }
        }

        let users = [];
        if (eventId) {
            const ticketOwners = await prisma.tickets.findMany({
                where: {
                    eventId,
                    deletedAt: null,
                },
                select: {
                    userId: true,
                },
            });
            users = uniqueByUser(ticketOwners);
        } else if (req.user.role.id === 1) {
            const activeUsers = await prisma.user.findMany({
                where: {
                    deletedAt: null,
                    status: "ACTIVE",
                },
                select: {
                    id: true,
                },
            });
            users = activeUsers.map((item) => item.id);
        } else {
            throw new Error("Debes especificar eventId si no eres admin");
        }

        if (users.length === 0) {
            return res.json(successResponse("No hay destinatarios para la notificacion", {
                sent: 0,
            }, 200));
        }

        const createdNotifications = await prisma.notifications.createManyAndReturn({
            data: users.map((userId) => ({
                userId,
                title: req.body.title,
                message: req.body.message,
                type: "PROMOTION",
            })),
            select: {
                id: true,
                userId: true,
                title: true,
                message: true,
                type: true,
            },
        });

        dispatchPushRecords(createdNotifications, "notifications.broadcastPromotion");

        return res.json(successResponse("Notificacion promocional enviada", {
            sent: users.length,
        }, 200));
    } catch (error) {
        next(error);
    }
};

exports.broadcastEventNotice = async (req, res, next) => {
    try {
        const validations = [
            {
                field: "eventId",
                validations: [
                    { type: "required", message: "El evento es requerido" },
                    { type: "number", message: "El evento debe ser numerico" },
                ],
            },
            {
                field: "title",
                validations: [
                    { type: "required", message: "El titulo es requerido" },
                    { type: "string", message: "El titulo debe ser texto" },
                ],
            },
            {
                field: "message",
                validations: [
                    { type: "required", message: "El mensaje es requerido" },
                    { type: "string", message: "El mensaje debe ser texto" },
                ],
            },
            {
                field: "type",
                validations: [
                    { type: "in", value: ["EVENT", "REMINDER"], message: "type invalido" },
                ],
            },
        ];

        const validationErrors = validateFields(req.body, validations, res);
        if (validationErrors) return;

        const eventId = Number.parseInt(req.body.eventId, 10);
        const requesterId = Number.parseInt(req.user.id, 10);

        const event = await prisma.events.findFirst({
            where: {
                id: eventId,
                deletedAt: null,
            },
            select: {
                id: true,
                userId: true,
            },
        });

        if (!event) {
            throw new Error("El evento no existe");
        }

        if (req.user.role.id !== 1 && event.userId !== requesterId) {
            throw new Error("Solo el organizador del evento puede enviar notificaciones del evento");
        }

        const ticketOwners = await prisma.tickets.findMany({
            where: {
                eventId,
                deletedAt: null,
                status: {
                    notIn: ["CANCELLED", "EXPIRED"],
                },
            },
            select: {
                userId: true,
            },
        });

        const users = uniqueByUser(ticketOwners);

        if (users.length === 0) {
            return res.json(successResponse("No hay destinatarios para la notificacion", {
                sent: 0,
            }, 200));
        }

        const createdNotifications = await prisma.notifications.createManyAndReturn({
            data: users.map((userId) => ({
                userId,
                title: req.body.title,
                message: req.body.message,
                type: req.body.type || "EVENT",
            })),
            select: {
                id: true,
                userId: true,
                title: true,
                message: true,
                type: true,
            },
        });

        dispatchPushRecords(createdNotifications, "notifications.broadcastEventNotice");

        return res.json(successResponse("Notificacion del evento enviada", {
            sent: users.length,
        }, 200));
    } catch (error) {
        next(error);
    }
};
