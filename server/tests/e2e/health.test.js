"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const node_http_1 = __importDefault(require("node:http"));
const app_1 = __importDefault(require("../../src/app"));
const rateLimiter_1 = require("../../src/middlewares/rateLimiter");
let server;
let baseUrl = '';
(0, node_test_1.describe)('API health check and rate limiting', () => {
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
        (0, rateLimiter_1.resetRateLimiter)();
    });
    (0, node_test_1.it)('reports healthy status', async () => {
        const response = await fetch(`${baseUrl}/health`);
        strict_1.default.equal(response.status, 200);
        const body = await response.json();
        strict_1.default.equal(body.status, 'ok');
    });
    (0, node_test_1.it)('applies rate limiting after repeated requests', async () => {
        for (let i = 0; i < 3; i += 1) {
            const response = await fetch(`${baseUrl}/health`);
            strict_1.default.equal(response.status, 200);
        }
        const blocked = await fetch(`${baseUrl}/health`);
        strict_1.default.equal(blocked.status, 429);
    });
});
//# sourceMappingURL=health.test.js.map