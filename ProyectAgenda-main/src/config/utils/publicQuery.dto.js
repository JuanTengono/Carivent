const EVENT_STATUSES = ["PENDING", "IN_PROGRESS", "CONFIRMED", "CANCELLED", "COMPLETED", "ARCHIVED"];
const EVENT_TYPES = ["PUBLIC", "PRIVATE"];

function isEmpty(value) {
    return value === undefined || value === null || value === "";
}

function parsePositiveInt(value, fieldName, defaultValue) {
    if (isEmpty(value)) return defaultValue;

    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
        throw new Error(`El parámetro '${fieldName}' debe ser un entero positivo`);
    }

    return parsed;
}

function parseBoolean(value, fieldName, defaultValue = false) {
    if (isEmpty(value)) return defaultValue;

    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "1"].includes(normalized)) return true;
        if (["false", "0"].includes(normalized)) return false;
    }

    throw new Error(`El parámetro '${fieldName}' debe ser booleano (true/false)`);
}

function parseDate(value, fieldName) {
    if (isEmpty(value)) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`El parámetro '${fieldName}' debe ser una fecha válida`);
    }

    return date;
}

function parseEnumList(value, allowedValues, fieldName) {
    if (isEmpty(value)) return null;

    const values = String(value)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    if (values.length === 0) {
        throw new Error(`El parámetro '${fieldName}' no puede estar vacío`);
    }

    const invalidValues = values.filter((item) => !allowedValues.includes(item));
    if (invalidValues.length > 0) {
        throw new Error(`Valores inválidos para '${fieldName}': ${invalidValues.join(", ")}`);
    }

    return values;
}

function parsePagination(query) {
    return {
        page: parsePositiveInt(query.page, "page", 1),
        limit: parsePositiveInt(query.limit, "limit", 20),
        all: parseBoolean(query.all, "all", false),
    };
}

function buildPublicEventsWhere(query) {
    const where = {
        deletedAt: null,
        site: {
            is: {
                deletedAt: null,
            },
        },
    };

    const search = isEmpty(query.search) ? null : String(query.search).trim();
    if (search) {
        where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            {
                site: {
                    is: {
                        deletedAt: null,
                        name: { contains: search, mode: "insensitive" },
                    },
                },
            },
            {
                site: {
                    is: {
                        deletedAt: null,
                        ubication: { contains: search, mode: "insensitive" },
                    },
                },
            },
        ];
    }

    const statuses = parseEnumList(query.status, EVENT_STATUSES, "status");
    if (statuses) {
        where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
    } else {
        where.status = { notIn: ["CANCELLED", "ARCHIVED"] };
    }

    const types = parseEnumList(query.type, EVENT_TYPES, "type");
    if (types) {
        where.type = types.length === 1 ? types[0] : { in: types };
    }

    if (!isEmpty(query.siteId)) {
        where.siteId = parsePositiveInt(query.siteId, "siteId");
    }

    const dateFrom = parseDate(query.dateFrom, "dateFrom");
    const dateTo = parseDate(query.dateTo, "dateTo");

    if (dateFrom && dateTo && dateFrom > dateTo) {
        throw new Error("El parámetro 'dateFrom' no puede ser mayor a 'dateTo'");
    }

    if (dateFrom || dateTo) {
        where.startTime = {};
        if (dateFrom) where.startTime.gte = dateFrom;
        if (dateTo) where.startTime.lte = dateTo;
    }

    return where;
}

function buildPublicSitesWhere(query) {
    const where = { deletedAt: null };

    const search = isEmpty(query.search) ? null : String(query.search).trim();
    if (search) {
        where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            { ubication: { contains: search, mode: "insensitive" } },
            { direction: { contains: search, mode: "insensitive" } },
        ];
    }

    const city = isEmpty(query.city) ? null : String(query.city).trim();
    if (city) {
        where.ubication = { contains: city, mode: "insensitive" };
    }

    return where;
}

function buildPublicAgendasWhere(query) {
    const where = {
        deletedAt: null,
        event: {
            is: {
                deletedAt: null,
                status: {
                    notIn: ["CANCELLED", "ARCHIVED"],
                },
            },
        },
    };

    if (!isEmpty(query.eventId)) {
        where.eventId = parsePositiveInt(query.eventId, "eventId");
    }

    const search = isEmpty(query.search) ? null : String(query.search).trim();
    if (search) {
        where.OR = [
            { activity: { contains: search, mode: "insensitive" } },
            {
                event: {
                    is: {
                        deletedAt: null,
                        name: { contains: search, mode: "insensitive" },
                    },
                },
            },
        ];
    }

    return where;
}

module.exports = {
    parsePagination,
    buildPublicEventsWhere,
    buildPublicSitesWhere,
    buildPublicAgendasWhere,
};
