const crypto = require("crypto");
const { Prisma } = require("@prisma/client");
const { prisma } = require("../config/prisma/prisma");
const {
    sendTicketPurchaseConfirmationEmail,
    sendPaymentInvoiceEmail,
} = require("./email.service");
const { getStripe, getStripePublishableKey } = require("./stripe.client");
const { sendToNotificationRecords } = require("./push-notification.service");
const { enrichSiteWithMapData } = require("../config/utils/siteMaps");

const SOLD_TICKET_STATUSES = ["ACTIVE", "PURCHASED", "USED"];
const RESERVED_TICKET_STATUSES = ["AVAILABLE"];
const USER_OCCUPIED_TICKET_STATUSES = ["ACTIVE", "PURCHASED", "USED", "AVAILABLE", "PAYMENT_PENDING"];

function toMoneyNumber(value) {
    const numberValue = Number(value || 0);
    return Number.isFinite(numberValue) ? Number(numberValue.toFixed(2)) : 0;
}

function toPercentage(part, total) {
    if (!Number.isFinite(total) || total <= 0) {
        return 0;
    }

    return toMoneyNumber((Number(part || 0) / total) * 100);
}

async function generateUniqueQrCode(tx) {
    let attempts = 0;
    while (attempts < 5) {
        attempts += 1;
        const codeQr = `TKT-${crypto.randomUUID()}`;
        const existing = await tx.tickets.findFirst({ where: { codeQr } });
        if (!existing) return codeQr;
    }

    throw new Error("No fue posible generar un codigo QR unico");
}

function validateSellableEvent(event) {
    if (!event) {
        throw new Error("El evento no existe");
    }

    if (["CANCELLED", "COMPLETED", "ARCHIVED"].includes(event.status)) {
        throw new Error("No es posible adquirir boletas para este evento por su estado actual");
    }

    const capacity = Number(event.site?.capacity || 0);
    if (!Number.isInteger(capacity) || capacity <= 0) {
        throw new Error("El evento no tiene aforo disponible");
    }
}

async function resolvePromotion(tx, { promotionCode, eventId, quantity, subtotal }) {
    if (!promotionCode) {
        return {
            promotion: null,
            discountAmount: 0,
        };
    }

    const normalizedCode = String(promotionCode).trim().toUpperCase();
    const promotion = await tx.promotions.findFirst({
        where: {
            code: normalizedCode,
            deletedAt: null,
            isActive: true,
            OR: [
                { eventId: null },
                { eventId },
            ],
        },
    });

    if (!promotion) {
        throw new Error("El codigo promocional no existe o no esta activo");
    }

    const now = new Date();
    if (promotion.validFrom && promotion.validFrom > now) {
        throw new Error("La promocion aun no esta disponible");
    }

    if (promotion.validTo && promotion.validTo < now) {
        throw new Error("La promocion ya expiro");
    }

    if (promotion.maxUses !== null && promotion.maxUses !== undefined) {
        const remainingUses = promotion.maxUses - promotion.usedCount;
        if (remainingUses <= 0) {
            throw new Error("La promocion ya no tiene usos disponibles");
        }

        if (quantity > remainingUses) {
            throw new Error("No hay usos suficientes de la promocion para esta compra");
        }
    }

    if (quantity < promotion.minQuantity) {
        throw new Error(`La promocion requiere minimo ${promotion.minQuantity} boletas`);
    }

    let discountAmount = 0;
    const discountValue = toMoneyNumber(promotion.discountValue);

    if (promotion.discountType === "PERCENT") {
        discountAmount = toMoneyNumber((subtotal * discountValue) / 100);
    } else {
        discountAmount = toMoneyNumber(discountValue * quantity);
    }

    discountAmount = Math.min(discountAmount, subtotal);

    return {
        promotion,
        discountAmount,
    };
}

async function buildEventCapacitySnapshot(tx, eventId) {
    const event = await tx.events.findFirst({
        where: { id: eventId, deletedAt: null },
        include: {
            site: {
                select: {
                    id: true,
                    name: true,
                    imageUrl: true,
                    capacity: true,
                },
            },
        },
    });

    if (!event) {
        throw new Error("El evento no existe");
    }

    const capacity = Number(event.site?.capacity || 0);

    const [sold, used, cancelled, expired, reserved, pendingPaymentsAgg] = await Promise.all([
        tx.tickets.count({
            where: {
                eventId,
                deletedAt: null,
                status: { in: SOLD_TICKET_STATUSES },
            },
        }),
        tx.tickets.count({
            where: {
                eventId,
                deletedAt: null,
                OR: [
                    { status: "USED" },
                    { validated: true },
                ],
            },
        }),
        tx.tickets.count({
            where: {
                eventId,
                deletedAt: null,
                status: "CANCELLED",
            },
        }),
        tx.tickets.count({
            where: {
                eventId,
                deletedAt: null,
                status: "EXPIRED",
            },
        }),
        tx.tickets.count({
            where: {
                eventId,
                deletedAt: null,
                status: { in: RESERVED_TICKET_STATUSES },
            },
        }),
        tx.payments.aggregate({
            where: {
                eventId,
                deletedAt: null,
                status: "PENDING",
            },
            _sum: {
                quantity: true,
            },
        }),
    ]);

    const pendingPaymentSeats = Number(pendingPaymentsAgg?._sum?.quantity || 0);
    const available = Math.max(0, capacity - sold - reserved - pendingPaymentSeats);
    const soldPercentage = toPercentage(sold, capacity);

    return {
        event: {
            id: event.id,
            name: event.name,
            status: event.status,
            startTime: event.startTime,
            endTime: event.endTime,
            site: {
                id: event.site?.id || null,
                name: event.site?.name || null,
                imageUrl: event.site?.imageUrl || null,
                capacity,
            },
        },
        counters: {
            totalCapacity: capacity,
            available,
            reserved,
            sold,
            used,
            cancelled,
            expired,
            soldPercentage,
        },
    };
}

