const publicService = require("../services/public.service");
const { successResponse } = require("../config/interfaces/success.interface");

function getDeepLink(action, token) {
    const scheme = (process.env.APP_DEEP_LINK_SCHEME || "electiva").trim();
    const host = (process.env.APP_DEEP_LINK_HOST || "auth").trim();
    const safeAction = String(action || "").replace(/^\/+/, "");
    return `${scheme}://${host}/${safeAction}?token=${encodeURIComponent(String(token || ""))}`;
}

function renderOpenAppHtml({ title, deepLink }) {
    return `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; line-height: 1.4; }
    .btn { display:inline-block; padding:10px 14px; background:#0a7a72; color:#fff; text-decoration:none; border-radius:6px; }
    .box { max-width: 560px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; padding: 20px; }
    .muted { color:#666; font-size: 14px; word-break: break-all; }
    .note { background:#f5f7f8; border-radius:6px; padding:12px; margin:16px 0; color:#333; }
  </style>
  <script>
    setTimeout(function () {
      window.location.href = ${JSON.stringify(deepLink)};
    }, 150);
  </script>
</head>
<body>
  <div class="box">
    <h2>${title}</h2>
    <p>Estamos intentando abrir tu app automaticamente.</p>
    <p>Si no abre, pulsa este boton:</p>
    <p><a class="btn" href="${deepLink}">Abrir app</a></p>
    <div class="note">
      <strong>Importante:</strong> este boton solo puede abrir la app en el mismo dispositivo donde abriste esta pagina.
      Si abriste el correo en tu computador, no puede lanzar la app dentro del emulador Android.
    </div>
    <p class="muted">Deep link: ${deepLink}</p>
  </div>
</body>
</html>`;
}

exports.getPublicEvents = async (req, res, next) => {
    try {
        const data = await publicService.getPublicEvents(req.query);
        return res.json(successResponse("Eventos publicos obtenidos correctamente", data, 200));
    } catch (error) {
        next(error);
    }
};

exports.getPublicSites = async (req, res, next) => {
    try {
        const data = await publicService.getPublicSites(req.query);
        return res.json(successResponse("Sitios publicos obtenidos correctamente", data, 200));
    } catch (error) {
        next(error);
    }
};

exports.getPublicAgendas = async (req, res, next) => {
    try {
        const data = await publicService.getPublicAgendas(req.query);
        return res.json(successResponse("Agendas publicas obtenidas correctamente", data, 200));
    } catch (error) {
        next(error);
    }
};

exports.getPublicEventCapacity = async (req, res, next) => {
    try {
        const data = await publicService.getPublicEventCapacity(req.params.id);
        return res.json(successResponse("Aforo publico obtenido correctamente", data, 200));
    } catch (error) {
        next(error);
    }
};

exports.openAppResetPassword = async (req, res, next) => {
    try {
        const { token = "" } = req.query;
        const deepLink = getDeepLink("reset-password", token);
        const html = renderOpenAppHtml({
            title: "Restablecer contrasena",
            deepLink,
        });

        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(200).send(html);
    } catch (error) {
        return next(error);
    }
};

exports.openAppVerifyEmail = async (req, res, next) => {
    try {
        const { token = "" } = req.query;
        const deepLink = getDeepLink("verify-email", token);
        const html = renderOpenAppHtml({
            title: "Verificar correo",
            deepLink,
        });

        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(200).send(html);
    } catch (error) {
        return next(error);
    }
};
