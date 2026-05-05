const USER_BASE_PERMISSION_NAMES = [
    "READ_EVENTS",
    "READ_AGENDAS",
    "CREATE_TICKET",
    "READ_TICKETS",
    "READ_PAYMENTS",
    "READ_NOTIFICATIONS",
    "UPDATE_NOTIFICATION",
    "CREATE_SURVEY_RESPONSE",
];

const PERMISSION_TYPES = {
    CREATE: "CREATE",
    READ: "READ",
    UPDATE: "UPDATE",
    DELETE: "DELETE",
};

function inferPermissionType(permissionName) {
    const prefix = String(permissionName || "").split("_")[0];
    return PERMISSION_TYPES[prefix] || PERMISSION_TYPES.READ;
}

async function ensurePermission(prisma, permissionName) {
    let permission = await prisma.permissions.findFirst({
        where: {
            name: permissionName,
            deletedAt: null,
        },
    });

    if (!permission) {
        permission = await prisma.permissions.create({
            data: {
                name: permissionName,
                type: inferPermissionType(permissionName),
            },
        });
    }

    return permission;
}

async function ensureUserRole(prisma) {
    let userRole = await prisma.roles.findFirst({
        where: {
            name: "user",
            deletedAt: null,
        },
    });

    if (!userRole) {
        userRole = await prisma.roles.create({
            data: { name: "user" },
        });
    }

    return userRole;
}

async function ensureUserBasePermissions(prisma) {
    const userRole = await ensureUserRole(prisma);
    const permissions = [];

    for (const permissionName of USER_BASE_PERMISSION_NAMES) {
        const permission = await ensurePermission(prisma, permissionName);
        permissions.push(permission);
    }

    await prisma.rolePermissions.createMany({
        data: permissions.map((permission) => ({
            roleId: userRole.id,
            permissionId: permission.id,
        })),
        skipDuplicates: true,
    });

    return {
        roleId: userRole.id,
        roleName: userRole.name,
        permissions: permissions.map((permission) => permission.name),
    };
}

module.exports = {
    USER_BASE_PERMISSION_NAMES,
    ensureUserBasePermissions,
};
