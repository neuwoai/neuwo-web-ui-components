import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createServer as createSocketServer } from "node:net";
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

const READY_TIMEOUT = 120_000;
const RUN_TIMEOUT = 300_000;
const STOP_TIMEOUT = 10_000;
const POLL = 50;
const OUTPUT_LIMIT = 4000;
const PROBE_HOST = "neuwo.invalid";
const commands = new Set();
let closing = null;

export class Finishing extends Error {
  constructor() {
    super("the run is finishing, so no command starts and any still running is stopped");
  }
}

async function listen(server) {
  await new Promise((done, fail) => server.once("error", fail).listen(0, "127.0.0.1", done));
  return server.address().port;
}

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
  const port = await listen(server);
  return {
    url: `http://127.0.0.1:${port}`,
    stop: () =>
      new Promise((done) => {
        server.closeAllConnections();
        server.close(() => done());
      }),
  };
}

export async function blockNetwork() {
  const attempts = [];
  const sockets = new Set();
  const proxy = createSocketServer((socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
    socket.on("error", () => {});
    socket.once("data", (data) => {
      attempts.push(data.toString("latin1").split("\r\n", 1)[0]);
      socket.destroy();
    });
  });
  const url = `http://127.0.0.1:${await listen(proxy)}`;
  const local = "127.0.0.1,localhost,::1";
  const env = { NODE_USE_ENV_PROXY: "1", HTTP_PROXY: url, HTTPS_PROXY: url, NO_PROXY: local, http_proxy: url, https_proxy: url, no_proxy: local };
  const close = () =>
    new Promise((done) => {
      for (const socket of sockets) socket.destroy();
      proxy.close(() => done());
    });
  try {
    await runCommand(process.execPath, ["-e", `fetch("http://${PROBE_HOST}/").catch(() => {})`], { env, timeout: STOP_TIMEOUT });
  } catch (error) {
    await close();
    throw error;
  }
  const reached = attempts.findIndex((line) => line.includes(PROBE_HOST));
  if (reached === -1) {
    await close();
    throw new Error(`the network guard is not in force: a child's fetch of ${PROBE_HOST} never reached its proxy, so this Node ignores NODE_USE_ENV_PROXY`);
  }
  attempts.splice(reached, 1);
  return { env, attempts, close };
}

function launch(command, args, { cwd, env = {} }) {
  if (closing) throw new Finishing();
  const child = spawn(command, args, { cwd, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"], detached: true });
  const exited = new Promise((done) => {
    child.once("exit", (code, signal) => done(signal ?? code));
    child.once("error", (error) => done(error));
  });
  const signal = (name) => {
    try {
      process.kill(-child.pid, name);
      return true;
    } catch {
      return false;
    }
  };
  let stopping = null;
  const stop = () => {
    stopping ??= (async () => {
      if (child.pid !== undefined) {
        signal("SIGTERM");
        for (let waited = 0; signal(0) && waited < 2 * STOP_TIMEOUT; waited += POLL) {
          if (waited === STOP_TIMEOUT) signal("SIGKILL");
          await new Promise((resolve) => setTimeout(resolve, POLL));
        }
      }
      commands.delete(stop);
    })();
    return stopping;
  };
  commands.add(stop);
  return { child, exited, stop };
}

export function closeCommands() {
  closing ??= Promise.allSettled([...commands].map((stop) => stop()));
  return closing;
}

export async function runCommand(command, args, { cwd, env, timeout = RUN_TIMEOUT } = {}) {
  const { child, exited, stop } = launch(command, args, { cwd, env });
  let output = "";
  const read = (chunk) => {
    output = (output + chunk).slice(-OUTPUT_LIMIT);
  };
  child.stdout.setEncoding("utf8").on("data", read);
  child.stderr.setEncoding("utf8").on("data", read);
  let late = false;
  const timer = setTimeout(() => {
    late = true;
    stop();
  }, timeout);
  const status = await exited;
  clearTimeout(timer);
  await stop();
  if (status === 0) return output;
  if (closing) throw new Finishing();
  if (status instanceof Error) throw status;
  const outcome = late ? `took longer than ${timeout / 1000} s` : typeof status === "string" ? `stopped on ${status}` : `exited with ${status}`;
  throw new Error(`${[command, ...args].join(" ")} ${outcome}: ${output}`);
}

export async function serveCommand(command, args, { cwd, env = {}, ready }) {
  const probe = createSocketServer();
  const port = await listen(probe);
  await new Promise((done) => probe.close(() => done()));
  const { child, exited, stop } = launch(command, args(port), { cwd, env });
  let output = "";
  let timer;
  try {
    await new Promise((done, fail) => {
      timer = setTimeout(() => fail(new Error(`no ready line within ${READY_TIMEOUT / 1000} s: ${output.slice(-2000)}`)), READY_TIMEOUT);
      const read = (chunk) => {
        if (output === null) return;
        output += chunk;
        if (!ready.test(output)) return;
        output = null;
        done();
      };
      child.stdout.setEncoding("utf8").on("data", read);
      child.stderr.setEncoding("utf8").on("data", read);
      exited.then((status) => fail(status instanceof Error ? status : new Error(`exited with ${status} before it was ready: ${output?.slice(-2000)}`)));
    });
  } catch (error) {
    await stop();
    throw closing ? new Finishing() : error;
  } finally {
    clearTimeout(timer);
  }
  return { url: `http://127.0.0.1:${port}`, stop };
}
