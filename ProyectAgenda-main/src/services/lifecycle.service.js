const { prisma } = require("../config/prisma/prisma");
const { sendToNotificationRecords } = require("./push-notification.service");

function uniqueBy(list, keyBuilder) {
    const map = new Map();
    list.forEach((item) => {
        const key = keyBuilder(item);
        if (!map.has(key)) {
            map.set(key, item);
        }
    });
    return Array.from(map.values());
}

async function dispatchPushNotifications(records, context) {
    if (!Array.isArray(records) || records.length === 0) return;

    try {
        await sendToNotificationRecords(records);
    } catch (error) {
        console.error(JSON.stringify({
            event: "PUSH_NON_BLOCKING_ERROR",
            timestamp: new Date().toISOString(),
            context,
            error: error.message,
        }));
    }
}

async function notifyEventStatusChange({ eventId, eventName, newStatus }) {
    const ownerTickets = await prisma.tickets.findMany({
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

    const uniqueUsers = uniqueBy(ownerTickets, (item) => item.userId);
    if (uniqueUsers.length === 0) {
        return 0;
    }

    const createdNotifications = await prisma.notifications.createManyAndReturn({
        data: uniqueUsers.map((item) => ({
            userId: item.userId,
            title: "Actualizacion del evento",
            message: `El evento '${eventName}' cambio su estado a ${newStatus}.`,
            type: "EVENT",
        })),
        select: {
            id: true,
            userId: true,
            title: true,
            message: true,
            type: true,
        },
    });

    await dispatchPushNotifications(createdNotifications, "lifecycle.notifyEventStatusChange");

    return uniqueUsers.length;
}

async function expirePastTickets(now = new Date()) {
    const updated = await prisma.tickets.updateMany({
        where: {
            deletedAt: null,
            status: {
                in: ["ACTIVE", "PURCHASED", "AVAILABLE"],
            },
            event: {
                endTime: {
                    lt: now,
                },
            },
        },
        data: {
            status: "EXPIRED",
        },
    });

    return updated.count;
}

async function sendUpcomingEventReminders({ hoursAhead = 24, now = new Date() } = {}) {
    const upperWindow = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    const upcomingTickets = await prisma.tickets.findMany({
        where: {
            deletedAt: null,
            status: {
                in: ["ACTIVE", "PURCHASED"],
            },
            event: {
                deletedAt: null,
                status: {
                    in: ["CONFIRMED", "IN_PROGRESS"],
                },
                startTime: {
                    gte: now,
                    lte: upperWindow,
                },
            },
        },
        include: {
            event: {
                select: {
                    id: true,
                    name: true,
                    startTime: true,
                },
            },
        },
    });

    const uniqueReminders = uniqueBy(upcomingTickets, (item) => `${item.userId}-${item.eventId}`);
    if (uniqueReminders.length === 0) {
        return 0;
    }

    const createdNotifications = await prisma.notifications.createManyAndReturn({
        data: uniqueReminders.map((item) => ({
            userId: item.userId,
            title: "Recordatorio de evento",
            message: `Recuerda: '${item.event.name}' inicia en ${item.event.startTime.toISOString()}.`,
            type: "REMINDER",
        })),
        select: {
            id: true,
            userId: true,
            title: true,
            message: true,
            type: true,
        },
    });

    await dispatchPushNotifications(createdNotifications, "lifecycle.sendUpcomingEventReminders");

    return uniqueReminders.length;
}

async function sendPostEventSurveyPrompts({ now = new Date() } = {}) {
    const completedSurveys = await prisma.surveys.findMany({
        where: {
            deletedAt: null,
            event: {
                deletedAt: null,
                status: "COMPLETED",
                endTime: {
                    lte: now,
                },
            },
        },
        include: {
            event: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    let createdCount = 0;

    for (const survey of completedSurveys) {
        const attendees = await prisma.tickets.findMany({
            where: {
                eventId: survey.eventId,
                deletedAt: null,
                validated: true,
                status: {
                    in: ["USED", "ACTIVE", "PURCHASED"],
                },
            },
            select: {
                userId: true,
            },
        });

        const uniqueAttendees = uniqueBy(attendees, (item) => item.userId);
        if (uniqueAttendees.length === 0) {
            continue;
        }

        const existingNotifications = await prisma.notifications.findMany({
            where: {
                deletedAt: null,
                type: "SURVEY",
                message: {
                    contains: `surveyId=${survey.id}`,
                },
                userId: {
                    in: uniqueAttendees.map((item) => item.userId),
                },
            },
            select: {
                userId: true,
            },
        });

        const alreadyNotified = new Set(existingNotifications.map((item) => item.userId));
        const pendingUsers = uniqueAttendees.filter((item) => !alreadyNotified.has(item.userId));

        if (pendingUsers.length === 0) {
            continue;
        }

        const createdNotifications = await prisma.notifications.createManyAndReturn({
            data: pendingUsers.map((item) => ({
                userId: item.userId,
                title: "Encuesta postevento",
                message: `Comparte tu opinion del evento '${survey.event.name}'. surveyId=${survey.id}`,
                type: "SURVEY",
            })),
            select: {
                id: true,
                userId: true,
                title: true,
                message: true,
                type: true,
            },
        });

        await dispatchPushNotifications(createdNotifications, "lifecycle.sendPostEventSurveyPrompts");

        createdCount += pendingUsers.length;
    }

    return createdCount;
}

async function runLifecycleJobs() {
    const [expiredTickets, remindersSent, surveyPromptsSent] = await Promise.all([
        expirePastTickets(),
        sendUpcomingEventReminders(),
        sendPostEventSurveyPrompts(),
    ]);

    return {
        expiredTickets,
        remindersSent,
        surveyPromptsSent,
    };
}

module.exports = {
    notifyEventStatusChange,
    expirePastTickets,
    sendUpcomingEventReminders,
    sendPostEventSurveyPrompts,
    runLifecycleJobs,
};
