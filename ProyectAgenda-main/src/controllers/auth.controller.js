const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { prisma } = require("../config/prisma/prisma");

const { successResponse } = require("../config/interfaces/success.interface");
const { validateFields } = require("../config/utils/rulesValidations");
const { issueUserAuthToken, consumeUserAuthToken } = require("../services/auth-token.service");
const {
    sendWelcomeEmail,
    sendEmailVerificationEmail,
    sendPasswordResetEmail,
} = require("../services/email.service");

const DEFAULT_REGISTER_ROLE_NAME = "user";

function buildEmailLookup(email) {
    return {
        equals: String(email || "").trim(),
        mode: "insensitive",
    };
}

async function resolveEffectivePermissions(user) {
    if (!user?.role) return [];

    if (user.role.id === 1) {
        const allPermissions = await prisma.permissions.findMany({
            where: { deletedAt: null },
            select: { name: true },
        });
        return [...new Set(allPermissions.map((permission) => permission.name))];
    }

    const rolePermissions = user.role.rolePermissions || [];
    return [
        ...new Set(
            rolePermissions
                .map((rolePermission) => rolePermission.permission?.name)
                .filter(Boolean)
        ),
    ];
}

async function issueAndSendEmailVerification(user) {
    try {
        const tokenPayload = await issueUserAuthToken({
            userId: user.id,
            type: "EMAIL_VERIFICATION",
        });

        sendEmailVerificationEmail({
            to: user.email,
            userId: user.id,
            userName: user.name,
            token: tokenPayload.token,
            expiresAt: tokenPayload.expiresAt,
        }).catch((error) => {
            console.error(JSON.stringify({
                event: "EMAIL_VERIFICATION_NON_BLOCKING_ERROR",
                timestamp: new Date().toISOString(),
                userId: user.id,
                email: user.email,
                error: error.message,
            }));
        });
    } catch (error) {
        console.error(JSON.stringify({
            event: "EMAIL_VERIFICATION_TOKEN_GENERATION_ERROR",
            timestamp: new Date().toISOString(),
            userId: user?.id,
            email: user?.email,
            error: error.message,
        }));
    }
}

