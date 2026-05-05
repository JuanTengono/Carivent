const fs = require("fs");
const path = require("path");

let cachedTransporter = null;
let cachedTransporterKey = null;
let cachedNodemailer = null;
const BREVO_SEND_EMAIL_URL = "https://api.brevo.com/v3/smtp/email";

function getEnv(name, fallback = "") {
    return (process.env[name] || fallback).toString().trim();
}

function getEmailLogPath() {
    return path.resolve(process.cwd(), getEnv("EMAIL_LOG_PATH", "logs/email.log"));
}

function writeEmailLog(entry) {
    const logPath = getEmailLogPath();
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, `${JSON.stringify(entry)}\n`, "utf8");
}

function toIsoDate(value) {
    if (!value) return "No disponible";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "No disponible" : parsed.toISOString();
}

function buildTransporterConfig() {
    const host = getEnv("SMTP_HOST");
    const port = Number.parseInt(getEnv("SMTP_PORT", "0"), 10);
    const user = getEnv("SMTP_USER");
    const pass = getEnv("SMTP_PASS");

    if (!host || !Number.isInteger(port) || port <= 0) {
        return null;
    }

    return {
        host,
        port,
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
    };
}

function buildBrevoConfig() {
    const apiKey = getEnv("BREVO_API_KEY");
    const senderName = getEnv("BREVO_SENDER_NAME");
    const senderEmail = getEnv("BREVO_SENDER_EMAIL");

    if (!apiKey || !senderName || !senderEmail) {
        return null;
    }

    return {
        apiKey,
        sender: {
            name: senderName,
            email: senderEmail,
        },
    };
}

function getTransporter(config) {
    if (!cachedNodemailer) {
        try {
            // eslint-disable-next-line global-require
            cachedNodemailer = require("nodemailer");
        } catch (error) {
            throw new Error("nodemailer no esta disponible en runtime");
        }
    }

    const configKey = JSON.stringify(config);
    if (cachedTransporter && cachedTransporterKey === configKey) {
        return cachedTransporter;
    }

    cachedTransporter = cachedNodemailer.createTransport(config);
    cachedTransporterKey = configKey;
    return cachedTransporter;
}

function buildAppDeepLink(pathSegment, token) {
    const scheme = getEnv("APP_DEEP_LINK_SCHEME", "electiva");
    const host = getEnv("APP_DEEP_LINK_HOST", "auth");
    const normalizedPath = String(pathSegment || "").replace(/^\/+/, "");
    const encodedToken = encodeURIComponent(String(token || ""));
    return `${scheme}://${host}/${normalizedPath}?token=${encodedToken}`;
}

function normalizeBaseUrl(rawValue) {
    const trimmed = String(rawValue || "").trim();
    if (!trimmed) return "";

    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed.replace(/\/$/, "");
    }

    return `https://${trimmed.replace(/\/$/, "")}`;
}

function resolveBridgeBaseUrl() {
    const explicitBase = normalizeBaseUrl(getEnv("APP_LINK_BRIDGE_BASE_URL"));
    if (explicitBase) return explicitBase;

    const railwayDomain = normalizeBaseUrl(getEnv("RAILWAY_PUBLIC_DOMAIN"));
    if (railwayDomain) return railwayDomain;

    const fallbackBase = `http://localhost:${getEnv("PORT", "3000")}`;
    return normalizeBaseUrl(fallbackBase);
}

function redactTokenInUrl(actionUrl) {
    if (!actionUrl) return actionUrl;
    const [base] = String(actionUrl).split("token=");
    return `${base}token=<REDACTED>`;
}

function buildLinkBridgeUrl(pathSegment, token) {
    const base = resolveBridgeBaseUrl();
    const normalizedPath = String(pathSegment || "").replace(/^\/+/, "");
    const encodedToken = encodeURIComponent(String(token || ""));
    return `${base}/api/v1/public/open-app/${normalizedPath}?token=${encodedToken}`;
}

