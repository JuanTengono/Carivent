const { prisma } = require("../config/prisma/prisma");
const { successResponse } = require("../config/interfaces/success.interface");
const { validateFields } = require("../config/utils/rulesValidations");

exports.createSurvey = async (req, res, next) => {
    try {
        const validations = [
            { field: "titleSurvey", validations: [
                { type: "required", message: "El título de la encuesta es requerido" },
                { type: "min", value: 3, message: "El título de la encuesta debe tener al menos 3 caracteres" },
                { type: "max", value: 120, message: "El título de la encuesta debe tener menos de 120 caracteres" },
            ]},
            { field: "eventId", validations: [
                { type: "required", message: "El evento es requerido" },
                { type: "number", message: "El evento debe ser un número" },
            ]},
        ];

        const validationErrors = validateFields(req.body, validations, res);
        if (validationErrors) return;

        const { titleSurvey, eventId } = req.body;
        const userId = parseInt(req.user.id);

        const event = await prisma.events.findFirst({
            where: { id: parseInt(eventId), deletedAt: null }
        });

        if (!event) {
            throw new Error("El evento no existe");
        }

        if (req.user.role.id !== 1 && event.userId !== userId) {
            throw new Error("Solo el creador del evento puede crear encuestas para este evento");
        }

        const existingSurvey = await prisma.surveys.findFirst({
            where: {
                eventId: parseInt(eventId),
                deletedAt: null,
            }
        });

        if (existingSurvey) {
            throw new Error("Ya existe una encuesta activa para este evento");
        }

        const survey = await prisma.surveys.create({
            data: {
                titleSurvey,
                eventId: parseInt(eventId),
                userId,
            },
            include: {
                event: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            }
        });

        return res.json(successResponse("Encuesta creada", survey, 201));
    } catch (error) {
        next(error);
    }
};

exports.getSurveys = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, all = false, eventId } = req.query;
        const where = { deletedAt: null };

        if (eventId) {
            where.eventId = parseInt(eventId);
        }

        if (req.user.role.id !== 1) {
            where.userId = parseInt(req.user.id);
        }

        const query = {
            where,
            include: {
                event: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                _count: {
                    select: {
                        responses: {
                            where: { deletedAt: null }
                        }
                    }
                }
            },
            orderBy: {
                id: "desc",
            }
        };

        if (!all || all === "false") {
            query.skip = (parseInt(page) - 1) * parseInt(limit);
            query.take = parseInt(limit);
        }

        const [surveys, total] = await Promise.all([
            prisma.surveys.findMany(query),
            prisma.surveys.count({ where })
        ]);

        return res.json(successResponse("Encuestas obtenidas", {
            data: surveys,
            pagination: {
                page,
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit),
            }
        }, 200));
    } catch (error) {
        next(error);
    }
};

exports.createSurveyResponse = async (req, res, next) => {
    try {
        const validations = [
            { field: "surveyId", validations: [
                { type: "required", message: "La encuesta es requerida" },
                { type: "number", message: "La encuesta debe ser un número" },
            ]},
            { field: "stars", validations: [
                { type: "required", message: "La calificación es requerida" },
                { type: "number", message: "La calificación debe ser un número" },
                { type: "min", value: 1, message: "La calificación mínima es 1" },
                { type: "max", value: 5, message: "La calificación máxima es 5" },
            ]},
            { field: "comment", validations: [
                { type: "max", value: 500, message: "El comentario debe tener menos de 500 caracteres" },
            ]},
        ];

        const validationErrors = validateFields(req.body, validations, res);
        if (validationErrors) return;

        const { surveyId, stars, comment = null } = req.body;
        const userId = parseInt(req.user.id);

        const survey = await prisma.surveys.findFirst({
            where: { id: parseInt(surveyId), deletedAt: null },
            include: {
                event: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            }
        });

        if (!survey) {
            throw new Error("La encuesta no existe");
        }

        const validatedTicket = await prisma.tickets.findFirst({
            where: {
                eventId: survey.eventId,
                userId,
                validated: true,
                deletedAt: null,
                status: "ACTIVE"
            }
        });

        if (!validatedTicket) {
            throw new Error("Solo los asistentes con boleta validada pueden responder esta encuesta");
        }

        const existingResponse = await prisma.surveyResponses.findFirst({
            where: {
                surveyId: parseInt(surveyId),
                userId,
                deletedAt: null,
            }
        });

        if (existingResponse) {
            throw new Error("Ya respondiste esta encuesta");
        }

        const response = await prisma.surveyResponses.create({
            data: {
                surveyId: parseInt(surveyId),
                userId,
                stars: parseInt(stars),
                comment,
            }
        });

        return res.json(successResponse("Respuesta de encuesta registrada", response, 201));
    } catch (error) {
        next(error);
    }
};

exports.getSurveyResponses = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, all = false, surveyId } = req.query;
        const where = { deletedAt: null };

        if (surveyId) {
            where.surveyId = parseInt(surveyId);
        }

        if (req.user.role.id !== 1) {
            where.survey = {
                userId: parseInt(req.user.id),
            };
        }

        const query = {
            where,
            include: {
                survey: {
                    select: {
                        id: true,
                        titleSurvey: true,
                        event: {
                            select: {
                                id: true,
                                name: true,
                            }
                        }
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            },
            orderBy: {
                id: "desc",
            }
        };

        if (!all || all === "false") {
            query.skip = (parseInt(page) - 1) * parseInt(limit);
            query.take = parseInt(limit);
        }

        const [responses, total] = await Promise.all([
            prisma.surveyResponses.findMany(query),
            prisma.surveyResponses.count({ where })
        ]);

        return res.json(successResponse("Respuestas de encuestas obtenidas", {
            data: responses,
            pagination: {
                page,
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit),
            }
        }, 200));
    } catch (error) {
        next(error);
    }
};
