import assert from 'node:assert/strict';
import http from 'node:http';
import { test } from 'node:test';

import { fetchViaNodeHttp } from '../scripts/node-fetch-compat.mjs';

async function withTestServer(handler, run) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('fetchViaNodeHttp returns a fetch-shaped success response', async () => {
  await withTestServer(
    (req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ hello: 'world' }));
    },
    async (baseUrl) => {
      const response = await fetchViaNodeHttp(`${baseUrl}/entries/en/hello`);
      assert.equal(response.ok, true);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-type'), 'application/json');
      assert.equal(response.headers.get('Content-Type'), 'application/json');
      const body = await response.text();
      assert.deepEqual(JSON.parse(body), { hello: 'world' });
    }
  );
});

test('fetchViaNodeHttp reports ok: false for a 404 without throwing', async () => {
  await withTestServer(
    (req, res) => {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ title: 'No Definitions Found' }));
    },
    async (baseUrl) => {
      const response = await fetchViaNodeHttp(`${baseUrl}/entries/en/zzzznotaword`);
      assert.equal(response.ok, false);
      assert.equal(response.status, 404);
    }
  );
});

test('fetchViaNodeHttp sends custom headers and the requested method', async () => {
  await withTestServer(
    (req, res) => {
      assert.equal(req.method, 'GET');
      assert.equal(req.headers.app_id, 'test-app-id');
      res.writeHead(200);
      res.end('{}');
    },
    async (baseUrl) => {
      const response = await fetchViaNodeHttp(`${baseUrl}/entries/en-us/concise`, {
        method: 'GET',
        headers: { app_id: 'test-app-id' },
      });
      assert.equal(response.ok, true);
    }
  );
});

test('fetchViaNodeHttp supports HEAD requests for audio accessibility checks', async () => {
  await withTestServer(
    (req, res) => {
      assert.equal(req.method, 'HEAD');
      res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': '12345' });
      res.end();
    },
    async (baseUrl) => {
      const response = await fetchViaNodeHttp(`${baseUrl}/audio.mp3`, { method: 'HEAD' });
      assert.equal(response.ok, true);
      assert.equal(response.headers.get('content-type'), 'audio/mpeg');
      assert.equal(response.headers.get('content-length'), '12345');
    }
  );
});

test('fetchViaNodeHttp rejects with an AbortError when the signal aborts mid-request', async () => {
  await withTestServer(
    (req, res) => {
      // Never respond — let the client abort while the request is in flight.
      req.on('close', () => {});
    },
    async (baseUrl) => {
      const controller = new AbortController();
      const pending = fetchViaNodeHttp(`${baseUrl}/slow`, { signal: controller.signal });
      controller.abort();

      await assert.rejects(pending, (error) => {
        assert.equal(error.name, 'AbortError');
        return true;
      });
    }
  );
});

test('fetchViaNodeHttp rejects immediately when the signal is already aborted', async () => {
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    fetchViaNodeHttp('http://127.0.0.1:1/never-connects', { signal: controller.signal }),
    (error) => {
      assert.equal(error.name, 'AbortError');
      return true;
    }
  );
});

test('fetchViaNodeHttp rejects on connection failure without hanging', async () => {
  // Port 1 is a reserved/unlikely-to-be-listening port — connection should be refused quickly.
  await assert.rejects(fetchViaNodeHttp('http://127.0.0.1:1/unreachable'));
});
