const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { ensureUserBasePermissions } = require("../scripts/lib/user-base-permissions");

const prisma = new PrismaClient();

async function ensurePermission(permission) {
    const existing = await prisma.permissions.findFirst({
        where: {
            name: permission.name,
            deletedAt: null,
        },
    });

    if (existing) {
        return existing;
    }

    return prisma.permissions.create({
        data: {
            name: permission.name,
            type: permission.type,
        },
    });
}

async function ensureRole(roleName) {
    const existing = await prisma.roles.findFirst({
        where: {
            name: roleName,
            deletedAt: null,
        },
    });

    if (existing) {
        return existing;
    }

    return prisma.roles.create({
        data: {
            name: roleName,
        },
    });
}

async function main() {
    console.log("Seeding database...");

    const permissionSeed = [
        { name: "CREATE_ROLE", type: "CREATE" },
        { name: "READ_ROLES", type: "READ" },
        { name: "UPDATE_ROLE", type: "UPDATE" },
        { name: "DELETE_ROLE", type: "DELETE" },
        { name: "CREATE_PERMISSION", type: "CREATE" },
        { name: "READ_PERMISSIONS", type: "READ" },
        { name: "ASSIGN_PERMISSION_TO_ROLE", type: "CREATE" },

        { name: "CREATE_SITE", type: "CREATE" },
        { name: "READ_SITES", type: "READ" },
        { name: "UPDATE_SITE", type: "UPDATE" },
        { name: "DELETE_SITE", type: "DELETE" },

        { name: "CREATE_EVENT", type: "CREATE" },
        { name: "READ_EVENTS", type: "READ" },
        { name: "UPDATE_EVENT", type: "UPDATE" },
        { name: "DELETE_EVENT", type: "DELETE" },
        { name: "RUN_AUTOMATIONS", type: "UPDATE" },

        { name: "CREATE_AGENDA", type: "CREATE" },
        { name: "READ_AGENDAS", type: "READ" },
        { name: "UPDATE_AGENDA", type: "UPDATE" },
        { name: "DELETE_AGENDA", type: "DELETE" },

        { name: "CREATE_TICKET", type: "CREATE" },
        { name: "READ_TICKETS", type: "READ" },
        { name: "UPDATE_TICKET", type: "UPDATE" },
        { name: "VALIDATE_TICKET", type: "UPDATE" },
        { name: "READ_ATTENDEES", type: "READ" },

        { name: "CREATE_NOTIFICATION", type: "CREATE" },
        { name: "READ_NOTIFICATIONS", type: "READ" },
        { name: "UPDATE_NOTIFICATION", type: "UPDATE" },

        { name: "CREATE_SURVEY", type: "CREATE" },
        { name: "READ_SURVEYS", type: "READ" },
        { name: "CREATE_SURVEY_RESPONSE", type: "CREATE" },
        { name: "READ_SURVEY_RESPONSES", type: "READ" },

        { name: "CREATE_PROMOTION", type: "CREATE" },
        { name: "READ_PROMOTIONS", type: "READ" },
        { name: "UPDATE_PROMOTION", type: "UPDATE" },
        { name: "DELETE_PROMOTION", type: "DELETE" },

        { name: "READ_PAYMENTS", type: "READ" },
        { name: "UPDATE_PAYMENT", type: "UPDATE" },
    ];

    const permissions = [];
    for (const permission of permissionSeed) {
        // eslint-disable-next-line no-await-in-loop
        const createdPermission = await ensurePermission(permission);
        permissions.push(createdPermission);
    }

    console.log(`Permisos garantizados: ${permissions.length}`);

    const adminRole = await ensureRole("admin");
    const administratorRole = await ensureRole("administrator");
    const userRole = await ensureRole("user");

    await prisma.rolePermissions.createMany({
        data: permissions.map((permission) => ({
            roleId: administratorRole.id,
            permissionId: permission.id,
        })),
        skipDuplicates: true,
    });

    const userBasePermissions = await ensureUserBasePermissions(prisma);

    console.log("Roles garantizados:", {
        adminRoleId: adminRole.id,
        administratorRoleId: administratorRole.id,
        userRoleId: userRole.id,
    });
    console.log("Permisos base de user garantizados:", userBasePermissions);

    const hashedPassword = await bcrypt.hash("123456", 10);

    const users = [
        {
            name: "Admin",
            email: "admin@email.com",
            password: hashedPassword,
            roleId: adminRole.id,
        },
        {
            name: "Administrator",
            email: "administrator@email.com",
            password: hashedPassword,
            roleId: administratorRole.id,
        },
        {
            name: "William Bonilla",
            email: "wsbonilladiaz@gmail.com",
            password: hashedPassword,
            roleId: userRole.id,
        },
    ];

    for (const user of users) {
        // eslint-disable-next-line no-await-in-loop
        const existingUser = await prisma.user.findFirst({
            where: {
                email: user.email,
                deletedAt: null,
            },
        });

        if (!existingUser) {
            // eslint-disable-next-line no-await-in-loop
            await prisma.user.create({ data: user });
        }
    }

    console.log(`Usuarios seed garantizados: ${users.length}`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
