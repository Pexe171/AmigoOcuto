"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT ?? '0';
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.ADMIN_PASSWORD = 'super-secret';
process.env.ADMIN_JWT_SECRET = 'integration-secret-key-1234';
process.env.ADMIN_SESSION_MINUTES = '30';
process.env.MAILER_MODE = 'console';
process.env.SECRET_ROTATION_INTERVAL_MS = '0';
process.env.RATE_LIMIT_WINDOW_MINUTES = '1';
process.env.RATE_LIMIT_MAX_REQUESTS = '3';
process.env.AUDIT_LOG_PATH = `${process.cwd()}/data/test-auth-audit.log`;
process.env.ENABLE_HTTP_METRICS = 'true';
process.env.SQLITE_IN_MEMORY = 'true';
//# sourceMappingURL=setupEnv.js.map