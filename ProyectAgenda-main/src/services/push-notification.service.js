const { prisma } = require("../config/prisma/prisma");
const { getFirebaseMessaging } = require("./firebase-admin.service");

const INVALID_TOKEN_ERRORS = new Set([
    "messaging/registration-token-not-registered",
    "messaging/invalid-registration-token",
]);

function logPush(event, extra = {}) {
    console.info(JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        ...extra,
    }));
}

function normalizeUserIds(userIds) {
    return [...new Set(
        (Array.isArray(userIds) ? userIds : [])
            .map((value) => Number.parseInt(value, 10))
            .filter((value) => Number.isInteger(value) && value > 0)
    )];
}

function stringifyValue(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
        return String(value);
    }

    try {
        return JSON.stringify(value);
    } catch (error) {
        return String(value);
    }
}

function toDataPayload(payload) {
    const base = {
        notificationId: stringifyValue(payload.notificationId || ""),
        type: stringifyValue(payload.type || "SYSTEM"),
        title: stringifyValue(payload.title || ""),
        body: stringifyValue(payload.message || ""),
    };

    const extra = {};
    const inputData = payload.data && typeof payload.data === "object" ? payload.data : {};
    Object.keys(inputData).forEach((key) => {
        extra[String(key)] = stringifyValue(inputData[key]);
    });

    return {
        ...base,
        ...extra,
    };
}

async function markInvalidTokensDeleted(tokens) {
    const normalized = [...new Set((tokens || []).filter(Boolean))];
    if (normalized.length === 0) return 0;

    const result = await prisma.notificationDevices.updateMany({
        where: {
            token: { in: normalized },
            deletedAt: null,
        },
        data: {
            deletedAt: new Date(),
        },
    });

    return result.count;
}

function buildMulticastMessage(tokens, payload) {
    return {
        tokens,
        notification: {
            title: payload.title || "",
            body: payload.message || "",
        },
        data: toDataPayload(payload),
        android: {
            priority: "high",
        },
    };
}

async function sendWithMessaging(messaging, tokens, payload) {
    const response = await messaging.sendEachForMulticast(buildMulticastMessage(tokens, payload));

    let successCount = 0;
    let failureCount = 0;
    const invalidTokens = [];

    response.responses.forEach((item, index) => {
        if (item.success) {
            successCount += 1;
            return;
        }

        failureCount += 1;
        const code = item.error?.code;
        if (INVALID_TOKEN_ERRORS.has(code)) {
            invalidTokens.push(tokens[index]);
        }
    });

    return {
        successCount,
        failureCount,
        invalidTokens,
    };
}

async function sendToUsers(userIds, payload) {
    const normalizedUserIds = normalizeUserIds(userIds);
    if (normalizedUserIds.length === 0) {
        return {
            attemptedUsers: 0,
            attemptedTokens: 0,
            successCount: 0,
            invalidTokenCount: 0,
            failureCount: 0,
            skipped: true,
            reason: "empty_user_ids",
        };
    }

    const devices = await prisma.notificationDevices.findMany({
        where: {
            userId: { in: normalizedUserIds },
            deletedAt: null,
        },
        select: {
            token: true,
        },
    });

    const tokens = [...new Set(devices.map((item) => item.token).filter(Boolean))];

    logPush("PUSH_SEND_ATTEMPT", {
        attemptedUsers: normalizedUserIds.length,
        attemptedTokens: tokens.length,
        type: payload?.type || "SYSTEM",
    });

    if (tokens.length === 0) {
        const result = {
            attemptedUsers: normalizedUserIds.length,
            attemptedTokens: 0,
            successCount: 0,
            invalidTokenCount: 0,
            failureCount: 0,
            skipped: true,
            reason: "no_active_tokens",
        };

        logPush("PUSH_SEND_RESULT", result);
        return result;
    }

    const messaging = getFirebaseMessaging();
    if (!messaging) {
        const result = {
            attemptedUsers: normalizedUserIds.length,
            attemptedTokens: tokens.length,
            successCount: 0,
            invalidTokenCount: 0,
            failureCount: 0,
            skipped: true,
            reason: "firebase_not_available",
        };

        logPush("PUSH_SEND_RESULT", result);
        return result;
    }

    try {
        const sendResult = await sendWithMessaging(messaging, tokens, payload || {});
        const invalidTokenCount = sendResult.invalidTokens.length;
        await markInvalidTokensDeleted(sendResult.invalidTokens);

        const result = {
            attemptedUsers: normalizedUserIds.length,
            attemptedTokens: tokens.length,
            successCount: sendResult.successCount,
            invalidTokenCount,
            failureCount: sendResult.failureCount,
            skipped: false,
        };

        logPush("PUSH_SEND_RESULT", result);
        return result;
    } catch (error) {
        const result = {
            attemptedUsers: normalizedUserIds.length,
            attemptedTokens: tokens.length,
            successCount: 0,
            invalidTokenCount: 0,
            failureCount: tokens.length,
            skipped: false,
            error: error.message,
        };

        logPush("PUSH_SEND_RESULT", result);
        return result;
    }
}

