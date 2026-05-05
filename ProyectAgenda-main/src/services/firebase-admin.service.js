const fs = require("fs");

let cachedMessaging = undefined;

function logFirebaseEvent(event, extra = {}) {
    console.info(JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        ...extra,
    }));
}

function readServiceAccountFromEnv() {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch (error) {
        logFirebaseEvent("FIREBASE_INIT_DISABLED", {
            reason: "invalid_service_account_json",
            error: error.message,
        });
        return null;
    }
}

function hasGoogleApplicationCredentials() {
    const path = (process.env.GOOGLE_APPLICATION_CREDENTIALS || "").trim();
    if (!path) return false;
    return fs.existsSync(path);
}

function initializeFirebaseMessaging() {
    let admin;
    try {
        // eslint-disable-next-line global-require
        admin = require("firebase-admin");
    } catch (error) {
        logFirebaseEvent("FIREBASE_INIT_DISABLED", {
            reason: "firebase_admin_dependency_missing",
            error: error.message,
        });
        return null;
    }

    if (admin.apps.length > 0) {
        return admin.messaging();
    }

    const serviceAccount = readServiceAccountFromEnv();
    const hasGoogleCredentials = hasGoogleApplicationCredentials();

    if (!serviceAccount && !hasGoogleCredentials) {
        logFirebaseEvent("FIREBASE_INIT_DISABLED", {
            reason: "missing_credentials",
            required: ["GOOGLE_APPLICATION_CREDENTIALS", "FIREBASE_SERVICE_ACCOUNT_JSON"],
        });
        return null;
    }

    try {
        if (serviceAccount) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            logFirebaseEvent("FIREBASE_INIT_SUCCESS", {
                credentialSource: "FIREBASE_SERVICE_ACCOUNT_JSON",
            });
        } else {
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
            });
            logFirebaseEvent("FIREBASE_INIT_SUCCESS", {
                credentialSource: "GOOGLE_APPLICATION_CREDENTIALS",
            });
        }

        return admin.messaging();
    } catch (error) {
        logFirebaseEvent("FIREBASE_INIT_DISABLED", {
            reason: "firebase_initialize_failed",
            error: error.message,
        });
        return null;
    }
}

function getFirebaseMessaging() {
    if (cachedMessaging !== undefined) {
        return cachedMessaging;
    }

    cachedMessaging = initializeFirebaseMessaging();
    return cachedMessaging;
}

module.exports = {
    getFirebaseMessaging,
};