async function buildEventDashboardSnapshot(tx, eventId) {
    const event = await tx.events.findFirst({
        where: { id: eventId, deletedAt: null },
        select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            status: true,
            ticketPrice: true,
            maxTicketsPerUser: true,
            startTime: true,
            endTime: true,
            site: {
                select: {
                    id: true,
                    name: true,
                    imageUrl: true,
                    ubication: true,
                    direction: true,
                    latitude: true,
                    longitude: true,
                    capacity: true,
                },
            },
        },
    });

    if (!event) {
        throw new Error("El evento no existe");
    }

    const capacity = Number(event.site?.capacity || 0);

    const [
        sold,
        used,
        cancelled,
        expired,
        reserved,
        soldAmountAggregate,
        reservedAmountAggregate,
        usedAmountAggregate,
        paymentCurrency,
    ] = await Promise.all([
        tx.tickets.count({
            where: {
                eventId,
                deletedAt: null,
                status: { in: SOLD_TICKET_STATUSES },
            },
        }),
        tx.tickets.count({
            where: {
                eventId,
                deletedAt: null,
                status: "USED",
            },
        }),
        tx.tickets.count({
            where: {
                eventId,
                deletedAt: null,
                status: "CANCELLED",
            },
        }),
        tx.tickets.count({
            where: {
                eventId,
                deletedAt: null,
                status: "EXPIRED",
            },
        }),
        tx.tickets.count({
            where: {
                eventId,
                deletedAt: null,
                status: { in: RESERVED_TICKET_STATUSES },
            },
        }),
        tx.tickets.aggregate({
            where: {
                eventId,
                deletedAt: null,
                status: { in: SOLD_TICKET_STATUSES },
            },
            _sum: {
                amount: true,
            },
        }),
        tx.tickets.aggregate({
            where: {
                eventId,
                deletedAt: null,
                status: { in: RESERVED_TICKET_STATUSES },
            },
            _sum: {
                amount: true,
            },
        }),
        tx.tickets.aggregate({
            where: {
                eventId,
                deletedAt: null,
                status: "USED",
            },
            _sum: {
                amount: true,
            },
        }),
        tx.payments.findFirst({
            where: {
                eventId,
                deletedAt: null,
            },
            select: {
                currency: true,
            },
            orderBy: {
                id: "desc",
            },
        }),
    ]);

    const available = Math.max(0, capacity - sold - reserved);
    const soldPercentage = toPercentage(sold, capacity);
    const soldRevenue = toMoneyNumber(soldAmountAggregate?._sum?.amount || 0);
    const reservedRevenue = toMoneyNumber(reservedAmountAggregate?._sum?.amount || 0);
    const usedRevenue = toMoneyNumber(usedAmountAggregate?._sum?.amount || 0);
    const baseTicketPrice = toMoneyNumber(event.ticketPrice);
    const maxTicketsPerUser = Number(event.maxTicketsPerUser || 1);

    return {
        event: {
            id: event.id,
            name: event.name,
            description: event.description,
            imageUrl: event.imageUrl,
            status: event.status,
            ticketPrice: baseTicketPrice,
            maxTicketsPerUser,
            startTime: event.startTime,
            endTime: event.endTime,
            site: enrichSiteWithMapData({
                id: event.site?.id || null,
                name: event.site?.name || null,
                imageUrl: event.site?.imageUrl || null,
                ubication: event.site?.ubication || null,
                direction: event.site?.direction || null,
                latitude: event.site?.latitude ?? null,
                longitude: event.site?.longitude ?? null,
                capacity,
            }),
        },
        counters: {
            totalCapacity: capacity,
            available,
            reserved,
            sold,
            used,
            cancelled,
            expired,
            soldPercentage,
        },
        revenue: {
            currency: paymentCurrency?.currency || "COP",
            total: soldRevenue,
            sold: soldRevenue,
            reserved: reservedRevenue,
            used: usedRevenue,
            baseTicketPrice,
            maxTicketsPerUser,
        },
    };
}

function createPurchaseNotificationData({ userId, eventName, quantity, totalAmount, paymentStatus }) {
    const paymentLabel = paymentStatus === "PAID" ? "confirmada" : "pendiente";
    return {
        userId,
        title: "Compra de boletas",
        message: `Tu compra para '${eventName}' (${quantity} boleta(s)) quedo ${paymentLabel}. Total: ${totalAmount}.`,
        type: paymentStatus === "PAID" ? "PURCHASE" : "SYSTEM",
    };
}

