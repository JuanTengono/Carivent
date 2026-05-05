const { prisma } = require("../config/prisma/prisma");

const { successResponse } = require("../config/interfaces/success.interface");

const { validateFields } = require("../config/utils/rulesValidations");

exports.createRole = async (req, res, next) => {
    try {
        const validations = [
            { field: "name", validations: [
                { type: "required", message: "El nombre del rol es requerido" },
                { type: "min", value: 3, message: "El nombre del rol debe tener al menos 3 caracteres" },
                { type: "max", value: 50, message: "El nombre del rol debe tener menos de 50 caracteres" },
            ]},
        ];
        const validationErrors = validateFields(req.body, validations, res);
        if (validationErrors) return;
        const { name } = req.body;
        const newRole = await prisma.roles.create({
            data: {name}
        });
        return res.json(successResponse("Rol creado", newRole, 201));
    } catch (error) {
        next(error);
    }
}

exports.updateRole = async (req, res, next) => {
    try {
        const validations = [
            { field: "name", validations: [
                { type: "required", message: "El nombre del rol es requerido" },
                { type: "min", value: 3, message: "El nombre del rol debe tener al menos 3 caracteres" },
                { type: "max", value: 50, message: "El nombre del rol debe tener menos de 50 caracteres" },
            ]},
        ];
        const validationErrors = validateFields(req.body, validations, res);
        if (validationErrors) return;
        const { id } = req.params;
        const { name } = req.body;
        const updatedRole = await prisma.roles.update({
            where: { id: parseInt(id) },
            data: { name }
        });
        return res.json(successResponse("Rol actualizado", updatedRole, 200));
    } catch (error) {
        next(error);
    }
}

exports.deleteRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const deletedRole = await prisma.roles.update({
            where: { id: parseInt(id), deletedAt: null },
            data: { deletedAt: new Date() }
        });
        return res.json(successResponse("Rol eliminado", deletedRole, 200));
    } catch (error) {
        next(error);
    }
}

exports.getRoles = async (req, res, next) => {
    try {

        const { page = 1, limit = 10, all = false } = req.query;

        const where = { deletedAt: null };

        let query = {
            where,
            include: {
                _count: { select: { users: true, rolePermissions: true } }
            },
            orderBy: {
                id: "desc",
            }
        };

        if (!all || all == "false") {
            query.skip = (parseInt(page) - 1) * parseInt(limit);
            query.take = parseInt(limit);
        }

        const [roles, total] = await Promise.all([
            prisma.roles.findMany(query),
            prisma.roles.count({ where })
        ]);

        return res.json(successResponse("Roles obtenidos", {
            data: roles,
            pagination: {
                page,
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit),
            }
        }, 200));
    } catch (error) {
        next(error);
    }
}

exports.getPermissions = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, all = false } = req.query;
        const where = { deletedAt: null };
        let query = {
            where,
            orderBy: {
                id: "desc",
            }
        };
        if (!all || all == "false") {
            query.skip = (page - 1) * limit;
            query.take = limit;
        }
        const [permissions, total] = await Promise.all([
            prisma.permissions.findMany(query),
            prisma.permissions.count({ where })
        ]);
        return res.json(successResponse("Permisos obtenidos", {
            data: permissions,
            pagination: {
                page,
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit),
            }
        }, 200));
    } catch (error) {
        next(error);
    }
}

exports.createPermission = async (req, res, next) => {
    try {
        const validations = [
            { field: "name", validations: [
                { type: "required", message: "El nombre del permiso es requerido" },
                { type: "min", value: 3, message: "El nombre del permiso debe tener al menos 3 caracteres" },
                { type: "max", value: 50, message: "El nombre del permiso debe tener menos de 50 caracteres" },
            ]},
            { field: "type", validations: [
                { type: "required", message: "El tipo de permiso es requerido" },
                { type: "in", value: ["CREATE", "READ", "UPDATE", "DELETE"], message: "El tipo de permiso debe ser CREATE, READ, UPDATE o DELETE" },
            ]},
        ];
        const validationErrors = validateFields(req.body, validations, res);
        if (validationErrors) return;
        const { name, type } = req.body;
        const newPermission = await prisma.permissions.create({
            data: { name, type }
        });
        return res.json(successResponse("Permiso creado", newPermission, 201));
    }catch (error) {
        next(error);
    }
}

exports.assignPermissionToRole = async (req, res, next) => {
    try {
        const validations = [
            { field: "roleId", validations: [
                { type: "required", message: "El ID del rol es requerido" },
            ]},
            { field: "permissionIds", validations: [
                { type: "required", message: "Los IDs de los permisos son requeridos" },
                { type: "array", message: "Los IDs de los permisos deben ser un array" },
                { type: "min", value: 1, message: "Debe seleccionar al menos un permiso" },
            ]},
        ];
        const validationErrors = validateFields(req.body, validations, res);
        if (validationErrors) return;
        const { roleId, permissionIds } = req.body;

        const role = await prisma.roles.findUnique({
            where: { id: parseInt(roleId) },
            include: {
                rolePermissions: true
            }
        });

        await prisma.rolePermissions.deleteMany({
            where: { roleId: parseInt(roleId), permissionId: { in: role.rolePermissions.map(rp => parseInt(rp.permissionId)) } }
        });

        const assignedPermissions = await prisma.rolePermissions.createMany({
            data: permissionIds.map(permissionId => ({ roleId: parseInt(roleId), permissionId: parseInt(permissionId) }))
        });

        return res.json(successResponse("Permisos asignados al rol", assignedPermissions, 200));
    }
    catch (error) {
        next(error);
    }
}
