import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
};

async function locate(root, pathname) {
  const file = resolve(root, `.${decodeURIComponent(pathname)}`);
  if (file !== root && !file.startsWith(root + sep)) return null;
  const info = await stat(file).catch(() => null);
  if (info?.isFile()) return file;
  const index = join(file, "index.html");
  if (info?.isDirectory() && (await stat(index).catch(() => null))?.isFile()) return index;
  return null;
}

function send(response, status, type, body) {
  response.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  response.end(body);
}

export async function serveStatic(root, options = {}) {
  const base = resolve(root);
  const server = createServer(async (request, response) => {
    try {
      const file = await locate(base, new URL(request.url, "http://localhost").pathname).catch(() => null);
      if (!file) return send(response, 404, "text/plain; charset=utf-8", "Not found");
      const type = extname(file);
      const body = await readFile(file);
      const delay = options.delay?.[new URL(request.url, "http://localhost").pathname];
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      if (type === ".html" && options.html) return send(response, 200, TYPES[type], options.html(body.toString("utf8")));
      send(response, 200, TYPES[type] ?? "application/octet-stream", body);
    } catch (error) {
      send(response, 500, "text/plain; charset=utf-8", String(error?.stack ?? error));
    }
  });
  await new Promise((done, fail) => server.once("error", fail).listen(0, "127.0.0.1", done));
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    stop: () =>
      new Promise((done) => {
        server.closeAllConnections();
        server.close(() => done());
      }),
  };
}
