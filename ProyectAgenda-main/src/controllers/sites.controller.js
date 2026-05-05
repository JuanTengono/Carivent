const { prisma } = require("../config/prisma/prisma");
const { successResponse } = require("../config/interfaces/success.interface");
const { errorResponse } = require("../config/interfaces/errors.interface");
const { validateFields } = require("../config/utils/rulesValidations");
const { normalizeSiteMapFields, enrichSiteWithMapData } = require("../config/utils/siteMaps");

const MAX_IMAGE_URL_LENGTH = 2048;

function validateCoordinatePair(body, res) {
    const hasLatitude = body.latitude !== undefined && body.latitude !== null;
    const hasLongitude = body.longitude !== undefined && body.longitude !== null;

    if (hasLatitude !== hasLongitude) {
        res.status(400).json(errorResponse("Errores de validacion", [
            {
                field: hasLatitude ? "longitude" : "latitude",
                message: "latitude y longitude deben enviarse juntas",
            },
        ], 400));
        return true;
    }

    return false;
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

exports.createSite = async (req, res, next) => {
    try {
        normalizeOptionalImageUrl(req.body);
        normalizeSiteMapFields(req.body);

        const validations = [
            {
                field: "name",
                validations: [
                    { type: "required", message: "El nombre del sitio es requerido" },
                    { type: "min", value: 3, message: "El nombre del sitio debe tener al menos 3 caracteres" },
                    { type: "max", value: 50, message: "El nombre del sitio debe tener menos de 50 caracteres" },
                ],
            },
            {
                field: "ubication",
                validations: [
                    { type: "required", message: "La ubicacion del sitio es requerida" },
                    { type: "min", value: 3, message: "La ubicacion del sitio debe tener al menos 3 caracteres" },
                    { type: "max", value: 255, message: "La ubicacion del sitio debe tener menos de 255 caracteres" },
                ],
            },
            {
                field: "direction",
                validations: [
                    { type: "required", message: "La direccion del sitio es requerida" },
                    { type: "min", value: 3, message: "La direccion del sitio debe tener al menos 3 caracteres" },
                    { type: "max", value: 255, message: "La direccion del sitio debe tener menos de 255 caracteres" },
                ],
            },
            {
                field: "phone",
                validations: [
                    { type: "required", message: "El telefono del sitio es requerido" },
                    { type: "string", message: "El telefono del sitio debe ser una cadena de texto" },
                    { type: "min", value: 10, message: "El telefono del sitio debe tener al menos 10 caracteres" },
                    { type: "max", value: 12, message: "El telefono del sitio debe tener menos de 12 caracteres" },
                ],
            },
            {
                field: "email",
                validations: [
                    { type: "required", message: "El email del sitio es requerido" },
                    { type: "email", message: "El email del sitio no es valido" },
                ],
            },
            {
                field: "capacity",
                validations: [
                    { type: "required", message: "La capacidad del sitio es requerida" },
                    { type: "number", message: "La capacidad del sitio debe ser un numero" },
                    { type: "min", value: 1, message: "La capacidad del sitio debe ser al menos 1" },
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
                field: "latitude",
                validations: [
                    { type: "number", message: "latitude debe ser numerico" },
                    { type: "min", value: -90, message: "latitude debe ser mayor o igual a -90" },
                    { type: "max", value: 90, message: "latitude debe ser menor o igual a 90" },
                ],
            },
            {
                field: "longitude",
                validations: [
                    { type: "number", message: "longitude debe ser numerico" },
                    { type: "min", value: -180, message: "longitude debe ser mayor o igual a -180" },
                    { type: "max", value: 180, message: "longitude debe ser menor o igual a 180" },
                ],
            },
            buildImageUrlValidation(),
        ];

        const validationErrors = validateFields(req.body, validations, res);
        if (validationErrors) return;
        if (validateCoordinatePair(req.body, res)) return;

        const userId = Number.parseInt(req.user.id, 10);

        const newSite = await prisma.sites.create({
            data: {
                name: req.body.name,
                description: req.body.description || null,
                ubication: req.body.ubication,
                direction: req.body.direction,
                imageUrl: req.body.imageUrl,
                latitude: req.body.latitude ?? null,
                longitude: req.body.longitude ?? null,
                phone: req.body.phone,
                email: req.body.email,
                capacity: req.body.capacity,
                userId,
            },
        });

        return res.json(successResponse("Sitio creado", enrichSiteWithMapData(newSite), 201));
    } catch (error) {
        next(error);
    }
};

exports.updateSite = async (req, res, next) => {
    try {
        normalizeOptionalImageUrl(req.body);
        normalizeSiteMapFields(req.body);

        const validations = [
            {
                field: "name",
                validations: [
                    { type: "required", message: "El nombre del sitio es requerido" },
                    { type: "min", value: 3, message: "El nombre del sitio debe tener al menos 3 caracteres" },
                    { type: "max", value: 50, message: "El nombre del sitio debe tener menos de 50 caracteres" },
                ],
            },
            {
                field: "ubication",
                validations: [
                    { type: "required", message: "La ubicacion del sitio es requerida" },
                    { type: "min", value: 3, message: "La ubicacion del sitio debe tener al menos 3 caracteres" },
                    { type: "max", value: 255, message: "La ubicacion del sitio debe tener menos de 255 caracteres" },
                ],
            },
            {
                field: "direction",
                validations: [
                    { type: "required", message: "La direccion del sitio es requerida" },
                    { type: "min", value: 3, message: "La direccion del sitio debe tener al menos 3 caracteres" },
                    { type: "max", value: 255, message: "La direccion del sitio debe tener menos de 255 caracteres" },
                ],
            },
            {
                field: "phone",
                validations: [
                    { type: "required", message: "El telefono del sitio es requerido" },
                    { type: "string", message: "El telefono del sitio debe ser una cadena de texto" },
                    { type: "min", value: 10, message: "El telefono del sitio debe tener al menos 10 caracteres" },
                    { type: "max", value: 12, message: "El telefono del sitio debe tener menos de 12 caracteres" },
                ],
            },
            {
                field: "email",
                validations: [
                    { type: "required", message: "El email del sitio es requerido" },
                    { type: "email", message: "El email del sitio no es valido" },
                ],
            },
            {
                field: "capacity",
                validations: [
                    { type: "required", message: "La capacidad del sitio es requerida" },
                    { type: "number", message: "La capacidad del sitio debe ser un numero" },
                    { type: "min", value: 1, message: "La capacidad del sitio debe ser al menos 1" },
                ],
            },
            {
                field: "status",
                validations: [
                    { type: "required", message: "El estado del sitio es requerido" },
                    { type: "in", value: ["ACTIVE", "INACTIVE"], message: "El estado del sitio debe ser ACTIVE o INACTIVE" },
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
                field: "latitude",
                validations: [
                    { type: "number", message: "latitude debe ser numerico" },
                    { type: "min", value: -90, message: "latitude debe ser mayor o igual a -90" },
                    { type: "max", value: 90, message: "latitude debe ser menor o igual a 90" },
                ],
            },
            {
                field: "longitude",
                validations: [
                    { type: "number", message: "longitude debe ser numerico" },
                    { type: "min", value: -180, message: "longitude debe ser mayor o igual a -180" },
                    { type: "max", value: 180, message: "longitude debe ser menor o igual a 180" },
                ],
            },
            buildImageUrlValidation(),
        ];

        const validationErrors = validateFields(req.body, validations, res);
        if (validationErrors) return;
        if (validateCoordinatePair(req.body, res)) return;

        const siteId = Number.parseInt(req.params.id, 10);
        const requesterId = Number.parseInt(req.user.id, 10);

        const site = await prisma.sites.findFirst({
            where: {
                id: siteId,
                deletedAt: null,
            },
            select: {
                id: true,
                userId: true,
            },
        });

        if (!site) {
            throw new Error("El sitio no existe");
        }

        if (req.user.role.id !== 1 && site.userId !== requesterId) {
            throw new Error("Solo el propietario del sitio puede actualizarlo");
        }

        const siteData = {
            name: req.body.name,
            description: req.body.description || null,
            ubication: req.body.ubication,
            direction: req.body.direction,
            latitude: req.body.latitude ?? null,
            longitude: req.body.longitude ?? null,
            phone: req.body.phone,
            email: req.body.email,
            capacity: req.body.capacity,
            status: req.body.status,
        };

        if (Object.prototype.hasOwnProperty.call(req.body, "imageUrl")) {
            siteData.imageUrl = req.body.imageUrl;
        }

        const updatedSite = await prisma.sites.update({
            where: { id: siteId },
            data: siteData,
        });

        return res.json(successResponse("Sitio actualizado", enrichSiteWithMapData(updatedSite), 200));
    } catch (error) {
        next(error);
    }
};

exports.deleteSite = async (req, res, next) => {
    try {
        const siteId = Number.parseInt(req.params.id, 10);
        const requesterId = Number.parseInt(req.user.id, 10);

        const site = await prisma.sites.findFirst({
            where: {
                id: siteId,
                deletedAt: null,
            },
            select: {
                id: true,
                userId: true,
            },
        });

        if (!site) {
            throw new Error("El sitio no existe");
        }

        if (req.user.role.id !== 1 && site.userId !== requesterId) {
            throw new Error("Solo el propietario del sitio puede eliminarlo");
        }

        const deletedSite = await prisma.sites.update({
            where: { id: siteId },
            data: {
                deletedAt: new Date(),
                status: "INACTIVE",
            },
        });

        return res.json(successResponse("Sitio eliminado", deletedSite, 200));
    } catch (error) {
        next(error);
    }
};

exports.getSites = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, all = false, city, search } = req.query;

        const where = { deletedAt: null };

        if (req.user.role.id !== 1 && req.user.role.name !== "user") {
            where.userId = Number.parseInt(req.user.id, 10);
        }

        if (city) {
            where.ubication = {
                contains: String(city),
                mode: "insensitive",
            };
        }

        if (search) {
            where.OR = [
                { name: { contains: String(search), mode: "insensitive" } },
                { ubication: { contains: String(search), mode: "insensitive" } },
                { direction: { contains: String(search), mode: "insensitive" } },
            ];
        }

        const query = {
            where,
            include: {
                events: {
                    where: { deletedAt: null },
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        status: true,
                        description: true,
                        ticketPrice: true,
                        maxTicketsPerUser: true,
                        startTime: true,
                        endTime: true,
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

        const [sites, total] = await Promise.all([
            prisma.sites.findMany(query),
            prisma.sites.count({ where }),
        ]);

        const serializedSites = sites.map((site) => enrichSiteWithMapData(site));

        return res.json(successResponse("Sitios obtenidos", {
            data: serializedSites,
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
