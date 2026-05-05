const { prisma } = require("../config/prisma/prisma");
const { successResponse } = require("../config/interfaces/success.interface");
const { validateFields } = require("../config/utils/rulesValidations");
const {
    createTicketPurchase,
    getEventDashboardSummary,
    cancelTicket: cancelTicketService,
} = require("../services/ticketing.service");

exports.createTicket = async (req, res, next) => {
    try {
        const validations = [
            {
                field: "eventId",
                validations: [
                    { type: "required", message: "El evento es requerido" },
                    { type: "number", message: "El evento debe ser un numero" },
                ],
            },
            {
                field: "quantity",
                validations: [
                    { type: "number", message: "La cantidad debe ser un numero" },
                    { type: "min", value: 1, message: "La cantidad minima es 1" },
                    { type: "max", value: 20, message: "La cantidad maxima es 20" },
                ],
            },
            {
                field: "promotionCode",
                validations: [
                    { type: "string", message: "El codigo promocional debe ser texto" },
                    { type: "min", value: 3, message: "El codigo promocional debe tener al menos 3 caracteres" },
                    { type: "max", value: 40, message: "El codigo promocional debe tener menos de 40 caracteres" },
                ],
            },
            {
                field: "paymentProvider",
                validations: [
                    { type: "string", message: "paymentProvider debe ser texto" },
                    { type: "max", value: 50, message: "paymentProvider debe tener menos de 50 caracteres" },
                ],
            },
            {
                field: "paymentReference",
                validations: [
                    { type: "string", message: "paymentReference debe ser texto" },
                    { type: "max", value: 100, message: "paymentReference debe tener menos de 100 caracteres" },
                ],
            },
            {
                field: "currency",
                validations: [
                    { type: "string", message: "currency debe ser texto" },
                    { type: "min", value: 3, message: "currency debe tener 3 caracteres" },
                    { type: "max", value: 3, message: "currency debe tener 3 caracteres" },
                ],
            },
        ];

        const validationErrors = validateFields(req.body, validations, res);
        if (validationErrors) return;

        const purchase = await createTicketPurchase({
            user: req.user,
            eventId: req.body.eventId,
            quantity: req.body.quantity || 1,
            promotionCode: req.body.promotionCode,
            paymentProvider: req.body.paymentProvider,
            paymentReference: req.body.paymentReference,
            currency: req.body.currency || "COP",
        });

        const mainTicket = purchase.tickets[0] || null;

        return res.json(successResponse("Compra de boletas procesada", {
            ...(mainTicket || {}),
            tickets: purchase.tickets,
            totalTickets: purchase.tickets.length,
            payment: purchase.payment,
            pricing: purchase.pricing,
            promotion: purchase.promotion,
            capacity: purchase.capacity,
        }, 201));
    } catch (error) {
        next(error);
    }
};

exports.getTickets = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, all = false, eventId, paymentId, status } = req.query;
        const userId = Number.parseInt(req.user.id, 10);

        const where = { deletedAt: null };

        if (eventId) {
            where.eventId = Number.parseInt(eventId, 10);
        }

        if (paymentId) {
            where.paymentId = Number.parseInt(paymentId, 10);
        }

        if (status) {
            where.status = String(status).toUpperCase();
        }

        if (req.user.role.id !== 1) {
            where.userId = userId;
        }

        const query = {
            where,
            include: {
                event: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        startTime: true,
                        endTime: true,
                        site: {
                            select: {
                                id: true,
                                name: true,
                                imageUrl: true,
                            },
                        },
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                payment: {
                    select: {
                        id: true,
                        status: true,
                        totalAmount: true,
                        currency: true,
                        provider: true,
                        reference: true,
                        paidAt: true,
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

        const [tickets, total] = await Promise.all([
            prisma.tickets.findMany(query),
            prisma.tickets.count({ where }),
        ]);

        return res.json(successResponse("Boletas obtenidas", {
            data: tickets,
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

exports.validateTicket = async (req, res, next) => {
    try {
        const { codeQr } = req.params;
        const userId = Number.parseInt(req.user.id, 10);

        const ticket = await prisma.tickets.findFirst({
            where: {
                codeQr,
                deletedAt: null,
                status: {
                    in: ["ACTIVE", "PURCHASED"],
                },
            },
            include: {
                event: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        userId: true,
                    },
                },
            },
        });

        if (!ticket) {
            throw new Error("La boleta no existe o no esta activa");
        }

        if (req.user.role.id !== 1 && ticket.event.userId !== userId) {
            throw new Error("Solo el organizador del evento puede validar esta boleta");
        }

        if (ticket.validated || ticket.status === "USED") {
            throw new Error("La boleta ya fue validada anteriormente");
        }

        if (!["IN_PROGRESS", "CONFIRMED"].includes(ticket.event.status)) {
            throw new Error("No se puede validar boletas para este evento por su estado actual");
        }

        const validatedTicket = await prisma.tickets.update({
            where: { id: ticket.id },
            data: {
                validated: true,
                validatedAt: new Date(),
                status: "USED",
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                event: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        return res.json(successResponse("Boleta validada correctamente", validatedTicket, 200));
    } catch (error) {
        next(error);
    }
};

exports.cancelTicket = async (req, res, next) => {
    try {
        const cancelledTicket = await cancelTicketService({
            ticketId: req.params.id,
            user: req.user,
        });

        return res.json(successResponse("Boleta cancelada", cancelledTicket, 200));
    } catch (error) {
        next(error);
    }
};

exports.getAttendeesByEvent = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const { page = 1, limit = 10, all = false, search = "" } = req.query;
        const parsedEventId = Number.parseInt(eventId, 10);

        if (!Number.isInteger(parsedEventId) || parsedEventId < 1) {
            throw new Error("El evento es requerido");
        }

        const event = await prisma.events.findFirst({
            where: {
                id: parsedEventId,
                deletedAt: null,
            },
            select: {
                id: true,
                name: true,
                userId: true,
            },
        });

        if (!event) {
            throw new Error("El evento no existe");
        }

        const requesterId = Number.parseInt(req.user.id, 10);
        if (req.user.role.id !== 1 && event.userId !== requesterId) {
            throw new Error("Solo el organizador del evento puede consultar asistentes");
        }

        const where = {
            eventId: parsedEventId,
            deletedAt: null,
            OR: [
                { validated: true },
                { status: "USED" },
            ],
            user: {
                deletedAt: null,
                ...(search
                    ? {
                        OR: [
                            { name: { contains: String(search), mode: "insensitive" } },
                            { email: { contains: String(search), mode: "insensitive" } },
                        ],
                    }
                    : {}),
            },
        };

        const query = {
            where,
            select: {
                id: true,
                codeQr: true,
                validated: true,
                validatedAt: true,
                status: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                payment: {
                    select: {
                        id: true,
                        status: true,
                    },
                },
            },
            orderBy: {
                validatedAt: "desc",
            },
        };

        if (!all || all === "false") {
            query.skip = (Number.parseInt(page, 10) - 1) * Number.parseInt(limit, 10);
            query.take = Number.parseInt(limit, 10);
        }

        const [items, total] = await Promise.all([
            prisma.tickets.findMany(query),
            prisma.tickets.count({ where }),
        ]);

        return res.json(successResponse("Asistentes obtenidos", {
            event,
            items,
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

exports.getCapacitySummary = async (req, res, next) => {
    try {
        const data = await getEventDashboardSummary(req.params.eventId);
        return res.json(successResponse("Resumen del evento obtenido", data, 200));
    } catch (error) {
        next(error);
    }
};
