# Backend Updates - 2026-03

Este documento resume los cambios principales implementados en el backend para modulos de autenticacion extendida, correo, compras de boletas, pagos y endpoints publicos.

## 1) Auth: verificacion de correo y recuperacion de contrasena

Se agrego soporte completo para:

- Solicitud de verificacion de correo.
- Confirmacion de verificacion de correo por token.
- Solicitud de recuperacion de contrasena.
- Reset de contrasena por token de un solo uso.

### Endpoints nuevos

- `POST /api/v1/auth/request-email-verification`
- `POST /api/v1/auth/resend-email-verification`
- `POST /api/v1/auth/verify-email`
- `GET /api/v1/auth/verify-email`
- `POST /api/v1/auth/request-password-reset`
- `POST /api/v1/auth/reset-password`

### Cambios de modelo de datos

- Usuario:
  - `email_verified` (boolean)
  - `email_verified_at` (timestamp)
- Nueva tabla `user_auth_tokens` con:
  - tipo de token (`EMAIL_VERIFICATION`, `PASSWORD_RESET`)
  - hash del token
  - expiracion
  - estado de uso

## 2) Servicio de correo centralizado

Se implemento `src/services/email.service.js` con:

- plantillas para:
  - verificacion de correo
  - recuperacion de contrasena
  - confirmacion de compra de boletas
  - factura de pago
- soporte SMTP real y modo stub
- logging estructurado de eventos de envio
- redaccion de token en logs (`<REDACTED>`)
- links de deep link (`electiva://...`) y link puente web (`/api/v1/public/open-app/...`)

## 3) Mailpit para pruebas locales

Se integra Mailpit en Docker Compose:

- Servicio `mailpit` (`axllent/mailpit`)
- SMTP: `mailpit:1025` (red interna Docker)
- UI: `http://localhost:8025`

Con esto se evita enviar correos reales en ambiente local.

## 4) Flujo de boletas y pagos

Se centralizo logica en `src/services/ticketing.service.js`:

- compra de boletas con pago inicial `PENDING`
- confirmacion de pago por admin (`PAID`)
- actualizacion de estado de boletas por flujo
- cancelacion de boletas y manejo de estado de pago relacionado
- notificaciones al comprador y al admin
- envio de correos de:
  - confirmacion de boleta
  - factura de pago

### Endpoints asociados

- Tickets:
  - `POST /api/v1/tickets/create-ticket`
  - `PUT /api/v1/tickets/cancel-ticket/:id`
  - `GET /api/v1/tickets/get-attendees/:eventId`
  - `GET /api/v1/tickets/get-capacity/:eventId`
- Pagos:
  - `GET /api/v1/payments/get-payments`
  - `GET /api/v1/payments/get-payment/:id`
  - `PUT /api/v1/payments/confirm-payment/:id`
  - `PUT /api/v1/payments/fail-payment/:id`

## 5) Endpoints publicos nuevos

Se agregaron rutas publicas para catalogo y links puente:

- `GET /api/v1/public/events`
- `GET /api/v1/public/sites`
- `GET /api/v1/public/agendas`
- `GET /api/v1/public/events/:id/capacity`
- `GET /api/v1/public/open-app/reset-password`
- `GET /api/v1/public/open-app/verify-email`

## 6) Variables de entorno nuevas (resumen)

- SMTP:
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `SMTP_FROM`
  - `EMAIL_TRANSPORT`
  - `EMAIL_LOG_PATH`
- Deep links y puente:
  - `APP_DEEP_LINK_SCHEME`
  - `APP_DEEP_LINK_HOST`
  - `APP_LINK_BRIDGE_BASE_URL`
- TTL de tokens:
  - `EMAIL_VERIFICATION_TOKEN_TTL_MINUTES`
  - `PASSWORD_RESET_TOKEN_TTL_MINUTES`
- Mailpit (Docker local):
  - `MAILPIT_SMTP_PORT`
  - `MAILPIT_WEB_PORT`

## 7) Scripts de validacion agregados

- `npm run test:auth:email`
- `npm run test:user:regression`
- `npm run test:public`
- `npm run test:full:features`

Estos scripts validan flujos de auth/email, onboarding de usuarios, endpoints publicos y regresion funcional integral.

## 8) Push real con Firebase Cloud Messaging (FCM)

Se agrega soporte de push no bloqueante sobre el sistema actual de notificaciones internas:

- modelo `notification_devices` para tokens por usuario/dispositivo
- endpoints:
  - `POST /api/v1/notifications/register-device`
  - `POST /api/v1/notifications/unregister-device`
- servicio reusable de inicializacion Firebase Admin:
  - `src/services/firebase-admin.service.js`
- servicio de envio push y limpieza de tokens invalidos:
  - `src/services/push-notification.service.js`

Integraciones realizadas:

- `create-notification`, `broadcast-promotion` y `broadcast-event`
- flujos de `ticketing.service.js`
- jobs de `lifecycle.service.js`

El comportamiento es no bloqueante: si Firebase falla o no hay credenciales, la notificacion en BD se crea igualmente.
