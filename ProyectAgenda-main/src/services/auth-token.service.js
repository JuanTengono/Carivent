const crypto = require("crypto");
const { prisma } = require("../config/prisma/prisma");

const DEFAULT_TOKEN_TTL_MINUTES = {
    EMAIL_VERIFICATION: 24 * 60,
    PASSWORD_RESET: 30,
};

function toPositiveInt(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function resolveTokenTtlMinutes(type) {
    const envVar = type === "EMAIL_VERIFICATION"
        ? "EMAIL_VERIFICATION_TOKEN_TTL_MINUTES"
        : "PASSWORD_RESET_TOKEN_TTL_MINUTES";

    return toPositiveInt(process.env[envVar]) || DEFAULT_TOKEN_TTL_MINUTES[type] || 30;
}

function hashToken(token) {
    return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function createRandomToken() {
    return crypto.randomBytes(32).toString("hex");
}

async function issueUserAuthToken({ userId, type }) {
    const normalizedUserId = Number.parseInt(userId, 10);
    if (!Number.isInteger(normalizedUserId) || normalizedUserId < 1) {
        throw new Error("Usuario invalido para generar token");
    }

    if (!["EMAIL_VERIFICATION", "PASSWORD_RESET"].includes(type)) {
        throw new Error("Tipo de token invalido");
    }

    const now = new Date();
    const ttlMinutes = resolveTokenTtlMinutes(type);
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);
    const token = createRandomToken();
    const tokenHash = hashToken(token);

    await prisma.$transaction(async (tx) => {
        await tx.userAuthTokens.updateMany({
            where: {
                userId: normalizedUserId,
                type,
                usedAt: null,
                deletedAt: null,
            },
            data: {
                deletedAt: now,
            },
        });

        await tx.userAuthTokens.create({
            data: {
                userId: normalizedUserId,
                type,
                tokenHash,
                expiresAt,
            },
        });
    });

    return {
        token,
        expiresAt,
        ttlMinutes,
    };
}

async function consumeUserAuthToken({ token, type }) {
    if (!token || typeof token !== "string") {
        throw new Error("Token requerido");
    }

    if (!["EMAIL_VERIFICATION", "PASSWORD_RESET"].includes(type)) {
        throw new Error("Tipo de token invalido");
    }

    const tokenHash = hashToken(token);

    return prisma.$transaction(async (tx) => {
        const authToken = await tx.userAuthTokens.findFirst({
            where: {
                type,
                tokenHash,
                deletedAt: null,
            },
            include: {
                user: {
                    include: {
                        role: true,
                    },
                },
            },
            orderBy: {
                id: "desc",
            },
        });

        if (!authToken) {
            throw new Error("Token invalido o expirado");
        }

        if (authToken.usedAt) {
            throw new Error("El token ya fue utilizado");
        }

        if (authToken.expiresAt < new Date()) {
            throw new Error("Token expirado");
        }

        if (!authToken.user || authToken.user.deletedAt) {
            throw new Error("Usuario no encontrado");
        }

        await tx.userAuthTokens.update({
            where: { id: authToken.id },
            data: {
                usedAt: new Date(),
            },
        });

        return authToken;
    });
}

module.exports = {
    issueUserAuthToken,
    consumeUserAuthToken,
    hashToken,
};