async function sendToUser(userId, payload) {
    return sendToUsers([userId], payload);
}

async function sendToNotificationRecords(records) {
    const normalizedRecords = (Array.isArray(records) ? records : [])
        .map((item) => ({
            id: item?.id,
            userId: Number.parseInt(item?.userId, 10),
            title: item?.title || "",
            message: item?.message || "",
            type: item?.type || "SYSTEM",
            data: item?.data || {},
        }))
        .filter((item) => Number.isInteger(item.userId) && item.userId > 0);

    if (normalizedRecords.length === 0) {
        return {
            recordCount: 0,
            attemptedTokens: 0,
            successCount: 0,
            invalidTokenCount: 0,
            failureCount: 0,
            skipped: true,
            reason: "empty_records",
        };
    }

    const userIds = [...new Set(normalizedRecords.map((item) => item.userId))];
    const devices = await prisma.notificationDevices.findMany({
        where: {
            userId: { in: userIds },
            deletedAt: null,
        },
        select: {
            userId: true,
            token: true,
        },
    });

    const tokenByUser = new Map();
    devices.forEach((item) => {
        if (!item.token) return;
        const existing = tokenByUser.get(item.userId) || [];
        existing.push(item.token);
        tokenByUser.set(item.userId, existing);
    });

    const messaging = getFirebaseMessaging();
    const attemptedTokens = normalizedRecords.reduce((acc, record) => {
        const tokens = tokenByUser.get(record.userId) || [];
        return acc + tokens.length;
    }, 0);

    logPush("PUSH_BATCH_SEND_ATTEMPT", {
        recordCount: normalizedRecords.length,
        attemptedTokens,
    });

    if (!messaging) {
        const result = {
            recordCount: normalizedRecords.length,
            attemptedTokens,
            successCount: 0,
            invalidTokenCount: 0,
            failureCount: 0,
            skipped: true,
            reason: "firebase_not_available",
        };
        logPush("PUSH_BATCH_SEND_RESULT", result);
        return result;
    }

    let successCount = 0;
    let failureCount = 0;
    const invalidTokens = new Set();

    for (const record of normalizedRecords) {
        const tokens = [...new Set((tokenByUser.get(record.userId) || []).filter(Boolean))];
        if (tokens.length === 0) {
            continue;
        }

        try {
            const sendResult = await sendWithMessaging(messaging, tokens, {
                title: record.title,
                message: record.message,
                type: record.type,
                notificationId: record.id,
                data: record.data,
            });

            successCount += sendResult.successCount;
            failureCount += sendResult.failureCount;
            sendResult.invalidTokens.forEach((token) => invalidTokens.add(token));
        } catch (error) {
            failureCount += tokens.length;
            logPush("PUSH_BATCH_ITEM_FAILURE", {
                userId: record.userId,
                notificationId: record.id,
                tokenCount: tokens.length,
                error: error.message,
            });
        }
    }

    const invalidTokenCount = invalidTokens.size;
    await markInvalidTokensDeleted(Array.from(invalidTokens));

    const result = {
        recordCount: normalizedRecords.length,
        attemptedTokens,
        successCount,
        invalidTokenCount,
        failureCount,
        skipped: false,
    };
    logPush("PUSH_BATCH_SEND_RESULT", result);
    return result;
}

module.exports = {
    sendToUsers,
    sendToUser,
    sendToNotificationRecords,
};