function summarizeResponseBody(body) {
    if (body === null || body === undefined || body === "") return "";

    try {
        const serialized = typeof body === "string" ? body : JSON.stringify(body);
        return serialized.length > 500 ? `${serialized.slice(0, 500)}...` : serialized;
    } catch (error) {
        return String(body);
    }
}

function normalizeBrevoRecipients(to) {
    const recipients = Array.isArray(to) ? to : [to];

    return recipients
        .map((recipient) => {
            if (!recipient) return null;

            if (typeof recipient === "string") {
                const email = recipient.trim();
                return email ? { email } : null;
            }

            const email = String(recipient.email || "").trim();
            if (!email) return null;

            const name = String(recipient.name || "").trim();
            return name ? { email, name } : { email };
        })
        .filter(Boolean);
}

function resolveEmailDelivery() {
    const provider = getEnv("EMAIL_PROVIDER", "").toLowerCase();
    const transportMode = getEnv("EMAIL_TRANSPORT", "").toLowerCase();
    const smtpFrom = getEnv("SMTP_FROM");
    const transporterConfig = buildTransporterConfig();
    const brevoConfig = buildBrevoConfig();

    if (transportMode === "stub") {
        return {
            mode: "stub",
            provider: provider || "stub",
            reason: "explicit_stub_mode",
        };
    }

    if (provider && !["brevo", "smtp"].includes(provider)) {
        return {
            mode: "stub",
            provider,
            reason: "unsupported_email_provider",
        };
    }

    if (provider === "brevo") {
        if (!brevoConfig) {
            return {
                mode: "stub",
                provider: "brevo",
                reason: "brevo_not_configured",
            };
        }

        return {
            mode: "brevo",
            provider: "brevo",
            brevoConfig,
        };
    }

    if ((provider === "smtp" || !provider) && smtpFrom && transporterConfig) {
        return {
            mode: "smtp",
            provider: "smtp",
            smtpFrom,
            transporterConfig,
        };
    }

    return {
        mode: "stub",
        provider: provider || "smtp",
        reason: "smtp_not_configured",
    };
}

function buildTicketConfirmationTemplate(payload) {
    const startDate = toIsoDate(payload.startTime);
    const endDate = toIsoDate(payload.endTime);
    const location = [payload.siteName, payload.siteAddress, payload.siteCity].filter(Boolean).join(" - ");

    const subject = "Confirmacion de compra de boleta";

    const text = [
        `Hola ${payload.userName || "usuario"},`,
        "",
        "Tu compra de boleta fue confirmada.",
        "",
        `Evento: ${payload.eventName || "No disponible"}`,
        `Inicio: ${startDate}`,
        `Fin: ${endDate}`,
        `Lugar: ${location || "No disponible"}`,
        `ID Ticket: ${payload.ticketId}`,
        `Code QR: ${payload.codeQr}`,
        "",
        "Gracias por usar la plataforma.",
    ].join("\n");

    const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.4;">
            <h2>Confirmacion de compra de boleta</h2>
            <p>Hola ${payload.userName || "usuario"},</p>
            <p>Tu compra de boleta fue confirmada.</p>
            <ul>
                <li><strong>Evento:</strong> ${payload.eventName || "No disponible"}</li>
                <li><strong>Inicio:</strong> ${startDate}</li>
                <li><strong>Fin:</strong> ${endDate}</li>
                <li><strong>Lugar:</strong> ${location || "No disponible"}</li>
                <li><strong>ID Ticket:</strong> ${payload.ticketId}</li>
                <li><strong>Code QR:</strong> ${payload.codeQr}</li>
            </ul>
            <p>Gracias por usar la plataforma.</p>
        </div>
    `;

    return { subject, text, html };
}

function buildEmailVerificationTemplate(payload) {
    const subject = "Verifica tu correo";
    const expiresAt = toIsoDate(payload.expiresAt);
    const verificationUrl = payload.verificationUrl;
    const verificationBridgeUrl = payload.verificationBridgeUrl;

    const text = [
        `Hola ${payload.userName || "usuario"},`,
        "",
        "Para activar tu cuenta, abre este enlace:",
        verificationBridgeUrl,
        "",
        "Deep link directo:",
        verificationUrl,
        "",
        `Este enlace expira: ${expiresAt}`,
    ].join("\n");

    const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.4;">
            <h2>Verificacion de correo</h2>
            <p>Hola ${payload.userName || "usuario"},</p>
            <p>Para activar tu cuenta, usa este boton:</p>
            <p>
                <a href="${verificationBridgeUrl}" style="display:inline-block;padding:10px 14px;background:#0a7a72;color:#ffffff;text-decoration:none;border-radius:6px;">
                    Abrir app y verificar correo
                </a>
            </p>
            <p>Si no abre, prueba el deep link directo:</p>
            <p>
                <a href="${verificationUrl}" style="display:inline-block;padding:10px 14px;background:#0a7a72;color:#ffffff;text-decoration:none;border-radius:6px;">
                    Abrir app y verificar correo
                </a>
            </p>
            <p>Enlace web puente:</p>
            <p><a href="${verificationBridgeUrl}">${verificationBridgeUrl}</a></p>
            <p>Deep link:</p>
            <p><a href="${verificationUrl}">${verificationUrl}</a></p>
            <p><strong>Expira:</strong> ${expiresAt}</p>
        </div>
    `;

    return { subject, text, html };
}

