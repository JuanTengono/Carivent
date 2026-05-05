require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { patchDatabaseUrlForHostExecution } = require("./lib/database-url");
patchDatabaseUrlForHostExecution();

const { PrismaClient } = require("@prisma/client");
const { issueUserAuthToken } = require("../src/services/auth-token.service");

const prisma = new PrismaClient();
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const EMAIL_LOG_PATH = path.resolve(process.cwd(), process.env.EMAIL_LOG_PATH || "logs/email.log");

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

async function waitFor(predicate, { timeoutMs = 8000, intervalMs = 250 } = {}) {
    const startedAt = Date.now();
    while (Date.now() - startedAt <= timeoutMs) {
        if (await predicate()) return true;
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return false;
}

async function callApi(pathname, { method = "GET", token, body } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${BASE_URL}${pathname}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    let payload = null;
    try {
        payload = await response.json();
    } catch (error) {
        payload = null;
    }

    return { response, payload };
}

async function main() {
    console.log("Auth email flows regression...");
    console.log(`BASE_URL: ${BASE_URL}`);

    const unique = `${Date.now()}`;
    const userEmail = `verify.reset.${unique}@mail.com`;
    const initialPassword = "12345678";
    const newPassword = "87654321";
    const logSizeBefore = fs.existsSync(EMAIL_LOG_PATH) ? fs.statSync(EMAIL_LOG_PATH).size : 0;

    const registerRes = await callApi("/api/v1/auth/register", {
        method: "POST",
        body: {
            name: `User Verify ${unique}`,
            email: userEmail,
            password: initialPassword,
        },
    });
    assert(registerRes.response.status === 200, "Register fallo en test de auth email");

    const createdUser = await prisma.user.findFirst({
        where: { email: userEmail, deletedAt: null },
        include: { role: true },
    });
    assert(createdUser, "No se encontro el usuario creado");
    assert(createdUser.role?.name === "user", "El usuario nuevo no tiene rol user");
    assert(createdUser.emailVerified === false, "El usuario nuevo debe iniciar con emailVerified=false");

    const requestVerifyRes = await callApi("/api/v1/auth/request-email-verification", {
        method: "POST",
        body: { email: userEmail },
    });
    assert(requestVerifyRes.response.status === 200, "request-email-verification fallo");

    const requestVerifyUnknownRes = await callApi("/api/v1/auth/request-email-verification", {
        method: "POST",
        body: { email: `unknown.${unique}@mail.com` },
    });
    assert(requestVerifyUnknownRes.response.status === 200, "request-email-verification debe ser generico");

    const verificationToken = await issueUserAuthToken({
        userId: createdUser.id,
        type: "EMAIL_VERIFICATION",
    });

    const verifyRes = await callApi("/api/v1/auth/verify-email", {
        method: "POST",
        body: { token: verificationToken.token },
    });
    assert(verifyRes.response.status === 200, "verify-email fallo");

    const verifiedUser = await prisma.user.findFirst({
        where: { id: createdUser.id, deletedAt: null },
    });
    assert(verifiedUser?.emailVerified === true, "El correo no quedo verificado");
    assert(verifiedUser?.emailVerifiedAt, "No se guardo emailVerifiedAt");

    const requestResetRes = await callApi("/api/v1/auth/request-password-reset", {
        method: "POST",
        body: { email: userEmail },
    });
    assert(requestResetRes.response.status === 200, "request-password-reset fallo");

    const verifyDeepLinkLogged = await waitFor(async () => {
        if (!fs.existsSync(EMAIL_LOG_PATH)) return false;
        const chunk = fs.readFileSync(EMAIL_LOG_PATH, "utf8").slice(logSizeBefore);
        return (
            chunk.includes(`\"to\":\"${userEmail}\"`) &&
            chunk.includes("\"type\":\"EMAIL_VERIFICATION\"") &&
            chunk.includes("\"actionUrl\":\"electiva://auth/verify-email?token=")
        );
    });
    assert(verifyDeepLinkLogged, "No se detecto deep link de verificacion en logs de email");

    const resetDeepLinkLogged = await waitFor(async () => {
        if (!fs.existsSync(EMAIL_LOG_PATH)) return false;
        const chunk = fs.readFileSync(EMAIL_LOG_PATH, "utf8").slice(logSizeBefore);
        return (
            chunk.includes(`\"to\":\"${userEmail}\"`) &&
            chunk.includes("\"type\":\"PASSWORD_RESET\"") &&
            chunk.includes("\"actionUrl\":\"electiva://auth/reset-password?token=")
        );
    });
    assert(resetDeepLinkLogged, "No se detecto deep link de reset en logs de email");

    const requestResetUnknownRes = await callApi("/api/v1/auth/request-password-reset", {
        method: "POST",
        body: { email: `unknown.reset.${unique}@mail.com` },
    });
    assert(requestResetUnknownRes.response.status === 200, "request-password-reset debe ser generico");

    const resetToken = await issueUserAuthToken({
        userId: createdUser.id,
        type: "PASSWORD_RESET",
    });

    const resetRes = await callApi("/api/v1/auth/reset-password", {
        method: "POST",
        body: {
            token: resetToken.token,
            newPassword,
        },
    });
    assert(resetRes.response.status === 200, "reset-password fallo");

    const loginOldPassRes = await callApi("/api/v1/auth/login", {
        method: "POST",
        body: {
            email: userEmail,
            password: initialPassword,
        },
    });
    assert(loginOldPassRes.response.status !== 200, "La contrasena vieja no deberia funcionar");

    const loginNewPassRes = await callApi("/api/v1/auth/login", {
        method: "POST",
        body: {
            email: userEmail,
            password: newPassword,
        },
    });
    assert(loginNewPassRes.response.status === 200, "No se pudo iniciar sesion con la nueva contrasena");
    assert(
        loginNewPassRes.payload?.data?.user?.emailVerified === true,
        "login debe reportar emailVerified=true tras verificar correo"
    );

    console.log("OK: auth email flows completed");
}

main()
    .catch((error) => {
        console.error("Fallo en test:auth:email");
        console.error(error.message || error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
