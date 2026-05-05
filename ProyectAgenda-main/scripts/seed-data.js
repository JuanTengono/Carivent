const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    console.log("Seeding sedes y eventos...");

    const admin = await prisma.user.findFirst({ where: { deletedAt: null } });
    if (!admin) {
        throw new Error("No hay usuarios en la BD. Corre el seed principal primero.");
    }
    console.log(`Usando usuario: ${admin.email} (id: ${admin.id})`);

    // --- SEDES ---
    const sitesData = [
        {
            name: "Auditorio Central",
            description: "Auditorio principal con capacidad para grandes eventos académicos y culturales.",
            ubication: "Bloque A, Piso 1",
            direction: "Calle 10 #5-23, Bogotá",
            capacity: 300,
            phone: "3001234567",
            email: "auditorio@universidad.edu.co",
            userId: admin.id,
        },
        {
            name: "Sala de Conferencias Norte",
            description: "Sala equipada con tecnología audiovisual para conferencias y talleres.",
            ubication: "Bloque B, Piso 2",
            direction: "Carrera 8 #12-45, Bogotá",
            capacity: 80,
            phone: "3017654321",
            email: "sala.norte@universidad.edu.co",
            userId: admin.id,
        },
        {
            name: "Polideportivo Campus",
            description: "Instalación deportiva multifuncional para eventos recreativos y torneos.",
            ubication: "Zona Deportiva, Campus Sur",
            direction: "Av. El Dorado #68-95, Bogotá",
            capacity: 500,
            phone: "3109876543",
            email: "polideportivo@universidad.edu.co",
            userId: admin.id,
        },
        {
            name: "Jardín Cultural",
            description: "Espacio al aire libre ideal para ferias, exposiciones y eventos culturales.",
            ubication: "Zona Verde, Campus Central",
            direction: "Calle 45 #30-10, Bogotá",
            capacity: 200,
            phone: "3156789012",
            email: "jardin@universidad.edu.co",
            userId: admin.id,
        },
    ];

    const sites = [];
    for (const s of sitesData) {
        const existing = await prisma.sites.findFirst({ where: { name: s.name, deletedAt: null } });
        if (existing) {
            console.log(`  Sede ya existe: ${s.name}`);
            sites.push(existing);
        } else {
            const created = await prisma.sites.create({ data: s });
            console.log(`  Sede creada: ${created.name} (id: ${created.id})`);
            sites.push(created);
        }
    }

    // --- EVENTOS ---
    const now = new Date();
    const day = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
    const addHrs = (date, hours) => new Date(date.getTime() + hours * 60 * 60 * 1000);

    const eventsData = [
        {
            name: "Feria de Innovación Tecnológica 2026",
            type: "PUBLIC",
            status: "PENDING",
            description: "Exposición de proyectos tecnológicos desarrollados por estudiantes y docentes. Entrada libre.",
            ticketPrice: 0,
            maxTicketsPerUser: 2,
            startTime: addHrs(day(3), 8),
            endTime: addHrs(day(3), 17),
            siteId: sites[0].id,
            userId: admin.id,
        },
        {
            name: "Conferencia: Inteligencia Artificial y el Futuro",
            type: "PUBLIC",
            status: "PENDING",
            description: "Charla magistral sobre los avances de la IA y su impacto en la sociedad moderna.",
            ticketPrice: 0,
            maxTicketsPerUser: 1,
            startTime: addHrs(day(5), 14),
            endTime: addHrs(day(5), 17),
            siteId: sites[1].id,
            userId: admin.id,
        },
        {
            name: "Torneo Interfacultades de Fútbol",
            type: "PUBLIC",
            status: "IN_PROGRESS",
            description: "Torneo deportivo entre facultades. ¡Ven a apoyar a tu equipo favorito!",
            ticketPrice: 0,
            maxTicketsPerUser: 4,
            startTime: addHrs(day(-1), 9),
            endTime: addHrs(day(2), 18),
            siteId: sites[2].id,
            userId: admin.id,
        },
        {
            name: "Festival de Arte y Cultura",
            type: "PUBLIC",
            status: "PENDING",
            description: "Muestra artística con música en vivo, danza, pintura y gastronomía típica colombiana.",
            ticketPrice: 5000,
            maxTicketsPerUser: 3,
            startTime: addHrs(day(10), 10),
            endTime: addHrs(day(10), 20),
            siteId: sites[3].id,
            userId: admin.id,
        },
        {
            name: "Taller: Desarrollo de Apps Móviles con Flutter",
            type: "PRIVATE",
            status: "PENDING",
            description: "Taller práctico de Flutter para crear aplicaciones Android e iOS. Cupos limitados.",
            ticketPrice: 20000,
            maxTicketsPerUser: 1,
            startTime: addHrs(day(7), 8),
            endTime: addHrs(day(7), 12),
            siteId: sites[1].id,
            userId: admin.id,
        },
        {
            name: "Gala de Graduación Promoción 2026",
            type: "PRIVATE",
            status: "PENDING",
            description: "Ceremonia de grado para los egresados de todas las facultades del presente año.",
            ticketPrice: 0,
            maxTicketsPerUser: 3,
            startTime: addHrs(day(20), 15),
            endTime: addHrs(day(20), 20),
            siteId: sites[0].id,
            userId: admin.id,
        },
    ];

    const events = [];
    for (const e of eventsData) {
        const existing = await prisma.events.findFirst({ where: { name: e.name, deletedAt: null } });
        if (existing) {
            console.log(`  Evento ya existe: ${e.name}`);
            events.push(existing);
        } else {
            const created = await prisma.events.create({ data: e });
            console.log(`  Evento creado: ${created.name} (id: ${created.id})`);
            events.push(created);
        }
    }

    // --- AGENDAS para el primer evento ---
    const agendas = [
        { activity: "Registro y bienvenida", startTime: day(3), endTime: addHrs(day(3), 1), eventId: events[0].id },
        { activity: "Presentación de proyectos - Área Software", startTime: addHrs(day(3), 1), endTime: addHrs(day(3), 3), eventId: events[0].id },
        { activity: "Almuerzo y networking", startTime: addHrs(day(3), 3), endTime: addHrs(day(3), 4), eventId: events[0].id },
        { activity: "Presentación de proyectos - Área Hardware", startTime: addHrs(day(3), 4), endTime: addHrs(day(3), 6), eventId: events[0].id },
        { activity: "Premiación y cierre", startTime: addHrs(day(3), 6), endTime: addHrs(day(3), 7), eventId: events[0].id },
    ];

    for (const a of agendas) {
        const existing = await prisma.agendas.findFirst({ where: { activity: a.activity, eventId: a.eventId, deletedAt: null } });
        if (!existing) {
            await prisma.agendas.create({ data: a });
            console.log(`  Agenda creada: ${a.activity}`);
        }
    }

    console.log("\n✓ Seed completado:");
    console.log(`  ${sites.length} sedes`);
    console.log(`  ${events.length} eventos`);
    console.log(`  ${agendas.length} actividades de agenda`);
}

function addHrs(date, hours) {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
