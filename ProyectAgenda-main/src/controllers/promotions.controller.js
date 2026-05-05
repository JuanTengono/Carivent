const { prisma } = require("../config/prisma/prisma");
const { successResponse } = require("../config/interfaces/success.interface");
const { validateFields } = require("../config/utils/rulesValidations");

function parseOptionalDate(value, fieldName) {
    if (value === undefined || value === null || value === "") return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`El campo ${fieldName} debe ser una fecha valida`);
    }
    return parsed;
}

exports.createPromotion = async (req, res, next) => {
    try {
        const validations = [
            {
                field: "code",
                validations: [
                    { type: "required", message: "El codigo es requerido" },
                    { type: "string", message: "El codigo debe ser texto" },
                    { type: "min", value: 3, message: "El codigo debe tener al menos 3 caracteres" },
                    { type: "max", value: 40, message: "El codigo debe tener menos de 40 caracteres" },
                ],
            },
            {
                field: "title",
                validations: [
                    { type: "required", message: "El titulo es requerido" },
                    { type: "string", message: "El titulo debe ser texto" },
                    { type: "min", value: 3, message: "El titulo debe tener al menos 3 caracteres" },
                    { type: "max", value: 120, message: "El titulo debe tener menos de 120 caracteres" },
                ],
            },
            {
                field: "description",
                validations: [
                    { type: "string", message: "La descripcion debe ser texto" },
                    { type: "max", value: 500, message: "La descripcion debe tener menos de 500 caracteres" },
                ],
            },
            {
                field: "discountType",
                validations: [
                    { type: "required", message: "El tipo de descuento es requerido" },
                    { type: "in", value: ["PERCENT", "FIXED"], message: "discountType debe ser PERCENT o FIXED" },
                ],
            },
            {
                field: "discountValue",
                validations: [
                    { type: "required", message: "El valor del descuento es requerido" },
                    { type: "number", message: "El valor del descuento debe ser numerico" },
                    { type: "min", value: 0.01, message: "El valor del descuento debe ser mayor a 0" },
                ],
            },
            {
                field: "minQuantity",
                validations: [
                    { type: "number", message: "minQuantity debe ser numerico" },
                    { type: "min", value: 1, message: "minQuantity minimo es 1" },
                ],
            },
            {
                field: "maxUses",
                validations: [
                    { type: "number", message: "maxUses debe ser numerico" },
                    { type: "min", value: 1, message: "maxUses minimo es 1" },
                ],
            },
            {
                field: "validFrom",
                validations: [
                    { type: "datetime", message: "validFrom debe ser fecha valida" },
                ],
            },
            {
                field: "validTo",
                validations: [
                    { type: "datetime", message: "validTo debe ser fecha valida" },
                ],
            },
            {
                field: "eventId",
                validations: [
                    { type: "number", message: "eventId debe ser numerico" },
                ],
            },
            {
                field: "isActive",
                validations: [
                    { type: "boolean", message: "isActive debe ser booleano" },
                ],
            },
        ];

        const validationErrors = validateFields(req.body, validations, res);
        if (validationErrors) return;

        const userId = Number.parseInt(req.user.id, 10);
        const parsedEventId = req.body.eventId ? Number.parseInt(req.body.eventId, 10) : null;

        if (parsedEventId) {
            const event = await prisma.events.findFirst({
                where: {
                    id: parsedEventId,
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

            if (req.user.role.id !== 1 && event.userId !== userId) {
                throw new Error("Solo el organizador del evento puede crear promociones para este evento");
            }
        }

        const validFrom = parseOptionalDate(req.body.validFrom, "validFrom");
        const validTo = parseOptionalDate(req.body.validTo, "validTo");

        if (validFrom && validTo && validFrom > validTo) {
            throw new Error("validFrom no puede ser mayor a validTo");
        }

        const promotion = await prisma.promotions.create({
            data: {
                code: String(req.body.code).trim().toUpperCase(),
                title: String(req.body.title).trim(),
                description: req.body.description || null,
                discountType: req.body.discountType,
                discountValue: req.body.discountValue,
                minQuantity: req.body.minQuantity || 1,
                maxUses: req.body.maxUses || null,
                validFrom,
                validTo,
                isActive: req.body.isActive !== undefined ? req.body.isActive : true,
                eventId: parsedEventId,
                userId,
            },
            include: {
                event: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        return res.json(successResponse("Promocion creada", promotion, 201));
    } catch (error) {
        next(error);
    }
};

exports.updatePromotion = async (req, res, next) => {
    try {
        const validations = [
            {
                field: "title",
                validations: [
                    { type: "string", message: "El titulo debe ser texto" },
                    { type: "min", value: 3, message: "El titulo debe tener al menos 3 caracteres" },
                    { type: "max", value: 120, message: "El titulo debe tener menos de 120 caracteres" },
                ],
            },
            {
                field: "description",
                validations: [
                    { type: "string", message: "La descripcion debe ser texto" },
                    { type: "max", value: 500, message: "La descripcion debe tener menos de 500 caracteres" },
                ],
            },
            {
                field: "discountType",
                validations: [
                    { type: "in", value: ["PERCENT", "FIXED"], message: "discountType debe ser PERCENT o FIXED" },
                ],
            },
            {
                field: "discountValue",
                validations: [
                    { type: "number", message: "discountValue debe ser numerico" },
                    { type: "min", value: 0.01, message: "discountValue debe ser mayor a 0" },
                ],
            },
            {
                field: "minQuantity",
                validations: [
                    { type: "number", message: "minQuantity debe ser numerico" },
                    { type: "min", value: 1, message: "minQuantity minimo es 1" },
                ],
            },
            {
                field: "maxUses",
                validations: [
                    { type: "number", message: "maxUses debe ser numerico" },
                    { type: "min", value: 1, message: "maxUses minimo es 1" },
                ],
            },
            {
                field: "validFrom",
                validations: [
                    { type: "datetime", message: "validFrom debe ser fecha valida" },
                ],
            },
            {
                field: "validTo",
                validations: [
                    { type: "datetime", message: "validTo debe ser fecha valida" },
                ],
            },
            {
                field: "isActive",
                validations: [
                    { type: "boolean", message: "isActive debe ser booleano" },
                ],
            },
        ];

        const validationErrors = validateFields(req.body, validations, res);
        if (validationErrors) return;

        if (Object.keys(req.body).length === 0) {
            throw new Error("Debes enviar al menos un campo para actualizar");
        }

        const promotionId = Number.parseInt(req.params.id, 10);
        const requesterId = Number.parseInt(req.user.id, 10);

        const promotion = await prisma.promotions.findFirst({
            where: {
                id: promotionId,
                deletedAt: null,
            },
            include: {
                event: {
                    select: {
                        userId: true,
                    },
                },
            },
        });

        if (!promotion) {
            throw new Error("La promocion no existe");
        }

        const isOwner = promotion.userId === requesterId;
        const isEventOwner = promotion.event && promotion.event.userId === requesterId;
        if (req.user.role.id !== 1 && !isOwner && !isEventOwner) {
            throw new Error("No puedes actualizar esta promocion");
        }

        const validFrom = parseOptionalDate(req.body.validFrom, "validFrom");
        const validTo = parseOptionalDate(req.body.validTo, "validTo");

        const finalValidFrom = req.body.validFrom !== undefined ? validFrom : promotion.validFrom;
        const finalValidTo = req.body.validTo !== undefined ? validTo : promotion.validTo;

        if (finalValidFrom && finalValidTo && finalValidFrom > finalValidTo) {
            throw new Error("validFrom no puede ser mayor a validTo");
        }

        const updatedPromotion = await prisma.promotions.update({
            where: {
                id: promotionId,
            },
            data: {
                title: req.body.title !== undefined ? req.body.title : promotion.title,
                description: req.body.description !== undefined ? req.body.description : promotion.description,
                discountType: req.body.discountType !== undefined ? req.body.discountType : promotion.discountType,
                discountValue: req.body.discountValue !== undefined ? req.body.discountValue : promotion.discountValue,
                minQuantity: req.body.minQuantity !== undefined ? req.body.minQuantity : promotion.minQuantity,
                maxUses: req.body.maxUses !== undefined ? req.body.maxUses : promotion.maxUses,
                validFrom: req.body.validFrom !== undefined ? validFrom : promotion.validFrom,
                validTo: req.body.validTo !== undefined ? validTo : promotion.validTo,
                isActive: req.body.isActive !== undefined ? req.body.isActive : promotion.isActive,
            },
        });

        return res.json(successResponse("Promocion actualizada", updatedPromotion, 200));
    } catch (error) {
        next(error);
    }
};

exports.deletePromotion = async (req, res, next) => {
    try {
        const promotionId = Number.parseInt(req.params.id, 10);
        const requesterId = Number.parseInt(req.user.id, 10);

        const promotion = await prisma.promotions.findFirst({
            where: {
                id: promotionId,
                deletedAt: null,
            },
            include: {
                event: {
                    select: {
                        userId: true,
                    },
                },
            },
        });

        if (!promotion) {
            throw new Error("La promocion no existe");
        }

        const isOwner = promotion.userId === requesterId;
        const isEventOwner = promotion.event && promotion.event.userId === requesterId;
        if (req.user.role.id !== 1 && !isOwner && !isEventOwner) {
            throw new Error("No puedes eliminar esta promocion");
        }

        const deletedPromotion = await prisma.promotions.update({
            where: { id: promotionId },
            data: {
                deletedAt: new Date(),
                isActive: false,
            },
        });

        return res.json(successResponse("Promocion eliminada", deletedPromotion, 200));
    } catch (error) {
        next(error);
    }
};

exports.getPromotions = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, all = false, eventId, search, isActive, code } = req.query;
        const requesterId = Number.parseInt(req.user.id, 10);

        const where = {
            deletedAt: null,
        };

        if (eventId) {
            where.OR = [
                { eventId: Number.parseInt(eventId, 10) },
                { eventId: null },
            ];
        }

        if (isActive !== undefined) {
            where.isActive = String(isActive) === "true";
        }

        if (code) {
            where.code = String(code).trim().toUpperCase();
        }

        if (search) {
            where.AND = [
                ...(where.AND || []),
                {
                    OR: [
                        { title: { contains: String(search), mode: "insensitive" } },
                        { code: { contains: String(search).toUpperCase(), mode: "insensitive" } },
                        { description: { contains: String(search), mode: "insensitive" } },
                    ],
                },
            ];
        }

        if (req.user.role.id !== 1) {
            where.AND = [
                ...(where.AND || []),
                {
                    OR: [
                        { userId: requesterId },
                        { isActive: true },
                    ],
                },
            ];
        }

        const query = {
            where,
            include: {
                event: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        payments: {
                            where: {
                                deletedAt: null,
                            },
                        },
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

        const [items, total] = await Promise.all([
            prisma.promotions.findMany(query),
            prisma.promotions.count({ where }),
        ]);

        return res.json(successResponse("Promociones obtenidas", {
            data: items,
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
