const { prisma } = require("../config/prisma/prisma");
const {
    parsePagination,
    buildPublicEventsWhere,
    buildPublicSitesWhere,
    buildPublicAgendasWhere,
} = require("../config/utils/publicQuery.dto");
const { enrichSiteWithMapData } = require("../config/utils/siteMaps");
const { getEventCapacity } = require("./ticketing.service");

function buildPagination({ all, page, limit, total, itemsLength }) {
    if (all) {
        return {
            page: 1,
            limit: itemsLength,
            total,
            totalPages: total > 0 ? 1 : 0,
        };
    }

    return {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    };
}

exports.getPublicEvents = async (query) => {
    const { page, limit, all } = parsePagination(query);
    const where = buildPublicEventsWhere(query);

    const prismaQuery = {
        where,
        select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            type: true,
            status: true,
            ticketPrice: true,
            maxTicketsPerUser: true,
            startTime: true,
            endTime: true,
            siteId: true,
            site: {
                select: {
                    id: true,
                    name: true,
                    imageUrl: true,
                    ubication: true,
                    direction: true,
                    latitude: true,
                    longitude: true,
                },
            },
        },
        orderBy: {
            startTime: "asc",
        },
    };

    if (!all) {
        prismaQuery.skip = (page - 1) * limit;
        prismaQuery.take = limit;
    }

    const [events, total] = await Promise.all([
        prisma.events.findMany(prismaQuery),
        prisma.events.count({ where }),
    ]);

    const items = events.map((event) => ({
        id: event.id,
        name: event.name,
        description: event.description,
        imageUrl: event.imageUrl,
        type: event.type,
        status: event.status,
        ticketPrice: Number(event.ticketPrice || 0),
        maxTicketsPerUser: event.maxTicketsPerUser,
        startTime: event.startTime,
        endTime: event.endTime,
        siteId: event.siteId,
        site: event.site
            ? enrichSiteWithMapData({
                id: event.site.id,
                name: event.site.name,
                imageUrl: event.site.imageUrl,
                city: event.site.ubication,
                address: event.site.direction,
                latitude: event.site.latitude,
                longitude: event.site.longitude,
            })
            : null,
    }));

    return {
        items,
        pagination: buildPagination({ all, page, limit, total, itemsLength: items.length }),
    };
};

exports.getPublicSites = async (query) => {
    const { page, limit, all } = parsePagination(query);
    const where = buildPublicSitesWhere(query);

    const prismaQuery = {
        where,
        select: {
            id: true,
            name: true,
            imageUrl: true,
            ubication: true,
            direction: true,
            latitude: true,
            longitude: true,
            capacity: true,
            status: true,
        },
        orderBy: {
            name: "asc",
        },
    };

    if (!all) {
        prismaQuery.skip = (page - 1) * limit;
        prismaQuery.take = limit;
    }

    const [sites, total] = await Promise.all([
        prisma.sites.findMany(prismaQuery),
        prisma.sites.count({ where }),
    ]);

    const items = sites.map((site) => enrichSiteWithMapData({
        id: site.id,
        name: site.name,
        imageUrl: site.imageUrl,
        city: site.ubication,
        address: site.direction,
        latitude: site.latitude,
        longitude: site.longitude,
        capacity: site.capacity,
        status: site.status,
    }));

    return {
        items,
        pagination: buildPagination({ all, page, limit, total, itemsLength: items.length }),
    };
};

exports.getPublicAgendas = async (query) => {
    const { page, limit, all } = parsePagination(query);
    const where = buildPublicAgendasWhere(query);

    const prismaQuery = {
        where,
        include: {
            event: {
                select: {
                    id: true,
                    name: true,
                    imageUrl: true,
                    status: true,
                    startTime: true,
                    endTime: true,
                    site: {
                        select: {
                            id: true,
                            name: true,
                            imageUrl: true,
                            ubication: true,
                            direction: true,
                            latitude: true,
                            longitude: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            startTime: "asc",
        },
    };

    if (!all) {
        prismaQuery.skip = (page - 1) * limit;
        prismaQuery.take = limit;
    }

    const [items, total] = await Promise.all([
        prisma.agendas.findMany(prismaQuery),
        prisma.agendas.count({ where }),
    ]);

    const serializedItems = items.map((agenda) => ({
        ...agenda,
        event: agenda.event
            ? {
                ...agenda.event,
                site: enrichSiteWithMapData(agenda.event.site),
            }
            : null,
    }));

    return {
        items: serializedItems,
        pagination: buildPagination({ all, page, limit, total, itemsLength: items.length }),
    };
};

exports.getPublicEventCapacity = async (eventId) => {
    return getEventCapacity(eventId);
};
