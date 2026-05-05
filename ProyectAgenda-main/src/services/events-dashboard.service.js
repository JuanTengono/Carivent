const { prisma } = require("../config/prisma/prisma");

const SOLD_TICKET_STATUSES = ["ACTIVE", "PURCHASED", "USED"];
const ACTIVE_EVENT_STATUSES = ["PENDING", "CONFIRMED", "IN_PROGRESS"];
const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function toMoneyNumber(value) {
    const numberValue = Number(value || 0);
    return Number.isFinite(numberValue) ? Number(numberValue.toFixed(2)) : 0;
}

function parsePositiveInt(value, defaultValue, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
    if (value === undefined || value === null || value === "") {
        return defaultValue;
    }

    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
        throw new Error("Parametro numerico invalido");
    }

    return parsed;
}

function buildMonthlyBuckets({ months, endYear, endMonth }) {
    const buckets = [];

    for (let offset = months - 1; offset >= 0; offset -= 1) {
        const current = new Date(Date.UTC(endYear, endMonth - 1 - offset, 1));
        const year = current.getUTCFullYear();
        const month = current.getUTCMonth() + 1;

        buckets.push({
            year,
            month,
            label: MONTH_LABELS[month - 1],
            revenue: 0,
            soldTickets: 0,
        });
    }

    return buckets;
}

function buildScopedEventWhere(user) {
    const where = {
        deletedAt: null,
    };

    if (user.role.id !== 1) {
        where.userId = Number.parseInt(user.id, 10);
    }

    return where;
}

function resolveTicketEventDate(ticket) {
    const paymentDate = ticket.payment?.paidAt ? new Date(ticket.payment.paidAt) : null;
    if (paymentDate && !Number.isNaN(paymentDate.getTime())) {
        return paymentDate;
    }

    return new Date(ticket.createdAt);
}

exports.getEventsDashboardSummary = async ({ user, query }) => {
    const now = new Date();
    const months = parsePositiveInt(query.months, 6, { min: 1, max: 24 });
    const endYear = parsePositiveInt(query.endYear, now.getUTCFullYear(), { min: 2000, max: 3000 });
    const endMonth = parsePositiveInt(query.endMonth, now.getUTCMonth() + 1, { min: 1, max: 12 });

    const buckets = buildMonthlyBuckets({ months, endYear, endMonth });
    const startDate = new Date(Date.UTC(buckets[0].year, buckets[0].month - 1, 1, 0, 0, 0, 0));
    const endDateExclusive = new Date(Date.UTC(endYear, endMonth, 1, 0, 0, 0, 0));
    const scopedEventWhere = buildScopedEventWhere(user);

    const ticketWhere = {
        deletedAt: null,
        status: { in: SOLD_TICKET_STATUSES },
        event: {
            is: scopedEventWhere,
        },
        OR: [
            {
                createdAt: {
                    gte: startDate,
                    lt: endDateExclusive,
                },
            },
            {
                payment: {
                    is: {
                        deletedAt: null,
                        paidAt: {
                            gte: startDate,
                            lt: endDateExclusive,
                        },
                    },
                },
            },
        ],
    };

    const paymentWhere = {
        deletedAt: null,
        event: {
            is: scopedEventWhere,
        },
    };

    const [soldTickets, activeEvents, latestPayment] = await Promise.all([
        prisma.tickets.findMany({
            where: ticketWhere,
            select: {
                amount: true,
                createdAt: true,
                payment: {
                    select: {
                        paidAt: true,
                    },
                },
            },
        }),
        prisma.events.count({
            where: {
                ...scopedEventWhere,
                status: { in: ACTIVE_EVENT_STATUSES },
            },
        }),
        prisma.payments.findFirst({
            where: paymentWhere,
            select: {
                currency: true,
            },
            orderBy: {
                id: "desc",
            },
        }),
    ]);

    const bucketMap = new Map(
        buckets.map((bucket) => [`${bucket.year}-${String(bucket.month).padStart(2, "0")}`, bucket]),
    );

    soldTickets.forEach((ticket) => {
        const effectiveDate = resolveTicketEventDate(ticket);
        const key = `${effectiveDate.getUTCFullYear()}-${String(effectiveDate.getUTCMonth() + 1).padStart(2, "0")}`;
        const bucket = bucketMap.get(key);
        if (!bucket) {
            return;
        }

        bucket.revenue = toMoneyNumber(bucket.revenue + Number(ticket.amount || 0));
        bucket.soldTickets += 1;
    });

    const totalRevenue = buckets.reduce((accumulator, bucket) => accumulator + bucket.revenue, 0);
    const totalSoldTickets = buckets.reduce((accumulator, bucket) => accumulator + bucket.soldTickets, 0);

    return {
        summary: {
            currency: latestPayment?.currency || "COP",
            revenue: toMoneyNumber(totalRevenue),
            soldTickets: totalSoldTickets,
            activeEvents,
        },
        period: {
            months,
            startYear: buckets[0].year,
            startMonth: buckets[0].month,
            endYear,
            endMonth,
            totalRevenue: toMoneyNumber(totalRevenue),
        },
        monthlyRevenue: buckets,
    };
};