exports.register = async (req, res, next) => {
    try {
        const validations = [
            {
                field: "name",
                validations: [
                    { type: "required", message: "El nombre es requerido" },
                    { type: "min", value: 3, message: "El nombre debe tener al menos 3 caracteres" },
                    { type: "max", value: 50, message: "El nombre debe tener menos de 50 caracteres" },
                ],
            },
            {
                field: "email",
                validations: [
                    { type: "required", message: "El email es requerido" },
                    { type: "email", message: "El email no es valido" },
                ],
            },
            {
                field: "password",
                validations: [
                    { type: "required", message: "La contrasena es requerida" },
                    { type: "min", value: 8, message: "La contrasena debe tener al menos 8 caracteres" },
                    { type: "max", value: 50, message: "La contrasena debe tener menos de 50 caracteres" },
                ],
            },
        ];

        const validationErrors = validateFields(req.body, validations, res);
        if (validationErrors) return;

        const { name = "", email = "", password = "" } = req.body;

        const newUser = await prisma.$transaction(async (tx) => {
            const userRole = await tx.roles.findFirst({
                where: {
                    name: DEFAULT_REGISTER_ROLE_NAME,
                    deletedAt: null,
                },
                select: { id: true, name: true },
            });

            if (!userRole) {
                throw new Error("El rol base de registro no esta configurado");
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            return tx.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    roleId: userRole.id,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    status: true,
                    roleId: true,
                    emailVerified: true,
                    emailVerifiedAt: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        });

        await issueAndSendEmailVerification(newUser);

        sendWelcomeEmail({
            to: newUser.email,
            userId: newUser.id,
            userName: newUser.name,
            email: newUser.email,
        }).catch((error) => {
            console.error(JSON.stringify({
                event: "WELCOME_EMAIL_NON_BLOCKING_ERROR",
                timestamp: new Date().toISOString(),
                userId: newUser.id,
                error: error.message,
            }));
        });

        return res.json(successResponse("Usuario registrado", newUser, 201));
    } catch (error) {
        next(error);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const validations = [
            {
                field: "email",
                validations: [
                    { type: "required", message: "El email es requerido" },
                    { type: "email", message: "El email no es valido" },
                ],
            },
            {
                field: "password",
                validations: [
                    { type: "required", message: "La contrasena es requerida" },
                ],
            },
        ];

        const validationErrors = validateFields(req.body, validations, res);
        if (validationErrors) return;

        const user = await prisma.user.findFirst({
            where: {
                email: buildEmailLookup(email),
                deletedAt: null,
            },
            include: {
                role: {
                    include: {
                        rolePermissions: {
                            include: {
                                permission: {
                                    select: {
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            throw new Error("Usuario o contrasena incorrecta");
        }

        if (user.status === "INACTIVE") {
            throw new Error("Usuario inactivo");
        }

        if (process.env.REQUIRE_EMAIL_VERIFICATION === "true" && !user.emailVerified) {
            throw new Error("Debes verificar tu email antes de iniciar sesion");
        }

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            throw new Error("Usuario o contrasena incorrecta");
        }

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: parseInt(process.env.JWT_EXPIRES_IN || "3600", 10) }
        );

        await prisma.tokensUser.create({
            data: {
                userId: user.id,
                token,
                expiresAt: new Date(Date.now() + parseInt(process.env.JWT_EXPIRES_IN || "3600", 10) * 1000),
            },
        });

        const permissions = await resolveEffectivePermissions(user);

        const userData = {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role.name,
                permissions,
                status: user.status,
                emailVerified: user.emailVerified,
                emailVerifiedAt: user.emailVerifiedAt,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
            token,
        };

        return res.json(successResponse("Login exitoso", userData, 200));
    } catch (error) {
        next(error);
    }
};

exports.logout = async (req, res, next) => {
    try {
        const { token } = req.body;
        await prisma.tokensUser.update({
            where: { token },
            data: {
                deletedAt: new Date(),
            },
        });
        return res.json(successResponse("Logout exitoso", null, 200));
    } catch (error) {
        next(error);
    }
};

exports.refresh = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new Error("Token requerido");
        }

        const token = authHeader.split(" ")[1];
        const tokenUser = await prisma.tokensUser.findFirst({
            where: { token, deletedAt: null },
            include: {
                user: {
                    include: {
                        role: {
                            include: {
                                rolePermissions: {
                                    include: {
                                        permission: { select: { name: true } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!tokenUser) {
            throw new Error("Token invalido o expirado");
        }

        if (tokenUser.expiresAt < new Date()) {
            throw new Error("Token expirado");
        }

        const user = tokenUser.user;
        if (!user || user.deletedAt || user.status === "INACTIVE") {
            throw new Error("Usuario no disponible");
        }

        const permissions = await resolveEffectivePermissions(user);

        const expiresIn = parseInt(process.env.JWT_EXPIRES_IN || "3600", 10);
        const newToken = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn }
        );

        await prisma.$transaction(async (tx) => {
            await tx.tokensUser.update({
                where: { token },
                data: { deletedAt: new Date() },
            });
            await tx.tokensUser.create({
                data: {
                    userId: user.id,
                    token: newToken,
                    expiresAt: new Date(Date.now() + expiresIn * 1000),
                },
            });
        });

        const userData = {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role.name,
                permissions,
                status: user.status,
                emailVerified: user.emailVerified,
                emailVerifiedAt: user.emailVerifiedAt,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
            token: newToken,
        };

        return res.json(successResponse("Token refrescado", userData, 200));
    } catch (error) {
        next(error);
    }
};

exports.requestEmailVerification = async (req, res, next) => {
    try {
        const validations = [
            {
                field: "email",
                validations: [
                    { type: "required", message: "El email es requerido" },
                    { type: "email", message: "El email no es valido" },
                ],
            },
        ];

        const validationErrors = validateFields(req.body, validations, res);
        if (validationErrors) return;

        const normalizedEmail = String(req.body.email || "").trim();

        const user = await prisma.user.findFirst({
            where: {
                email: buildEmailLookup(normalizedEmail),
                deletedAt: null,
                status: "ACTIVE",
            },
            select: {
                id: true,
                name: true,
                email: true,
                emailVerified: true,
            },
        });

        if (user && !user.emailVerified) {
            await issueAndSendEmailVerification(user);
        }

        return res.json(successResponse("Si el correo existe, enviamos un enlace de verificacion", null, 200));
    } catch (error) {
        next(error);
    }
};

exports.verifyEmail = async (req, res, next) => {
    try {
        const bodyToken = typeof req.body?.token === "string" ? req.body.token : "";
        const queryToken = typeof req.query?.token === "string" ? req.query.token : "";
        const token = String(bodyToken || queryToken || "").trim();

        if (!token) {
            throw new Error("El token es requerido");
        }

        const authToken = await consumeUserAuthToken({
            token,
            type: "EMAIL_VERIFICATION",
        });

        await prisma.user.update({
            where: { id: authToken.userId },
            data: {
                emailVerified: true,
                emailVerifiedAt: new Date(),
            },
        });

        return res.json(successResponse("Correo verificado correctamente", {
            userId: authToken.userId,
            emailVerified: true,
        }, 200));
    } catch (error) {
        next(error);
    }
};

exports.requestPasswordReset = async (req, res, next) => {
    try {
        const validations = [
            {
                field: "email",
                validations: [
                    { type: "required", message: "El email es requerido" },
                    { type: "email", message: "El email no es valido" },
                ],
            },
        ];

        const validationErrors = validateFields(req.body, validations, res);
        if (validationErrors) return;

        const normalizedEmail = String(req.body.email || "").trim();

        const user = await prisma.user.findFirst({
            where: {
                email: buildEmailLookup(normalizedEmail),
                deletedAt: null,
                status: "ACTIVE",
            },
            select: {
                id: true,
                name: true,
                email: true,
            },
        });

        if (user) {
            try {
                const tokenPayload = await issueUserAuthToken({
                    userId: user.id,
                    type: "PASSWORD_RESET",
                });

                sendPasswordResetEmail({
                    to: user.email,
                    userId: user.id,
                    userName: user.name,
                    token: tokenPayload.token,
                    expiresAt: tokenPayload.expiresAt,
                }).catch((error) => {
                    console.error(JSON.stringify({
                        event: "PASSWORD_RESET_EMAIL_NON_BLOCKING_ERROR",
                        timestamp: new Date().toISOString(),
                        userId: user.id,
                        email: user.email,
                        error: error.message,
                    }));
                });
            } catch (error) {
                console.error(JSON.stringify({
                    event: "PASSWORD_RESET_TOKEN_GENERATION_ERROR",
                    timestamp: new Date().toISOString(),
                    userId: user.id,
                    email: user.email,
                    error: error.message,
                }));
            }
        }

        return res.json(successResponse("Si el correo existe, enviamos instrucciones de recuperacion", null, 200));
    } catch (error) {
        next(error);
    }
};

exports.resetPassword = async (req, res, next) => {
    try {
        const validations = [
            {
                field: "token",
                validations: [
                    { type: "required", message: "El token es requerido" },
                    { type: "string", message: "El token debe ser texto" },
                ],
            },
            {
                field: "newPassword",
                validations: [
                    { type: "required", message: "La nueva contrasena es requerida" },
                    { type: "string", message: "La nueva contrasena debe ser texto" },
                    { type: "min", value: 8, message: "La nueva contrasena debe tener al menos 8 caracteres" },
                    { type: "max", value: 50, message: "La nueva contrasena debe tener menos de 50 caracteres" },
                ],
            },
        ];

        const validationErrors = validateFields(req.body, validations, res);
        if (validationErrors) return;

        const { token, newPassword } = req.body;

        const authToken = await consumeUserAuthToken({
            token,
            type: "PASSWORD_RESET",
        });

        if (!authToken.user || authToken.user.deletedAt || authToken.user.status !== "ACTIVE") {
            throw new Error("El usuario no esta disponible para restablecer contrasena");
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: authToken.userId },
                data: {
                    password: hashedPassword,
                },
            });

            await tx.tokensUser.updateMany({
                where: {
                    userId: authToken.userId,
                    deletedAt: null,
                },
                data: {
                    deletedAt: new Date(),
                },
            });
        });

        return res.json(successResponse("Contrasena actualizada correctamente", null, 200));
    } catch (error) {
        next(error);
    }
};