async function createAdminApprovalNotifications(tx, { paymentId, eventName, buyerName, quantity, totalAmount }) {
    const admins = await tx.user.findMany({
        where: {
            deletedAt: null,
            status: "ACTIVE",
            role: {
                is: {
                    id: 1,
                    deletedAt: null,
                },
            },
        },
        select: {
            id: true,
        },
    });

    if (admins.length === 0) return [];

    return tx.notifications.createManyAndReturn({
        data: admins.map((admin) => ({
            userId: admin.id,
            title: "Pago pendiente por aprobar",
            message: `El pago #${paymentId} de '${buyerName}' para '${eventName}' (${quantity} boleta(s), total ${totalAmount}) requiere aprobacion.`,
            type: "PURCHASE",
        })),
        select: {
            id: true,
            userId: true,
            title: true,
            message: true,
            type: true,
        },
    });
}

function dispatchTicketConfirmationEmails({ user, event, tickets }) {
    tickets.forEach((ticket) => {
        sendTicketPurchaseConfirmationEmail({
            to: user.email,
            userName: user.name,
            ticketId: ticket.id,
            codeQr: ticket.codeQr,
            eventName: event.name,
            startTime: event.startTime,
            endTime: event.endTime,
            siteName: event.site?.name,
            siteCity: event.site?.ubication,
            siteAddress: event.site?.direction,
        }).catch((error) => {
            console.error(JSON.stringify({
                event: "TICKET_EMAIL_NON_BLOCKING_ERROR",
                timestamp: new Date().toISOString(),
                ticketId: ticket.id,
                userId: user.id,
                error: error.message,
            }));
        });
    });
}

function dispatchPaymentInvoiceEmail({ user, event, payment, tickets }) {
    sendPaymentInvoiceEmail({
        to: user.email,
        userName: user.name,
        event,
        payment,
        tickets,
    }).catch((error) => {
        console.error(JSON.stringify({
            event: "PAYMENT_INVOICE_EMAIL_NON_BLOCKING_ERROR",
            timestamp: new Date().toISOString(),
            paymentId: payment?.id,
            userId: user?.id,
            error: error.message,
        }));
    });
}

function dispatchPushNotifications(records, context) {
    if (!Array.isArray(records) || records.length === 0) return;

    sendToNotificationRecords(records).catch((error) => {
        console.error(JSON.stringify({
            event: "PUSH_NON_BLOCKING_ERROR",
            timestamp: new Date().toISOString(),
            context,
            error: error.message,
        }));
    });
}

