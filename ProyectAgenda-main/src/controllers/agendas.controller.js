const { prisma } = require("../config/prisma/prisma");
const { successResponse } = require("../config/interfaces/success.interface");
const { validateFields } = require("../config/utils/rulesValidations");

async function assertEventOwnershipOrAdmin(eventId, user) {
    const event = await prisma.events.findFirst({
        where: {
            id: Number.parseInt(eventId, 10),
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

    if (user.role.id !== 1 && event.userId !== Number.parseInt(user.id, 10)) {
        throw new Error("Solo el organizador del evento puede gestionar su agenda");
    }

    return event;
}

exports.createAgenda = async (req, res, next) => {
    try {
        const validations = [
            {
                field: "activity",
                validations: [
                    { type: "required", message: "La actividad es requerida" },
                    { type: "min", value: 3, message: "La actividad debe tener al menos 3 caracteres" },
                    { type: "max", value: 255, message: "La actividad debe tener menos de 255 caracteres" },
                ],
            },
            {
                field: "startTime",
                validations: [
                    { type: "required", message: "La hora de inicio es requerida" },
                    { type: "datetime", message: "La hora de inicio debe ser una fecha y hora valida" },
                    { type: "max", value: req.body.endTime, message: "La hora de inicio debe ser menor a la hora de fin" },
                ],
            },
            {
                field: "endTime",
                validations: [
                    { type: "required", message: "La hora de fin es requerida" },
                    { type: "datetime", message: "La hora de fin debe ser una fecha y hora valida" },
                    { type: "min", value: req.body.startTime, message: "La hora de fin debe ser mayor a la hora de inicio" },
                ],
            },
            {
                field: "eventId",
                validations: [
                    { type: "required", message: "El evento es requerido" },
                    { type: "number", message: "El evento debe ser un numero" },
                ],
            },
        ];

        const validationErrors = validateFields(req.body, validations, res);
        if (validationErrors) return;

        const { activity, startTime, endTime, eventId } = req.body;
        await assertEventOwnershipOrAdmin(eventId, req.user);

        const newAgenda = await prisma.agendas.create({
            data: {
                activity,
                startTime,
                endTime,
                eventId,
            },
        });

        return res.json(successResponse("Agenda creada", newAgenda, 201));
    } catch (error) {
        next(error);
    }
};

exports.updateAgenda = async (req, res, next) => {
    try {
        const validations = [
            {
                field: "activity",
                validations: [
                    { type: "required", message: "La actividad es requerida" },
                    { type: "min", value: 3, message: "La actividad debe tener al menos 3 caracteres" },
                    { type: "max", value: 255, message: "La actividad debe tener menos de 255 caracteres" },
                ],
            },
            {
                field: "startTime",
                validations: [
                    { type: "required", message: "La hora de inicio es requerida" },
                    { type: "datetime", message: "La hora de inicio debe ser una fecha y hora valida" },
                    { type: "max", value: req.body.endTime, message: "La hora de inicio debe ser menor a la hora de fin" },
                ],
            },
            {
                field: "endTime",
                validations: [
                    { type: "required", message: "La hora de fin es requerida" },
                    { type: "datetime", message: "La hora de fin debe ser una fecha y hora valida" },
                    { type: "min", value: req.body.startTime, message: "La hora de fin debe ser mayor a la hora de inicio" },
                ],
            },
            {
                field: "eventId",
                validations: [
                    { type: "required", message: "El evento es requerido" },
                    { type: "number", message: "El evento debe ser un numero" },
                ],
            },
            {
                field: "status",
                validations: [
                    { type: "required", message: "El estado es requerido" },
                    { type: "in", value: ["PENDING", "IN_PROGRESS", "CONFIRMED", "CANCELLED", "COMPLETED", "ARCHIVED"], message: "Estado invalido" },
                ],
            },
        ];

        const validationErrors = validateFields(req.body, validations, res);
        if (validationErrors) return;

        const { id } = req.params;
        const { activity, startTime, endTime, eventId, status } = req.body;

        await assertEventOwnershipOrAdmin(eventId, req.user);

        const updatedAgenda = await prisma.agendas.update({
            where: { id: Number.parseInt(id, 10), deletedAt: null },
            data: { activity, startTime, endTime, eventId, status },
        });

        return res.json(successResponse("Agenda actualizada", updatedAgenda, 200));
    } catch (error) {
        next(error);
    }
};

exports.deleteAgenda = async (req, res, next) => {
    try {
        const { id } = req.params;

        const agenda = await prisma.agendas.findFirst({
            where: {
                id: Number.parseInt(id, 10),
                deletedAt: null,
            },
            select: {
                id: true,
                eventId: true,
            },
        });

        if (!agenda) {
            throw new Error("La agenda no existe");
        }

        await assertEventOwnershipOrAdmin(agenda.eventId, req.user);

        const deletedAgenda = await prisma.agendas.update({
            where: { id: agenda.id },
            data: { deletedAt: new Date() },
        });

        return res.json(successResponse("Agenda eliminada", deletedAgenda, 200));
    } catch (error) {
        next(error);
    }
};

exports.getAgendas = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, all = false, eventId, search } = req.query;

        const where = {
            deletedAt: null,
            event: {
                deletedAt: null,
            },
        };

        if (eventId) {
            where.eventId = Number.parseInt(eventId, 10);
        }

        if (search) {
            where.activity = {
                contains: String(search),
                mode: "insensitive",
            };
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
            },
            orderBy: {
                startTime: "asc",
            },
        };

        if (!all || all === "false") {
            query.skip = (Number.parseInt(page, 10) - 1) * Number.parseInt(limit, 10);
            query.take = Number.parseInt(limit, 10);
        }

        const [agendas, total] = await Promise.all([
            prisma.agendas.findMany(query),
            prisma.agendas.count({ where }),
        ]);

        return res.json(successResponse("Agendas obtenidas", {
            data: agendas,
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