function buildPasswordResetTemplate(payload) {
    const subject = "Recuperacion de contrasena";
    const expiresAt = toIsoDate(payload.expiresAt);
    const resetUrl = payload.resetUrl;
    const resetBridgeUrl = payload.resetBridgeUrl;

    const text = [
        `Hola ${payload.userName || "usuario"},`,
        "",
        "Recibimos una solicitud para restablecer tu contrasena.",
        "Usa este enlace para continuar:",
        resetBridgeUrl,
        "",
        "Deep link directo:",
        resetUrl,
        "",
        `Este enlace expira: ${expiresAt}`,
        "Si no solicitaste este cambio, ignora este mensaje.",
    ].join("\n");

    const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.4;">
            <h2>Recuperacion de contrasena</h2>
            <p>Hola ${payload.userName || "usuario"},</p>
            <p>Recibimos una solicitud para restablecer tu contrasena.</p>
            <p>
                <a href="${resetBridgeUrl}" style="display:inline-block;padding:10px 14px;background:#0a7a72;color:#ffffff;text-decoration:none;border-radius:6px;">
                    Abrir app y restablecer password
                </a>
            </p>
            <p>Si no abre, prueba el deep link directo:</p>
            <p>
                <a href="${resetUrl}" style="display:inline-block;padding:10px 14px;background:#0a7a72;color:#ffffff;text-decoration:none;border-radius:6px;">
                    Abrir app y restablecer password
                </a>
            </p>
            <p>Enlace web puente:</p>
            <p><a href="${resetBridgeUrl}">${resetBridgeUrl}</a></p>
            <p>Deep link:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p><strong>Expira:</strong> ${expiresAt}</p>
            <p>Si no solicitaste este cambio, ignora este mensaje.</p>
        </div>
    `;

    return { subject, text, html };
}

function buildPaymentInvoiceTemplate(payload) {
    const eventStart = toIsoDate(payload.event?.startTime);
    const eventEnd = toIsoDate(payload.event?.endTime);
    const location = [
        payload.event?.site?.name,
        payload.event?.site?.direction,
        payload.event?.site?.ubication,
    ].filter(Boolean).join(" - ");

    const quantity = Number(payload.payment?.quantity || payload.tickets?.length || 0);
    const total = Number(payload.payment?.totalAmount || 0).toFixed(2);
    const subtotal = Number(payload.payment?.subtotal || 0).toFixed(2);
    const discount = Number(payload.payment?.discountAmount || 0).toFixed(2);
    const currency = payload.payment?.currency || "COP";
    const paidAt = toIsoDate(payload.payment?.paidAt);
    const ticketCodes = (payload.tickets || []).map((ticket) => ticket.codeQr).filter(Boolean);

    const subject = `Factura de compra #${payload.payment?.id || ""}`.trim();

    const text = [
        `Hola ${payload.userName || "usuario"},`,
        "",
        "Tu pago fue confirmado. Esta es tu factura:",
        `Factura/Pago ID: ${payload.payment?.id || "No disponible"}`,
        `Evento: ${payload.event?.name || "No disponible"}`,
        `Inicio: ${eventStart}`,
        `Fin: ${eventEnd}`,
        `Lugar: ${location || "No disponible"}`,
        `Cantidad de boletas: ${quantity}`,
        `Subtotal: ${subtotal} ${currency}`,
        `Descuento: ${discount} ${currency}`,
        `Total pagado: ${total} ${currency}`,
        `Fecha de pago: ${paidAt}`,
        `Boletas: ${ticketCodes.join(", ") || "No disponible"}`,
        "",
        "Gracias por tu compra.",
    ].join("\n");

    const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.4;">
            <h2>Factura de compra</h2>
            <p>Hola ${payload.userName || "usuario"},</p>
            <p>Tu pago fue confirmado. Esta es tu factura:</p>
            <ul>
                <li><strong>Factura/Pago ID:</strong> ${payload.payment?.id || "No disponible"}</li>
                <li><strong>Evento:</strong> ${payload.event?.name || "No disponible"}</li>
                <li><strong>Inicio:</strong> ${eventStart}</li>
                <li><strong>Fin:</strong> ${eventEnd}</li>
                <li><strong>Lugar:</strong> ${location || "No disponible"}</li>
                <li><strong>Cantidad de boletas:</strong> ${quantity}</li>
                <li><strong>Subtotal:</strong> ${subtotal} ${currency}</li>
                <li><strong>Descuento:</strong> ${discount} ${currency}</li>
                <li><strong>Total pagado:</strong> ${total} ${currency}</li>
                <li><strong>Fecha de pago:</strong> ${paidAt}</li>
            </ul>
            <p><strong>Boletas:</strong> ${ticketCodes.join(", ") || "No disponible"}</p>
        </div>
    `;

    return { subject, text, html };
}

async function sendEmailViaBrevo({ to, subject, html, text, type, metadata = {}, config }) {
    if (typeof fetch !== "function") {
        throw new Error("fetch no esta disponible en runtime para Brevo");
    }

    const recipients = normalizeBrevoRecipients(to);
    if (recipients.length === 0) {
        throw new Error("No hay destinatarios validos para Brevo");
    }

    const response = await fetch(BREVO_SEND_EMAIL_URL, {
        method: "POST",
        headers: {
            accept: "application/json",
            "content-type": "application/json",
            "api-key": config.apiKey,
        },
        body: JSON.stringify({
            sender: config.sender,
            to: recipients,
            subject,
            htmlContent: html,
            textContent: text,
        }),
    });

    let responseBody = null;
    try {
        responseBody = await response.json();
    } catch (error) {
        responseBody = null;
    }

    if (!response.ok) {
        const error = new Error(`Brevo request failed with status ${response.status}`);
        error.statusCode = response.status;
        error.responseBody = summarizeResponseBody(responseBody);
        throw error;
    }

    const messageId = responseBody?.messageId || responseBody?.messageIds?.[0] || null;

    writeEmailLog({
        event: "EMAIL_SEND_SUCCESS",
        provider: "brevo",
        type,
        timestamp: new Date().toISOString(),
        to,
        ...metadata,
        messageId,
    });

    return { sent: true, mode: "brevo", provider: "brevo", messageId };
}

async function sendEmailViaSmtp({ to, subject, html, text, type, metadata = {}, smtpFrom, transporterConfig }) {
    const transporter = getTransporter(transporterConfig);
    const info = await transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        text,
        html,
    });

    writeEmailLog({
        event: "EMAIL_SEND_SUCCESS",
        provider: "smtp",
        type,
        timestamp: new Date().toISOString(),
        to,
        ...metadata,
        messageId: info.messageId,
    });

    return { sent: true, mode: "smtp", provider: "smtp", messageId: info.messageId };
}

async function sendEmail({ type, to, subject, text, html, metadata = {} }) {
    const timestamp = new Date().toISOString();
    const delivery = resolveEmailDelivery();

    writeEmailLog({
        event: "EMAIL_SEND_ATTEMPT",
        provider: delivery.provider,
        type,
        timestamp,
        to,
        ...metadata,
    });

    if (delivery.mode === "stub") {
        writeEmailLog({
            event: "EMAIL_SEND_STUB",
            provider: delivery.provider,
            type,
            timestamp: new Date().toISOString(),
            reason: delivery.reason,
            to,
            ...metadata,
        });

        return { sent: false, mode: "stub", provider: delivery.provider };
    }

    try {
        if (delivery.mode === "brevo") {
            return sendEmailViaBrevo({
                to,
                subject,
                html,
                text,
                type,
                metadata,
                config: delivery.brevoConfig,
            });
        }

        return sendEmailViaSmtp({
            to,
            subject,
            html,
            text,
            type,
            metadata,
            smtpFrom: delivery.smtpFrom,
            transporterConfig: delivery.transporterConfig,
        });
    } catch (error) {
        writeEmailLog({
            event: "EMAIL_SEND_FAILED",
            provider: delivery.provider,
            type,
            timestamp: new Date().toISOString(),
            to,
            ...metadata,
            error: error.message,
            statusCode: error.statusCode || null,
            responseBody: error.responseBody || "",
        });
        throw error;
    }
}

async function sendTicketPurchaseConfirmationEmail(payload) {
    const template = buildTicketConfirmationTemplate(payload);
    return sendEmail({
        type: "TICKET_PURCHASE_CONFIRMATION",
        to: payload.to,
        subject: template.subject,
        text: template.text,
        html: template.html,
        metadata: {
            ticketId: payload.ticketId,
            codeQr: payload.codeQr,
        },
    });
}

async function sendEmailVerificationEmail(payload) {
    const verificationUrl = buildAppDeepLink("verify-email", payload.token);
    const verificationBridgeUrl = buildLinkBridgeUrl("verify-email", payload.token);
    const template = buildEmailVerificationTemplate({
        ...payload,
        verificationUrl,
        verificationBridgeUrl,
    });

    return sendEmail({
        type: "EMAIL_VERIFICATION",
        to: payload.to,
        subject: template.subject,
        text: template.text,
        html: template.html,
        metadata: {
            userId: payload.userId,
            expiresAt: payload.expiresAt,
            bridgeUrl: redactTokenInUrl(verificationBridgeUrl),
            actionUrl: redactTokenInUrl(verificationUrl),
        },
    });
}

async function sendPasswordResetEmail(payload) {
    const resetUrl = buildAppDeepLink("reset-password", payload.token);
    const resetBridgeUrl = buildLinkBridgeUrl("reset-password", payload.token);
    const template = buildPasswordResetTemplate({
        ...payload,
        resetUrl,
        resetBridgeUrl,
    });

    return sendEmail({
        type: "PASSWORD_RESET",
        to: payload.to,
        subject: template.subject,
        text: template.text,
        html: template.html,
        metadata: {
            userId: payload.userId,
            expiresAt: payload.expiresAt,
            bridgeUrl: redactTokenInUrl(resetBridgeUrl),
            actionUrl: redactTokenInUrl(resetUrl),
        },
    });
}

async function sendPaymentInvoiceEmail(payload) {
    const template = buildPaymentInvoiceTemplate(payload);
    return sendEmail({
        type: "PAYMENT_INVOICE",
        to: payload.to,
        subject: template.subject,
        text: template.text,
        html: template.html,
        metadata: {
            paymentId: payload.payment?.id,
            ticketCount: (payload.tickets || []).length,
            totalAmount: payload.payment?.totalAmount,
            currency: payload.payment?.currency,
        },
    });
}

module.exports = {
    sendTicketPurchaseConfirmationEmail,
    sendEmailVerificationEmail,
    sendPasswordResetEmail,
    sendPaymentInvoiceEmail,
};