async function createTicketPurchase({ user, eventId, quantity = 1, promotionCode, paymentProvider, paymentReference, currency = "COP", metadata = null }) {
    const parsedEventId = Number.parseInt(eventId, 10);
    const parsedQuantity = Number.parseInt(quantity, 10);

    if (!Number.isInteger(parsedEventId) || parsedEventId < 1) {
        throw new Error("El evento es requerido");
    }

    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
        throw new Error("La cantidad debe ser un entero positivo");
    }

    if (parsedQuantity > 20) {
        throw new Error("La cantidad maxima por compra es 20");
    }

    const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY);
    const allowLegacy = String(process.env.ALLOW_LEGACY_IMMEDIATE_TICKET_PURCHASE || "").toLowerCase() === "true";
    if (stripeConfigured && !allowLegacy) {
        throw new Error("La compra sin pasarela de pago esta deshabilitada. Usa el checkout con tarjeta (Stripe).");
    }

    const paymentStatus = "PENDING";

    const transactionResult = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`
            SELECT e.id
            FROM events e
            WHERE e.id = ${parsedEventId} AND e.deleted_at IS NULL
            FOR UPDATE
        `;

        const event = await tx.events.findFirst({
            where: { id: parsedEventId, deletedAt: null },
            include: {
                site: {
                    select: {
                        id: true,
                        name: true,
                        imageUrl: true,
                        ubication: true,
                        direction: true,
                        capacity: true,
                    },
                },
            },
        });

        validateSellableEvent(event);

        const [soldTickets, reservedAggregate, userOccupiedCount] = await Promise.all([
            tx.tickets.count({
                where: {
                    eventId: parsedEventId,
                    deletedAt: null,
                    status: { in: SOLD_TICKET_STATUSES },
                },
            }),
            tx.payments.aggregate({
                where: {
                    eventId: parsedEventId,
                    deletedAt: null,
                    status: "PENDING",
                },
                _sum: {
                    quantity: true,
                },
            }),
            tx.tickets.count({
                where: {
                    eventId: parsedEventId,
                    userId: Number.parseInt(user.id, 10),
                    deletedAt: null,
                    status: { in: USER_OCCUPIED_TICKET_STATUSES },
                },
            }),
        ]);

        const capacity = Number(event.site.capacity || 0);
        const reservedCount = Number(reservedAggregate?._sum?.quantity || 0);
        const available = capacity - soldTickets - reservedCount;

        if (available < parsedQuantity) {
            throw new Error("No hay boletas disponibles, se alcanzo el aforo maximo del evento");
        }

        const maxTicketsPerUser = Number(event.maxTicketsPerUser || 1);
        if (userOccupiedCount + parsedQuantity > maxTicketsPerUser) {
            throw new Error(`Superas el maximo de boletas por usuario para este evento (${maxTicketsPerUser})`);
        }

        const unitPrice = toMoneyNumber(event.ticketPrice);
        const subtotal = toMoneyNumber(unitPrice * parsedQuantity);

        const promotionResolution = await resolvePromotion(tx, {
            promotionCode,
            eventId: parsedEventId,
            quantity: parsedQuantity,
            subtotal,
        });

        const discountAmount = toMoneyNumber(promotionResolution.discountAmount);
        const totalAmount = toMoneyNumber(Math.max(0, subtotal - discountAmount));

        const payment = await tx.payments.create({
            data: {
                userId: Number.parseInt(user.id, 10),
                eventId: parsedEventId,
                promotionId: promotionResolution.promotion?.id || null,
                quantity: parsedQuantity,
                subtotal,
                discountAmount,
                totalAmount,
                currency: String(currency || "COP").toUpperCase(),
                status: paymentStatus,
                provider: paymentProvider || null,
                reference: paymentReference || null,
                paidAt: null,
                metadata: metadata || undefined,
            },
        });

        if (promotionResolution.promotion) {
            await tx.promotions.update({
                where: { id: promotionResolution.promotion.id },
                data: {
                    usedCount: {
                        increment: parsedQuantity,
                    },
                },
            });
        }

        const ticketStatus = "AVAILABLE";
        const perTicketAmount = parsedQuantity > 0 ? toMoneyNumber(totalAmount / parsedQuantity) : 0;

        const createdTickets = [];
        for (let index = 0; index < parsedQuantity; index += 1) {
            const codeQr = await generateUniqueQrCode(tx);
            const ticket = await tx.tickets.create({
                data: {
                    codeQr,
                    eventId: parsedEventId,
                    userId: Number.parseInt(user.id, 10),
                    paymentId: payment.id,
                    amount: perTicketAmount,
                    status: ticketStatus,
                },
            });
            createdTickets.push(ticket);
        }

        const purchaseNotification = await tx.notifications.create({
            data: createPurchaseNotificationData({
                userId: Number.parseInt(user.id, 10),
                eventName: event.name,
                quantity: parsedQuantity,
                totalAmount,
                paymentStatus,
            }),
            select: {
                id: true,
                userId: true,
                title: true,
                message: true,
                type: true,
            },
        });

        const adminNotifications = await createAdminApprovalNotifications(tx, {
            paymentId: payment.id,
            eventName: event.name,
            buyerName: user.name,
            quantity: parsedQuantity,
            totalAmount,
        });

        const capacitySnapshot = await buildEventCapacitySnapshot(tx, parsedEventId);

        return {
            event,
            payment,
            tickets: createdTickets,
            promotion: promotionResolution.promotion
                ? {
                    id: promotionResolution.promotion.id,
                    code: promotionResolution.promotion.code,
                    discountType: promotionResolution.promotion.discountType,
                    discountValue: toMoneyNumber(promotionResolution.promotion.discountValue),
                }
                : null,
            pricing: {
                unitPrice,
                subtotal,
                discountAmount,
                totalAmount,
                currency: String(currency || "COP").toUpperCase(),
            },
            capacity: capacitySnapshot.counters,
            purchaseNotification,
            adminNotifications,
        };
    }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    dispatchPushNotifications(
        [
            transactionResult.purchaseNotification,
            ...(transactionResult.adminNotifications || []),
        ].filter(Boolean),
        "ticketing.createTicketPurchase"
    );

    return transactionResult;
}

/**
 * Convierte pesos COP (como en BD / UI) al entero que espera Stripe para `currency: "cop"`.
 * Stripe usa centavos de peso: 5.000 COP → amount 500_000 (no 5.000).
 */
function copAmountToStripeMinorUnits(totalAmount) {
    const pesos = Number(totalAmount || 0);
    return Math.round(pesos * 100);
}

