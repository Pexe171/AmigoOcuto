"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_http_1 = __importDefault(require("node:http"));
const app_1 = __importDefault(require("../../src/app"));
const environment_1 = require("../../src/config/environment");
const sqliteDatabase_1 = require("../../src/config/sqliteDatabase");
const rateLimiter_1 = require("../../src/middlewares/rateLimiter");
let server;
let baseUrl = '';
const auditFile = environment_1.env.AUDIT_LOG_PATH;
const readAuditEntries = () => {
    if (!node_fs_1.default.existsSync(auditFile)) {
        return [];
    }
    return node_fs_1.default
        .readFileSync(auditFile, 'utf-8')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line));
};
(0, node_test_1.describe)('Admin authentication flow', () => {
    (0, node_test_1.before)(async () => {
        server = node_http_1.default.createServer(app_1.default);
        await new Promise((resolve) => {
            server.listen(0, () => {
                const address = server.address();
                if (address && typeof address === 'object') {
                    baseUrl = `http://127.0.0.1:${address.port}`;
                }
                resolve();
            });
        });
    });
    (0, node_test_1.after)(() => {
        server.close();
    });
    (0, node_test_1.beforeEach)(() => {
        (0, sqliteDatabase_1.resetDatabase)();
        if (node_fs_1.default.existsSync(auditFile)) {
            node_fs_1.default.unlinkSync(auditFile);
        }
        (0, rateLimiter_1.resetRateLimiter)();
    });
    (0, node_test_1.it)('returns a token when credentials are valid and records audit trail', async () => {
        const response = await fetch(`${baseUrl}/api/admin/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: environment_1.env.ADMIN_EMAIL, password: 'super-secret' }),
        });
        strict_1.default.equal(response.status, 200);
        const payload = await response.json();
        strict_1.default.ok(payload.token);
        const entries = readAuditEntries();
        const successEvent = entries.find((entry) => entry.outcome === 'success');
        strict_1.default.ok(successEvent);
        strict_1.default.equal(successEvent.email, environment_1.env.ADMIN_EMAIL);
    });
    (0, node_test_1.it)('returns 401 for invalid credentials and records failure', async () => {
        const response = await fetch(`${baseUrl}/api/admin/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: environment_1.env.ADMIN_EMAIL, password: 'wrong-password' }),
        });
        strict_1.default.equal(response.status, 401);
        const entries = readAuditEntries();
        const failureEvent = entries.find((entry) => entry.outcome === 'failure');
        strict_1.default.ok(failureEvent);
        strict_1.default.equal(failureEvent.reason, 'invalid_credentials');
    });
    (0, node_test_1.it)('exposes Prometheus metrics', async () => {
        const response = await fetch(`${baseUrl}/metrics`);
        strict_1.default.equal(response.status, 200);
        const text = await response.text();
        strict_1.default.ok(text.includes('http_requests_total'));
        strict_1.default.ok(response.headers.get('content-type')?.includes('text/plain'));
    });
});
//# sourceMappingURL=adminRoutes.test.js.map