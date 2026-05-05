const http = require("http");

const BASE = process.env.API_URL || "http://localhost:3001";
const API = `${BASE}/api/v1`;

let passed = 0;
let failed = 0;
let token = "";
let testUserEmail = "";

function log(kind, msg) {
    const color = kind === "PASS" ? "\x1b[32m" : "\x1b[31m";
    const reset = "\x1b[0m";
    console.log(`${color}[${kind}]${reset} ${msg}`);
}

async function request(method, path, body) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, API);
        const options = {
            method,
            hostname: url.hostname,
            port: url.port || 3001,
            path: url.pathname + url.search,
            headers: { "Content-Type": "application/json" },
        };

        if (token) options.headers.Authorization = `Bearer ${token}`;

        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });
        req.on("error", reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

function assert(condition, msg) {
    if (condition) {
        passed++;
        log("PASS", msg);
    } else {
        failed++;
        log("FAIL", msg);
    }
}

async function testRegister() {
    const ts = Date.now();
    testUserEmail = `test_${ts}@carivent.test`;
    const name = `Test User ${ts}`;

    const res = await request("POST", "/auth/register", {
        name,
        email: testUserEmail,
        password: "testpassword123",
    });

    assert(res.status === 201 || res.status === 200, `Register status: ${res.status}`);
    assert(res.body?.success === true, "Register response has success=true");
    assert(res.body?.data?.id, "Register returns user id");
    assert(res.body?.data?.email === testUserEmail, "Register returns correct email");
    assert(res.body?.data?.emailVerified === false, "New user emailVerified=false");
}

async function testLogin() {
    const res = await request("POST", "/auth/login", {
        email: testUserEmail,
        password: "testpassword123",
    });

    assert(res.status === 200, `Login status: ${res.status}`);
    assert(res.body?.success === true, "Login response has success=true");
    assert(res.body?.data?.token, "Login returns token");
    assert(res.body?.data?.user?.email === testUserEmail, "Login returns correct user email");
    assert(Array.isArray(res.body?.data?.user?.permissions), "Login returns permissions array");
    assert(res.body?.data?.user?.role, "Login returns user role");

    token = res.body.data.token;
}

async function testLoginWrongPassword() {
    const prevToken = token;
    token = "";

    const res = await request("POST", "/auth/login", {
        email: testUserEmail,
        password: "wrongpassword",
    });

    assert(res.status === 400, `Wrong password status: ${res.status}`);
    assert(res.body?.success === false, "Wrong password returns success=false");

    token = prevToken;
}

async function testLoginNonExistentUser() {
    const prevToken = token;
    token = "";

    const res = await request("POST", "/auth/login", {
        email: "nonexistent@test.com",
        password: "anypassword",
    });

    assert(res.status === 400, `Non-existent user status: ${res.status}`);
    assert(res.body?.success === false, "Non-existent user returns success=false");

    token = prevToken;
}

async function testProtectedEndpointWithToken() {
    const res = await request("GET", "/public/events");
    assert(res.status === 200, `Public endpoint status: ${res.status}`);
    assert(res.body?.success === true, "Public endpoint returns success=true");
}

async function testProtectedEndpointWithoutAuth() {
    const prevToken = token;
    token = "";

    const res = await request("POST", "/auth/logout", { token: "fake-token" });
    assert(res.status === 401, `Unprotected without auth status: ${res.status}`);

    token = prevToken;
}

async function testRefreshToken() {
    const currentToken = token;

    const res = await request("POST", "/auth/refresh");
    assert(res.status === 200, `Refresh status: ${res.status}`);
    assert(res.body?.success === true, "Refresh returns success=true");
    assert(res.body?.data?.token, "Refresh returns new token");
    assert(res.body?.data?.token !== currentToken, "Refresh returns a different token");

    token = res.body.data.token;
}

async function testLogout() {
    const currentToken = token;
    const res = await request("POST", "/auth/logout", { token: currentToken });

    assert(res.status === 200, `Logout status: ${res.status}`);
    assert(res.body?.success === true, "Logout returns success=true");

    token = "";

    const loginRes = await request("POST", "/auth/login", {
        email: testUserEmail,
        password: "testpassword123",
    });
    token = loginRes.body?.data?.token || "";
    assert(!!token, "Can re-login after logout");
}

async function testRegisterValidationErrors() {
    const res = await request("POST", "/auth/register", {
        name: "ab",
        email: "bad-email",
        password: "123",
    });

    assert(res.status === 400, `Validation errors status: ${res.status}`);
    assert(res.body?.success === false, "Validation errors return success=false");
}

async function testLoginValidationErrors() {
    const res = await request("POST", "/auth/login", {
        email: "",
    });

    assert(res.status === 400, `Login validation status: ${res.status}`);
    assert(res.body?.success === false, "Login validation returns success=false");
}

async function run() {
    console.log("\n\x1b[1m=== Auth Integration Tests ===\x1b[0m\n");

    try {
        await testRegister();
        await testLogin();
        await testLoginWrongPassword();
        await testLoginNonExistentUser();
        await testProtectedEndpointWithToken();
        await testProtectedEndpointWithoutAuth();
        await testRefreshToken();
        await testLogout();
        await testRegisterValidationErrors();
        await testLoginValidationErrors();
    } catch (error) {
        log("FAIL", `Unexpected error: ${error.message}`);
        console.error(error);
    }

    console.log(`\n\x1b[1mResults: ${passed} passed, ${failed} failed\x1b[0m\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

run();