async function createStripeTicketPurchase({ user, eventId, quantity = 1, promotionCode, currency = "COP" }) {
    const parsedEventId = Number.parseInt(eventId, 10);
    const parsedQuantity = Number.parseInt(quantity, 10);

    if (!Number.isInteger(parsedEventId) || parsedEventId < 1) {
        throw new Error("El evento es requerido");
    }

    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
        throw new Error("La cantidad debe ser un entero positivo");
    }

    if (parsedQuantity > 20) {
        throw new Error("La cantidad maxima por compra es 20");
    }

    const paymentStatus = "PENDING";
    const ticketStatus = "PAYMENT_PENDING";

    const transactionResult = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`
            SELECT e.id
            FROM events e
            WHERE e.id = ${parsedEventId} AND e.deleted_at IS NULL
            FOR UPDATE
        `;

        const event = await tx.events.findFirst({
            where: { id: parsedEventId, deletedAt: null },
            include: {
                site: {
                    select: {
                        id: true,
                        name: true,
                        imageUrl: true,
                        ubication: true,
                        direction: true,
                        capacity: true,
                    },
                },
            },
        });

        validateSellableEvent(event);

        const [soldTickets, reservedAggregate, userOccupiedCount] = await Promise.all([
            tx.tickets.count({
                where: {
                    eventId: parsedEventId,
                    deletedAt: null,
                    status: { in: SOLD_TICKET_STATUSES },
                },
            }),
            tx.payments.aggregate({
                where: {
                    eventId: parsedEventId,
                    deletedAt: null,
                    status: "PENDING",
                },
                _sum: {
                    quantity: true,
                },
            }),
            tx.tickets.count({
                where: {
                    eventId: parsedEventId,
                    userId: Number.parseInt(user.id, 10),
                    deletedAt: null,
                    status: { in: USER_OCCUPIED_TICKET_STATUSES },
                },
            }),
        ]);

        const capacity = Number(event.site.capacity || 0);
        const reservedCount = Number(reservedAggregate?._sum?.quantity || 0);
        const available = capacity - soldTickets - reservedCount;

        if (available < parsedQuantity) {
            throw new Error("No hay boletas disponibles, se alcanzo el aforo maximo del evento");
        }

        const maxTicketsPerUser = Number(event.maxTicketsPerUser || 1);
        if (userOccupiedCount + parsedQuantity > maxTicketsPerUser) {
            throw new Error(`Superas el maximo de boletas por usuario para este evento (${maxTicketsPerUser})`);
        }

        const unitPrice = toMoneyNumber(event.ticketPrice);
        const subtotal = toMoneyNumber(unitPrice * parsedQuantity);

        const promotionResolution = await resolvePromotion(tx, {
            promotionCode,
            eventId: parsedEventId,
            quantity: parsedQuantity,
            subtotal,
        });

        const discountAmount = toMoneyNumber(promotionResolution.discountAmount);
        const totalAmount = toMoneyNumber(Math.max(0, subtotal - discountAmount));
        const stripeMinor = copAmountToStripeMinorUnits(totalAmount);

        if (stripeMinor < 100) {
            throw new Error("El total a cobrar debe ser al menos 1 COP para usar la pasarela de pago");
        }

        const payment = await tx.payments.create({
            data: {
                userId: Number.parseInt(user.id, 10),
                eventId: parsedEventId,
                promotionId: promotionResolution.promotion?.id || null,
                quantity: parsedQuantity,
                subtotal,
                discountAmount,
                totalAmount,
                currency: String(currency || "COP").toUpperCase(),
                status: paymentStatus,
                provider: "stripe",
                reference: null,
                paidAt: null,
                metadata: {
                    checkout: "stripe_elements",
                    createdAt: new Date().toISOString(),
                },
            },
        });

        const perTicketAmount = parsedQuantity > 0 ? toMoneyNumber(totalAmount / parsedQuantity) : 0;
        const createdTickets = [];
        for (let index = 0; index < parsedQuantity; index += 1) {
            const codeQr = await generateUniqueQrCode(tx);
            const ticket = await tx.tickets.create({
                data: {
                    codeQr,
                    eventId: parsedEventId,
                    userId: Number.parseInt(user.id, 10),
                    paymentId: payment.id,
                    amount: perTicketAmount,
                    status: ticketStatus,
                },
            });
            createdTickets.push(ticket);
        }

        const purchaseNotification = await tx.notifications.create({
            data: createPurchaseNotificationData({
                userId: Number.parseInt(user.id, 10),
                eventName: event.name,
                quantity: parsedQuantity,
                totalAmount,
                paymentStatus,
            }),
            select: {
                id: true,
                userId: true,
                title: true,
                message: true,
                type: true,
            },
        });

        const adminNotifications = await createAdminApprovalNotifications(tx, {
            paymentId: payment.id,
            eventName: event.name,
            buyerName: user.name,
            quantity: parsedQuantity,
            totalAmount,
        });

        const capacitySnapshot = await buildEventCapacitySnapshot(tx, parsedEventId);

        return {
            event,
            payment,
            tickets: createdTickets,
            promotion: promotionResolution.promotion
                ? {
                    id: promotionResolution.promotion.id,
                    code: promotionResolution.promotion.code,
                    discountType: promotionResolution.promotion.discountType,
                    discountValue: toMoneyNumber(promotionResolution.promotion.discountValue),
                }
                : null,
            pricing: {
                unitPrice,
                subtotal,
                discountAmount,
                totalAmount,
                currency: String(currency || "COP").toUpperCase(),
            },
            capacity: capacitySnapshot.counters,
            purchaseNotification,
            adminNotifications,
            stripeMinor,
        };
    }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    const stripe = getStripe();
    let paymentIntent;
    try {
        paymentIntent = await stripe.paymentIntents.create(
            {
                amount: transactionResult.stripeMinor,
                currency: "cop",
                automatic_payment_methods: { enabled: true },
                metadata: {
                    paymentId: String(transactionResult.payment.id),
                    eventId: String(parsedEventId),
                    userId: String(user.id),
                },
            },
            {
                idempotencyKey: `ticket_pi_${transactionResult.payment.id}`,
            }
        );
    } catch (stripeError) {
        const stripeDetail = stripeError?.raw?.message || stripeError?.message || "error desconocido";
        console.error(JSON.stringify({
            event: "STRIPE_PI_CREATE_FAILED",
            paymentId: transactionResult.payment.id,
            error: stripeError.message,
            code: stripeError.code,
            detail: stripeDetail,
        }));
        await prisma.$transaction(async (tx) => {
            await tx.tickets.updateMany({
                where: { paymentId: transactionResult.payment.id, deletedAt: null },
                data: { status: "CANCELLED" },
            });
            await tx.payments.update({
                where: { id: transactionResult.payment.id },
                data: { status: "FAILED", reference: "stripe_create_error" },
            });
        });
        throw new Error(`No se pudo iniciar el cobro con la pasarela: ${stripeDetail}`);
    }

    await prisma.payments.update({
        where: { id: transactionResult.payment.id },
        data: {
            stripePaymentIntentId: paymentIntent.id,
            reference: paymentIntent.id,
            metadata: {
                ...(typeof transactionResult.payment.metadata === "object"
                    && transactionResult.payment.metadata
                    && !Array.isArray(transactionResult.payment.metadata)
                    ? transactionResult.payment.metadata
                    : {}),
                stripePaymentIntentId: paymentIntent.id,
            },
        },
    });

    dispatchPushNotifications(
        [
            transactionResult.purchaseNotification,
            ...(transactionResult.adminNotifications || []),
        ].filter(Boolean),
        "ticketing.createStripeTicketPurchase"
    );

    return {
        paymentId: transactionResult.payment.id,
        clientSecret: paymentIntent.client_secret,
        publishableKey: getStripePublishableKey(),
        /** Entero enviado a Stripe (centavos COP). */
        amountMinor: transactionResult.stripeMinor,
        /** Total en pesos COP para mostrar en UI (coincide con `pricing.totalAmount`). */
        totalAmountCop: transactionResult.pricing.totalAmount,
        currency: "cop",
        pricing: transactionResult.pricing,
        promotion: transactionResult.promotion,
        capacity: transactionResult.capacity,
        tickets: transactionResult.tickets,
    };
}

