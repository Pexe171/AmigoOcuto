import { describe, before, after, beforeEach, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../../src/app';
import { resetRateLimiter } from '../../src/middlewares/rateLimiter';

let server: http.Server;
let baseUrl = '';

describe('API health check and rate limiting', () => {
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
    resetRateLimiter();
  });

  it('reports healthy status', async () => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.status, 'ok');
  });

  it('applies rate limiting after repeated requests', async () => {
    for (let i = 0; i < 3; i += 1) {
      const response = await fetch(`${baseUrl}/health`);
      assert.equal(response.status, 200);
    }
    const blocked = await fetch(`${baseUrl}/health`);
    assert.equal(blocked.status, 429);
  });
});
