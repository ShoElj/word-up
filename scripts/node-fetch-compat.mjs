// A minimal fetch-shaped wrapper around Node's core http/https modules.
//
// On at least one Windows machine used for this project, the global `fetch`
// (built on Node's `undici` HTTP client) silently hangs when talking to
// certain hosts — likely security software that only recognizes the older,
// more common TLS client fingerprint used by `node:https`/`node:http` and
// curl. Node's built-in http(s) request worked instantly against the same
// host where `fetch` timed out every time. Using this as the default
// `fetchImpl` avoids depending on which HTTP client a given machine happens
// to let through, without changing any of the calling code's fetch-shaped
// interface (`.ok`, `.status`, `.text()`, `.headers.get()`).

import http from 'node:http';
import https from 'node:https';

export function fetchViaNodeHttp(url, options = {}) {
  return new Promise((resolve, reject) => {
    const { method = 'GET', headers = {}, signal } = options;
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'http:' ? http : https;

    if (signal?.aborted) {
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      reject(error);
      return;
    }

    const request = client.request(parsedUrl, { method, headers }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const bodyText = Buffer.concat(chunks).toString('utf8');
        const status = response.statusCode ?? 0;
        resolve({
          ok: status >= 200 && status < 300,
          status,
          text: async () => bodyText,
          headers: {
            get: (name) => response.headers[String(name).toLowerCase()] ?? null,
          },
        });
      });
      response.on('error', reject);
    });

    request.on('error', reject);

    if (signal) {
      const onAbort = () => {
        request.destroy();
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        reject(error);
      };
      signal.addEventListener('abort', onAbort, { once: true });
    }

    request.end();
  });
}