async function finalizeStripePaymentSuccess(paymentIntent) {
    const stripeId = paymentIntent.id;
    const metadataPaymentId = paymentIntent.metadata?.paymentId
        ? Number.parseInt(paymentIntent.metadata.paymentId, 10)
        : null;

    const result = await prisma.$transaction(async (tx) => {
        let payment = await tx.payments.findFirst({
            where: {
                deletedAt: null,
                stripePaymentIntentId: stripeId,
            },
            include: {
                event: {
                    include: {
                        site: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                tickets: {
                    where: { deletedAt: null },
                },
            },
        });

        if (!payment && Number.isInteger(metadataPaymentId) && metadataPaymentId > 0) {
            payment = await tx.payments.findFirst({
                where: {
                    id: metadataPaymentId,
                    deletedAt: null,
                },
                include: {
                    event: {
                        include: {
                            site: true,
                        },
                    },
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    tickets: {
                        where: { deletedAt: null },
                    },
                },
            });
        }

        if (!payment) {
            return { ok: false, reason: "PAYMENT_NOT_FOUND" };
        }

        if (!payment.stripePaymentIntentId) {
            await tx.payments.update({
                where: { id: payment.id },
                data: { stripePaymentIntentId: stripeId },
            });
        } else if (payment.stripePaymentIntentId !== stripeId) {
            throw new Error("El PaymentIntent no coincide con el pago registrado");
        }

        const dbMinor = copAmountToStripeMinorUnits(payment.totalAmount);
        if (dbMinor !== Number(paymentIntent.amount)) {
            throw new Error("El monto pagado no coincide con el total de la orden");
        }

        const cur = String(payment.currency || "cop").toLowerCase();
        if (paymentIntent.currency !== cur) {
            throw new Error("La moneda del cobro no coincide con la orden");
        }

        if (payment.status === "PAID") {
            return {
                ok: true,
                alreadyPaid: true,
                payment,
                updatedTickets: payment.tickets,
                confirmationNotification: null,
            };
        }

        if (payment.status !== "PENDING") {
            return { ok: false, reason: "INVALID_STATUS", status: payment.status };
        }

        const updatedPayment = await tx.payments.update({
            where: { id: payment.id },
            data: {
                status: "PAID",
                paidAt: new Date(),
            },
        });

        if (payment.promotionId) {
            await tx.promotions.update({
                where: { id: payment.promotionId },
                data: {
                    usedCount: {
                        increment: payment.quantity,
                    },
                },
            });
        }

        await tx.tickets.updateMany({
            where: {
                paymentId: payment.id,
                deletedAt: null,
                status: "PAYMENT_PENDING",
            },
            data: {
                status: "PURCHASED",
            },
        });

        const updatedTickets = await tx.tickets.findMany({
            where: {
                paymentId: payment.id,
                deletedAt: null,
            },
        });

        const confirmationNotification = await tx.notifications.create({
            data: {
                userId: payment.userId,
                title: "Pago confirmado",
                message: `Se confirmo el pago #${payment.id} para '${payment.event.name}'.`,
                type: "PURCHASE",
            },
            select: {
                id: true,
                userId: true,
                title: true,
                message: true,
                type: true,
            },
        });

        return {
            ok: true,
            alreadyPaid: false,
            payment: {
                ...updatedPayment,
                event: payment.event,
                user: payment.user,
            },
            updatedTickets,
            confirmationNotification,
        };
    }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    if (!result.ok) {
        return result;
    }

    if (!result.alreadyPaid && result.confirmationNotification) {
        dispatchPushNotifications([result.confirmationNotification], "ticketing.finalizeStripePaymentSuccess");
        dispatchTicketConfirmationEmails({
            user: result.payment.user,
            event: result.payment.event,
            tickets: result.updatedTickets,
        });
        dispatchPaymentInvoiceEmail({
            user: result.payment.user,
            event: result.payment.event,
            payment: result.payment,
            tickets: result.updatedTickets,
        });
    }

    return result;
}

async function finalizeStripePaymentFailure(stripePaymentIntentId, reasonType) {
    const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.payments.findFirst({
            where: {
                stripePaymentIntentId,
                deletedAt: null,
            },
            include: {
                event: {
                    select: { name: true },
                },
            },
        });

        if (!payment) {
            return { ok: false, reason: "PAYMENT_NOT_FOUND" };
        }

        if (payment.status === "PAID") {
            return { ok: true, skipped: true, reason: "ALREADY_PAID" };
        }

        if (payment.status === "FAILED") {
            return { ok: true, skipped: true, reason: "ALREADY_FAILED" };
        }

        await tx.payments.update({
            where: { id: payment.id },
            data: {
                status: "FAILED",
                metadata: {
                    ...(typeof payment.metadata === "object" && payment.metadata ? payment.metadata : {}),
                    stripeFailure: reasonType || "unknown",
                    stripeFailedAt: new Date().toISOString(),
                },
            },
        });

        await tx.tickets.updateMany({
            where: {
                paymentId: payment.id,
                deletedAt: null,
                status: "PAYMENT_PENDING",
            },
            data: {
                status: "CANCELLED",
            },
        });

        const failedPaymentNotification = await tx.notifications.create({
            data: {
                userId: payment.userId,
                title: "Pago no completado",
                message: `El pago para '${payment.event.name}' no se completo. Puedes intentar una nueva compra.`,
                type: "SYSTEM",
            },
            select: {
                id: true,
                userId: true,
                title: true,
                message: true,
                type: true,
            },
        });

        return {
            ok: true,
            failedPaymentNotification,
        };
    }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    if (result.failedPaymentNotification) {
        dispatchPushNotifications([result.failedPaymentNotification], "ticketing.finalizeStripePaymentFailure");
    }

    return result;
}

async function confirmStripePaymentFromClient({ user, paymentIntentId }) {
    if (!paymentIntentId || typeof paymentIntentId !== "string") {
        throw new Error("paymentIntentId es requerido");
    }

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    const payment = await prisma.payments.findFirst({
        where: {
            stripePaymentIntentId: paymentIntentId,
            deletedAt: null,
        },
    });

    if (!payment) {
        throw new Error("No existe una orden asociada a este cobro");
    }

    if (payment.userId !== Number.parseInt(user.id, 10)) {
        throw new Error("No puedes confirmar un pago que no te pertenece");
    }

    if (paymentIntent.status === "succeeded") {
        return finalizeStripePaymentSuccess(paymentIntent);
    }

    if (paymentIntent.status === "canceled") {
        await finalizeStripePaymentFailure(paymentIntentId, "payment_intent.canceled");
        return { ok: false, stripeStatus: "canceled", payment };
    }

    return {
        ok: true,
        pending: true,
        stripeStatus: paymentIntent.status,
        payment,
    };
}

async function getEventCapacity(eventId) {
    const parsedEventId = Number.parseInt(eventId, 10);
    if (!Number.isInteger(parsedEventId) || parsedEventId < 1) {
        throw new Error("El evento es requerido");
    }

    return prisma.$transaction(async (tx) => buildEventCapacitySnapshot(tx, parsedEventId));
}

async function getEventDashboardSummary(eventId) {
    const parsedEventId = Number.parseInt(eventId, 10);
    if (!Number.isInteger(parsedEventId) || parsedEventId < 1) {
        throw new Error("El evento es requerido");
    }

    return prisma.$transaction(async (tx) => buildEventDashboardSnapshot(tx, parsedEventId));
}

async function cancelTicket({ ticketId, user }) {
    const parsedTicketId = Number.parseInt(ticketId, 10);
    if (!Number.isInteger(parsedTicketId) || parsedTicketId < 1) {
        throw new Error("El ticket es requerido");
    }

    const transactionResult = await prisma.$transaction(async (tx) => {
        const ticket = await tx.tickets.findFirst({
            where: {
                id: parsedTicketId,
                deletedAt: null,
            },
            include: {
                event: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                payment: true,
            },
        });

        if (!ticket) {
            throw new Error("La boleta no existe");
        }

        const userId = Number.parseInt(user.id, 10);
        if (user.role.id !== 1 && ticket.userId !== userId) {
            throw new Error("No puedes cancelar una boleta que no te pertenece");
        }

        if (["USED", "CANCELLED", "EXPIRED"].includes(ticket.status)) {
            throw new Error("La boleta no se puede cancelar por su estado actual");
        }

        const cancelledTicket = await tx.tickets.update({
            where: { id: ticket.id },
            data: {
                status: "CANCELLED",
                validated: false,
            },
        });

        if (ticket.paymentId && ticket.payment?.status === "PAID") {
            const paymentActiveTickets = await tx.tickets.count({
                where: {
                    paymentId: ticket.paymentId,
                    deletedAt: null,
                    status: { in: ["ACTIVE", "PURCHASED", "USED", "AVAILABLE"] },
                },
            });

            if (paymentActiveTickets === 0) {
                await tx.payments.update({
                    where: { id: ticket.paymentId },
                    data: {
                        status: "REFUNDED",
                    },
                });
            }
        }

        const cancellationNotification = await tx.notifications.create({
            data: {
                userId: ticket.userId,
                title: "Boleta cancelada",
                message: `Tu boleta ${ticket.codeQr} para '${ticket.event.name}' fue cancelada.`,
                type: "EVENT",
            },
            select: {
                id: true,
                userId: true,
                title: true,
                message: true,
                type: true,
            },
        });

        return {
            cancelledTicket,
            cancellationNotification,
        };
    });

    dispatchPushNotifications([transactionResult.cancellationNotification], "ticketing.cancelTicket");
    return transactionResult.cancelledTicket;
}

async function confirmPayment({ paymentId, user }) {
    const parsedPaymentId = Number.parseInt(paymentId, 10);
    if (!Number.isInteger(parsedPaymentId) || parsedPaymentId < 1) {
        throw new Error("El pago es requerido");
    }

    if (user.role.id !== 1) {
        throw new Error("Solo el admin puede confirmar pagos");
    }

    const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.payments.findFirst({
            where: {
                id: parsedPaymentId,
                deletedAt: null,
            },
            include: {
                event: {
                    include: {
                        site: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                tickets: {
                    where: {
                        deletedAt: null,
                    },
                },
            },
        });

        if (!payment) {
            throw new Error("El pago no existe");
        }

        if (payment.status === "PAID") {
            return { payment, alreadyPaid: true, updatedTickets: [], confirmationNotification: null };
        }

        if (!["PENDING", "FAILED"].includes(payment.status)) {
            throw new Error("El pago no puede ser confirmado desde su estado actual");
        }

        const updatedPayment = await tx.payments.update({
            where: { id: payment.id },
            data: {
                status: "PAID",
                paidAt: new Date(),
            },
        });

        const ticketIds = payment.tickets.map((ticket) => ticket.id);

        if (ticketIds.length > 0) {
            await tx.tickets.updateMany({
                where: {
                    id: { in: ticketIds },
                    status: { in: ["AVAILABLE", "ACTIVE", "PAYMENT_PENDING"] },
                },
                data: {
                    status: "PURCHASED",
                },
            });
        }

        const updatedTickets = await tx.tickets.findMany({
            where: {
                paymentId: payment.id,
                deletedAt: null,
            },
        });

        const confirmationNotification = await tx.notifications.create({
            data: {
                userId: payment.userId,
                title: "Pago confirmado",
                message: `Se confirmo el pago #${payment.id} para '${payment.event.name}'.`,
                type: "PURCHASE",
            },
            select: {
                id: true,
                userId: true,
                title: true,
                message: true,
                type: true,
            },
        });

        return {
            payment: {
                ...updatedPayment,
                event: payment.event,
                user: payment.user,
            },
            alreadyPaid: false,
            updatedTickets,
            confirmationNotification,
        };
    });

    if (!result.alreadyPaid) {
        dispatchPushNotifications([result.confirmationNotification], "ticketing.confirmPayment");
        dispatchTicketConfirmationEmails({
            user: result.payment.user,
            event: result.payment.event,
            tickets: result.updatedTickets,
        });
        dispatchPaymentInvoiceEmail({
            user: result.payment.user,
            event: result.payment.event,
            payment: result.payment,
            tickets: result.updatedTickets,
        });
    }

    return result;
}

async function failPayment({ paymentId, user }) {
    const parsedPaymentId = Number.parseInt(paymentId, 10);
    if (!Number.isInteger(parsedPaymentId) || parsedPaymentId < 1) {
        throw new Error("El pago es requerido");
    }

    if (user.role.id !== 1) {
        throw new Error("Solo el admin puede actualizar pagos");
    }

    const transactionResult = await prisma.$transaction(async (tx) => {
        const payment = await tx.payments.findFirst({
            where: {
                id: parsedPaymentId,
                deletedAt: null,
            },
            include: {
                event: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        if (!payment) {
            throw new Error("El pago no existe");
        }

        const updatedPayment = await tx.payments.update({
            where: { id: payment.id },
            data: {
                status: "FAILED",
            },
        });

        await tx.tickets.updateMany({
            where: {
                paymentId: payment.id,
                deletedAt: null,
                status: { in: ["AVAILABLE", "ACTIVE", "PURCHASED", "PAYMENT_PENDING"] },
            },
            data: {
                status: "CANCELLED",
            },
        });

        const failedPaymentNotification = await tx.notifications.create({
            data: {
                userId: payment.userId,
                title: "Pago fallido",
                message: `El pago #${payment.id} para '${payment.event.name}' quedo fallido.`,
                type: "SYSTEM",
            },
            select: {
                id: true,
                userId: true,
                title: true,
                message: true,
                type: true,
            },
        });

        return {
            updatedPayment,
            failedPaymentNotification,
        };
    });

    dispatchPushNotifications([transactionResult.failedPaymentNotification], "ticketing.failPayment");
    return transactionResult.updatedPayment;
}

module.exports = {
    SOLD_TICKET_STATUSES,
    RESERVED_TICKET_STATUSES,
    createTicketPurchase,
    createStripeTicketPurchase,
    finalizeStripePaymentSuccess,
    finalizeStripePaymentFailure,
    confirmStripePaymentFromClient,
    getEventCapacity,
    getEventDashboardSummary,
    cancelTicket,
    confirmPayment,
    failPayment,
};
