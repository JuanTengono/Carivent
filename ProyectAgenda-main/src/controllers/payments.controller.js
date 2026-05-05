const { prisma } = require("../config/prisma/prisma");
const { successResponse } = require("../config/interfaces/success.interface");
const { getStripe } = require("../services/stripe.client");
const {
    confirmPayment,
    failPayment,
    createStripeTicketPurchase,
    finalizeStripePaymentSuccess,
    finalizeStripePaymentFailure,
    confirmStripePaymentFromClient,
} = require("../services/ticketing.service");

exports.getPayments = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, all = false, eventId, status } = req.query;
        const requesterId = Number.parseInt(req.user.id, 10);

        const where = {
            deletedAt: null,
        };

        if (eventId) {
            where.eventId = Number.parseInt(eventId, 10);
        }

        if (status) {
            where.status = String(status).toUpperCase();
        }

        if (req.user.role.id !== 1) {
            where.userId = requesterId;
        }

        const query = {
            where,
            include: {
                event: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                    },
                },
                promotion: {
                    select: {
                        id: true,
                        code: true,
                        title: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                _count: {
                    select: {
                        tickets: {
                            where: {
                                deletedAt: null,
                            },
                        },
                    },
                },
            },
            orderBy: {
                id: "desc",
            },
        };

        if (!all || all === "false") {
            query.skip = (Number.parseInt(page, 10) - 1) * Number.parseInt(limit, 10);
            query.take = Number.parseInt(limit, 10);
        }

        const [payments, total] = await Promise.all([
            prisma.payments.findMany(query),
            prisma.payments.count({ where }),
        ]);

        return res.json(successResponse("Pagos obtenidos", {
            data: payments,
            pagination: {
                page: Number.parseInt(page, 10),
                limit: Number.parseInt(limit, 10),
                total,
                totalPages: Math.ceil(total / Number.parseInt(limit, 10)),
            },
        }, 200));
    } catch (error) {
        next(error);
    }
};

exports.getPaymentById = async (req, res, next) => {
    try {
        const paymentId = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(paymentId) || paymentId < 1) {
            throw new Error("El pago es requerido");
        }

        const payment = await prisma.payments.findFirst({
            where: {
                id: paymentId,
                deletedAt: null,
            },
            include: {
                event: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                promotion: {
                    select: {
                        id: true,
                        code: true,
                        title: true,
                    },
                },
                tickets: {
                    where: {
                        deletedAt: null,
                    },
                    orderBy: {
                        id: "asc",
                    },
                },
            },
        });

        if (!payment) {
            throw new Error("El pago no existe");
        }

        if (req.user.role.id !== 1 && payment.userId !== Number.parseInt(req.user.id, 10)) {
            throw new Error("No puedes consultar este pago");
        }

        return res.json(successResponse("Pago obtenido", payment, 200));
    } catch (error) {
        next(error);
    }
};

exports.confirmPayment = async (req, res, next) => {
    try {
        const result = await confirmPayment({
            paymentId: req.params.id,
            user: req.user,
        });

        return res.json(successResponse("Pago confirmado", result, 200));
    } catch (error) {
        next(error);
    }
};

exports.failPayment = async (req, res, next) => {
    try {
        const updatedPayment = await failPayment({
            paymentId: req.params.id,
            user: req.user,
        });

        return res.json(successResponse("Pago marcado como fallido", updatedPayment, 200));
    } catch (error) {
        next(error);
    }
};

exports.createPaymentIntent = async (req, res, next) => {
    try {
        const eventId = Number.parseInt(req.body.eventId, 10);
        const quantity = Number.parseInt(req.body.quantity ?? "1", 10);
        if (!Number.isInteger(eventId) || eventId < 1) {
            throw new Error("eventId invalido");
        }
        if (!Number.isInteger(quantity) || quantity < 1) {
            throw new Error("quantity invalida");
        }

        const promotionCode = req.body.promotionCode ? String(req.body.promotionCode) : undefined;
        const currency = req.body.currency ? String(req.body.currency) : "COP";

        const data = await createStripeTicketPurchase({
            user: req.user,
            eventId,
            quantity,
            promotionCode,
            currency,
        });

        return res.status(201).json(successResponse("Intencion de pago creada", data, 201));
    } catch (error) {
        next(error);
    }
};

exports.confirmStripePayment = async (req, res, next) => {
    try {
        const paymentIntentId = req.body?.paymentIntentId ? String(req.body.paymentIntentId).trim() : "";
        if (!paymentIntentId) {
            throw new Error("paymentIntentId es requerido");
        }

        const result = await confirmStripePaymentFromClient({
            user: req.user,
            paymentIntentId,
        });

        return res.json(successResponse("Estado sincronizado con Stripe", result, 200));
    } catch (error) {
        next(error);
    }
};

exports.stripeWebhook = async (req, res) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error(JSON.stringify({
            event: "STRIPE_WEBHOOK_MISCONFIGURED",
            detail: "STRIPE_WEBHOOK_SECRET ausente",
        }));
        return res.status(503).send("Webhook no configurado");
    }

    const signature = req.headers["stripe-signature"];
    if (!signature) {
        return res.status(400).send("Falta stripe-signature");
    }

    try {
        const stripe = getStripe();
        const event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);

        if (event.type === "payment_intent.succeeded") {
            await finalizeStripePaymentSuccess(event.data.object);
        } else if (event.type === "payment_intent.canceled") {
            await finalizeStripePaymentFailure(event.data.object.id, event.type);
        }

        return res.json({ received: true });
    } catch (error) {
        console.error(JSON.stringify({
            event: "STRIPE_WEBHOOK_ERROR",
            message: error.message,
        }));
        return res.status(400).send(`Webhook Error: ${error.message}`);
    }
};
