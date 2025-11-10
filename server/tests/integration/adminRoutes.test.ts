import { describe, before, after, beforeEach, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import app from '../../src/app';
import { env } from '../../src/config/environment';
import { resetDatabase } from '../../src/config/sqliteDatabase';
import { resetRateLimiter } from '../../src/middlewares/rateLimiter';

let server: http.Server;
let baseUrl = '';
const auditFile = env.AUDIT_LOG_PATH;

const readAuditEntries = (): unknown[] => {
  if (!fs.existsSync(auditFile)) {
    return [];
  }
  return fs
    .readFileSync(auditFile, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
};

describe('Admin authentication flow', () => {
  before(async () => {
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://127.0.0.1:${address.port}`;
        }
        resolve();
      });
    });
  });

  after(() => {
    server.close();
  });

  beforeEach(() => {
    resetDatabase();
    if (fs.existsSync(auditFile)) {
      fs.unlinkSync(auditFile);
    }
    resetRateLimiter();
  });

  it('returns a token when credentials are valid and records audit trail', async () => {
    const response = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: env.ADMIN_EMAIL, password: 'super-secret' }),
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.ok(payload.token);

    const entries = readAuditEntries();
    const successEvent = entries.find((entry: any) => entry.outcome === 'success');
    assert.ok(successEvent);
    assert.equal((successEvent as any).email, env.ADMIN_EMAIL);
  });

  it('returns 401 for invalid credentials and records failure', async () => {
    const response = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: env.ADMIN_EMAIL, password: 'wrong-password' }),
    });

    assert.equal(response.status, 401);
    const entries = readAuditEntries();
    const failureEvent = entries.find((entry: any) => entry.outcome === 'failure');
    assert.ok(failureEvent);
    assert.equal((failureEvent as any).reason, 'invalid_credentials');
  });

  it('exposes Prometheus metrics', async () => {
    const response = await fetch(`${baseUrl}/metrics`);

    assert.equal(response.status, 200);
    const text = await response.text();
    assert.ok(text.includes('http_requests_total'));
    assert.ok(response.headers.get('content-type')?.includes('text/plain'));
  });
});
