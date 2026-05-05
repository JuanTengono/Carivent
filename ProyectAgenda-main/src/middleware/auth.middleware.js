const { prisma } = require("../config/prisma/prisma");
const { errorResponse } = require("../config/interfaces/errors.interface");

module.exports = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json(errorResponse("Token requerido", null, 401));
    }

    try {
        const tokenUser = await prisma.tokensUser.findFirst({
            where: { token, deletedAt: null }
        });

        if (!tokenUser) {
            return res.status(401).json(errorResponse("Token inválido o expirado", null, 401));
        }

        if (tokenUser.expiresAt < new Date()) {
            return res.status(401).json(errorResponse("Token expirado", null, 401));
        }

        const user = await prisma.user.findFirst({
            where: { id: tokenUser.userId, deletedAt: null },
            include: {
                role: {
                    include: {
                        rolePermissions: {
                            include: {
                                permission: true,
                            }
                        }
                    }
                }
            }
        });

        if (!user) {
            return res.status(401).json(errorResponse("Usuario no encontrado", null, 401));
        }

        req.user = user;
        next();
    }

    catch (error) {
        return res.status(401).json(errorResponse("Token inválido o expirado", null, 401));
    }
}