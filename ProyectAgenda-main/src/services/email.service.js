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

function emailBase(bodyContent) {
    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#0d0d0d;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0d0d;padding:40px 16px">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#111111;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)">
      <tr>
        <td style="background:linear-gradient(135deg,#1a0030 0%,#2a0050 100%);padding:36px;text-align:center">
          <table cellpadding="0" cellspacing="0" style="margin:0 auto">
            <tr><td style="width:56px;height:56px;background-color:#830cc4;border-radius:50%;text-align:center;vertical-align:middle;font-size:26px;font-weight:bold;color:#ffffff;line-height:56px">C</td></tr>
          </table>
          <p style="margin:14px 0 0;color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:0.5px">Carivent</p>
        </td>
      </tr>
      <tr><td style="padding:36px 40px">${bodyContent}</td></tr>
      <tr>
        <td style="background-color:#0a0a0a;padding:20px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.06)">
          <p style="margin:0;color:#555555;font-size:12px">Carivent &middot; Descubre eventos incre&iacute;bles</p>
          <p style="margin:6px 0 0;color:#444444;font-size:11px">Si no reconoces esta acci&oacute;n, ignora este mensaje.</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function buildWelcomeTemplate(payload) {
    const subject = `¡Bienvenido a Carivent, ${payload.userName || ""}!`.trim();

    const text = [
        `Hola ${payload.userName || ""},`,
        "",
        "¡Tu cuenta en Carivent fue creada con éxito!",
        "Ya puedes explorar eventos, comprar boletas y vivir experiencias increíbles.",
        "",
        "Si no creaste esta cuenta, ignora este mensaje.",
        "",
        "— El equipo de Carivent",
    ].join("\n");

    const frontendUrl = getEnv("FRONTEND_URL", "https://carivent.vercel.app");

    const html = emailBase(`
      <h2 style="margin:0 0 8px;color:#ffffff;font-size:22px">¡Bienvenido, ${payload.userName || ""}! &#x1F389;</h2>
      <p style="margin:0 0 20px;color:#a0a0a0;font-size:14px;line-height:1.6">
        Tu cuenta fue creada exitosamente. Ahora formas parte de Carivent, donde encontrar&aacute;s deportes, tecnolog&iacute;a, cultura y mucho m&aacute;s en una sola cartelera.
      </p>

      <table cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;border-radius:10px;border:1px solid rgba(255,255,255,0.08);width:100%;margin-bottom:28px">
        <tr>
          <td style="padding:20px 24px">
            <p style="margin:0 0 6px;color:#777777;font-size:11px;text-transform:uppercase;letter-spacing:0.1em">Tu cuenta</p>
            <p style="margin:0;color:#ffffff;font-size:15px;font-weight:bold">${payload.userName || ""}</p>
            <p style="margin:4px 0 0;color:#999999;font-size:13px">${payload.email || ""}</p>
          </td>
        </tr>
      </table>

      <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:28px">
        <tr>
          <td align="center">
            <a href="${frontendUrl}" style="display:inline-block;background-color:#830cc4;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:bold">
              Explorar eventos
            </a>
          </td>
        </tr>
      </table>

      <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:20px">
        <p style="margin:0;color:#666666;font-size:13px;line-height:1.6">
          &iquest;Tienes dudas? Escr&iacute;benos directamente respondiendo este correo.
        </p>
      </div>
    `);

    return { subject, text, html };
}

function buildTicketConfirmationTemplate(payload) {
    const startDate = toIsoDate(payload.startTime);
    const endDate = toIsoDate(payload.endTime);
    const location = [payload.siteName, payload.siteAddress, payload.siteCity].filter(Boolean).join(" · ");

    const subject = `¡Tu boleta está confirmada! – ${payload.eventName || "Carivent"}`;

    const text = [
        `Hola ${payload.userName || ""},`,
        "",
        "¡Tu compra fue exitosa! Aquí están los detalles de tu boleta:",
        "",
        `Evento : ${payload.eventName || "No disponible"}`,
        `Inicio : ${startDate}`,
        `Fin    : ${endDate}`,
        `Lugar  : ${location || "No disponible"}`,
        `Ticket : #${payload.ticketId}`,
        `Código : ${payload.codeQr}`,
        "",
        "Presenta el código QR en la entrada del evento.",
        "Gracias por elegir Carivent.",
    ].join("\n");

    const html = emailBase(`
      <h2 style="margin:0 0 8px;color:#ffffff;font-size:22px">&#x1F3AB; ¡Boleta confirmada!</h2>
      <p style="margin:0 0 24px;color:#a0a0a0;font-size:14px;line-height:1.6">
        Hola <strong style="color:#ffffff">${payload.userName || ""}</strong>, tu compra fue procesada con &eacute;xito. Aqu&iacute; tienes todo lo que necesitas para el evento.
      </p>

      <table cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;border-radius:12px;border:1px solid rgba(131,12,196,0.3);width:100%;margin-bottom:24px">
        <tr>
          <td style="padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.06)">
            <p style="margin:0 0 4px;color:#777777;font-size:11px;text-transform:uppercase;letter-spacing:0.1em">Evento</p>
            <p style="margin:0;color:#ffffff;font-size:16px;font-weight:bold">${payload.eventName || "No disponible"}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.06)">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:50%;vertical-align:top">
                  <p style="margin:0 0 4px;color:#777777;font-size:11px;text-transform:uppercase;letter-spacing:0.1em">Inicio</p>
                  <p style="margin:0;color:#cccccc;font-size:13px">${startDate}</p>
                </td>
                <td style="width:50%;vertical-align:top">
                  <p style="margin:0 0 4px;color:#777777;font-size:11px;text-transform:uppercase;letter-spacing:0.1em">Fin</p>
                  <p style="margin:0;color:#cccccc;font-size:13px">${endDate}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px">
            <p style="margin:0 0 4px;color:#777777;font-size:11px;text-transform:uppercase;letter-spacing:0.1em">Lugar</p>
            <p style="margin:0;color:#cccccc;font-size:13px">${location || "No disponible"}</p>
          </td>
        </tr>
      </table>

      <table cellpadding="0" cellspacing="0" style="background-color:#1a0030;border-radius:12px;border:1px solid rgba(131,12,196,0.4);width:100%;margin-bottom:28px">
        <tr>
          <td style="padding:20px 24px">
            <p style="margin:0 0 4px;color:#b246f2;font-size:11px;text-transform:uppercase;letter-spacing:0.1em">C&oacute;digo de tu boleta #${payload.ticketId}</p>
            <p style="margin:8px 0 0;color:#ffffff;font-size:13px;font-family:monospace;word-break:break-all;background-color:rgba(0,0,0,0.3);padding:12px;border-radius:8px;border:1px solid rgba(131,12,196,0.2)">${payload.codeQr}</p>
            <p style="margin:10px 0 0;color:#888888;font-size:12px">Presenta este c&oacute;digo QR en la entrada del evento.</p>
          </td>
        </tr>
      </table>

      <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:20px;text-align:center">
        <p style="margin:0;color:#666666;font-size:13px">Gracias por elegir Carivent. &#x1F389;</p>
      </div>
    `);

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

async function sendWelcomeEmail(payload) {
    const template = buildWelcomeTemplate(payload);
    return sendEmail({
        type: "WELCOME",
        to: payload.to,
        subject: template.subject,
        text: template.text,
        html: template.html,
        metadata: { userId: payload.userId },
    });
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
    sendWelcomeEmail,
    sendTicketPurchaseConfirmationEmail,
    sendEmailVerificationEmail,
    sendPasswordResetEmail,
    sendPaymentInvoiceEmail,
};
