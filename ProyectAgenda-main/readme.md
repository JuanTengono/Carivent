# Eventos API

API backend con Node.js, Express y Prisma (PostgreSQL).

## Documentacion tecnica de cambios recientes

- Resumen completo de cambios backend (auth/email, pagos/boletas, Mailpit, endpoints publicos):
  - `docs/backend-updates-2026-03.md`

## Requisitos

- [Docker](https://docs.docker.com/get-docker/) y Docker Compose
- Opcional (sin Docker): Node.js 20+, PostgreSQL 16

## Configuración

1. Copia el archivo de entorno y ajusta los valores:

```bash
cp .env.example .env
```

2. Variables necesarias en `.env` (ejemplo):

- `DATABASE_URL` – URL de conexión a PostgreSQL (usada por Prisma)
- `DB_USER`, `DB_PASSWORD`, `DB_NAME` – credenciales de la base de datos
- `PORT` – puerto del backend (ej: 3000)
- `JWT_SECRET` – secreto para JWT
- `ADMINER_PORT` – puerto de Adminer (ej: 8080)

## Ejecutar con Docker

Levantar todos los servicios (base de datos, backend, Adminer):

```bash
docker compose up --build -d
```

El backend ejecuta automáticamente `prisma migrate deploy` y `prisma db seed` al iniciar (ver script `start:docker` en `package.json`).

## Correo local con Mailpit

Para desarrollo, el `docker-compose` ya incluye `Mailpit` como inbox SMTP local.

- UI web: `http://localhost:8025`
- SMTP interno para el backend: `mailpit:1025`

Con esta configuracion, los correos de verificacion y recuperacion aparecen casi al instante en la UI de Mailpit, sin depender de Gmail.

## Envio de correo con Brevo API en Railway

Para despliegue en Railway, el camino recomendado es usar Brevo por HTTPS en vez de SMTP. Esto evita los timeouts y bloqueos de puertos SMTP en planes Free/Hobby.

Variables requeridas:

- `EMAIL_PROVIDER=brevo`
- `BREVO_API_KEY`
- `BREVO_SENDER_NAME`
- `BREVO_SENDER_EMAIL`
- `APP_LINK_BRIDGE_BASE_URL`
- `APP_DEEP_LINK_SCHEME`
- `APP_DEEP_LINK_HOST`

Ejemplo de configuracion para Railway:

```env
EMAIL_PROVIDER=brevo
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxx
BREVO_SENDER_NAME=Electiva
BREVO_SENDER_EMAIL=no-reply@tu-dominio.com
APP_LINK_BRIDGE_BASE_URL=https://proyectagenda-production.up.railway.app
APP_DEEP_LINK_SCHEME=electiva
APP_DEEP_LINK_HOST=auth
```

Si no defines `APP_LINK_BRIDGE_BASE_URL`, el backend intentara usar `RAILWAY_PUBLIC_DOMAIN` automaticamente. Si tampoco existe, caera a `http://localhost:<PORT>`.

## Compatibilidad SMTP y entorno local

El soporte SMTP con `nodemailer` se mantiene como compatibilidad secundaria.

Para desarrollo local con Mailpit:

- deja `EMAIL_PROVIDER` vacio
- configura `SMTP_HOST=mailpit`
- configura `SMTP_PORT=1025`
- configura `SMTP_FROM=no-reply@electiva.local`

Si `EMAIL_PROVIDER=brevo` pero faltan `BREVO_API_KEY`, `BREVO_SENDER_NAME` o `BREVO_SENDER_EMAIL`, el backend no falla: registra `EMAIL_SEND_STUB` con `reason=brevo_not_configured`.

Prueba manual recomendada:

```bash
curl -X POST http://localhost:3000/api/v1/auth/request-password-reset \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"usuario@correo.com\"}"

curl -X POST http://localhost:3000/api/v1/auth/resend-email-verification \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"usuario@correo.com\"}"
```

## Swagger

La documentación interactiva está disponible en:

- `http://localhost:3000/api-docs`

Incluye todos los endpoints del backend (módulos 1, 2, 3 y 4) con autenticación Bearer JWT para rutas protegidas.

## Nuevos endpoints (Módulo 3 y 4)

- `POST /api/v1/tickets/create-ticket`
- `GET /api/v1/tickets/get-tickets`
- `PUT /api/v1/tickets/validate-ticket/:codeQr`
- `POST /api/v1/notifications/create-notification`
- `GET /api/v1/notifications/get-notifications`
- `PUT /api/v1/notifications/mark-notification-as-read/:id`
- `POST /api/v1/notifications/register-device`
- `POST /api/v1/notifications/unregister-device`
- `POST /api/v1/surveys/create-survey`
- `GET /api/v1/surveys/get-surveys`
- `POST /api/v1/surveys/create-survey-response`
- `GET /api/v1/surveys/get-survey-responses`

## Push notifications (Firebase FCM)

El backend mantiene la tabla de notificaciones internas como fuente de verdad y adicionalmente puede enviar push real con Firebase Cloud Messaging.

Variables de entorno:

- `GOOGLE_APPLICATION_CREDENTIALS` - ruta al archivo de credenciales de servicio.
- `FIREBASE_SERVICE_ACCOUNT_JSON` - credenciales como JSON en string.

Si ninguna credencial esta disponible, el backend no falla: registra logs y continua funcionando con notificaciones internas.

## Pruebas intensivas (Módulo 3 y 4)

Con los contenedores arriba, ejecuta:

```bash
npm run test:intensive:34
```

Este script prueba integración end-to-end de tickets, validación QR, notificaciones, encuestas y respuestas contra la base de datos en Docker.

---

## Migraciones con Prisma

Las migraciones se ejecutan dentro del contenedor `backend` para usar la misma red que la base de datos.

### 1. Aplicar migraciones existentes (producción / despliegue)

Aplica todas las migraciones pendientes sin crear nuevas:

```bash
docker compose run --rm backend npx prisma migrate deploy
```

### 2. Crear una nueva migración (desarrollo)

Cuando cambies `prisma/schema.prisma`, crea y aplica una migración con un nombre descriptivo:

```bash
docker compose run --rm backend npx prisma migrate dev --name descripcion_del_cambio
```

Ejemplos:

```bash
docker compose run --rm backend npx prisma migrate dev --name add_events_table
docker compose run --rm backend npx prisma migrate dev --name add_unique_role_name
```

Este comando:

- Crea un archivo SQL en `prisma/migrations/`
- Aplica la migración a la base de datos
- Regenera el Prisma Client

**Importante:** La base de datos debe estar levantada. Si no lo está:

```bash
docker compose up -d db
docker compose run --rm backend npx prisma migrate dev --name nombre_migracion
```

### 3. Ver estado de las migraciones

```bash
docker compose run --rm backend npx prisma migrate status
```

### 4. Regenerar el Prisma Client

Si solo cambias el schema y no quieres crear migración (por ejemplo en prototipos):

```bash
docker compose run --rm backend npx prisma generate
```

---

## Seed (datos iniciales)

Ejecutar el seed manualmente (roles y usuario admin por defecto):

```bash
docker compose run --rm backend npx prisma db seed
```

En Docker, el seed también se ejecuta al arrancar el backend gracias a `start:docker`.

---

## Resumen rápido

| Acción                    | Comando                                                                 |
|---------------------------|-------------------------------------------------------------------------|
| Levantar todo             | `docker compose up --build -d`                                          |
| Crear nueva migración     | `docker compose run --rm backend npx prisma migrate dev --name <nombre>`|
| Aplicar migraciones       | `docker compose run --rm backend npx prisma migrate deploy`            |
| Estado de migraciones     | `docker compose run --rm backend npx prisma migrate status`              |
| Ejecutar seed             | `docker compose run --rm backend npx prisma db seed`                     |
| Regenerar Prisma Client   | `docker compose run --rm backend npx prisma generate`                   |

---

## Sin Docker (desarrollo local)

1. Instalar dependencias: `npm install`
2. Tener PostgreSQL corriendo y `DATABASE_URL` en `.env`
3. Aplicar migraciones: `npx prisma migrate deploy`
4. (Opcional) Seed: `npx prisma db seed`
5. Iniciar servidor: `npm start`

Para crear migraciones en local:

```bash
npx prisma migrate dev --name nombre_migracion
```
