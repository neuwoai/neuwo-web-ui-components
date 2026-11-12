import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { distFile } from "./setup/dist.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const importsOf = (file) =>
  [...readFileSync(distFile(file), "utf8").matchAll(/(?:\bfrom|\bimport)\s*"([^"]+)"/g)].map((match) => match[1]).sort();

describe("built JSX runtimes", () => {
  for (const [file, own] of [
    ["jsx-runtime.js", "react/jsx-runtime"],
    ["jsx-runtime.react-server.js", "react/jsx-runtime"],
    ["jsx-dev-runtime.js", "react/jsx-dev-runtime"],
    ["jsx-dev-runtime.react-server.js", "react/jsx-dev-runtime"],
  ]) {
    it(`imports only its own React runtime: ${file}`, () => {
      expect([...new Set(importsOf(file))]).toEqual(["react", own].sort());
    });
  }
});

const run = (file, env, conditions, source) =>
  execFileSync(process.execPath, [...conditions, "--input-type=module", "-e", source(file)], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: env },
    stdio: ["ignore", "pipe", "pipe"],
  });

const probe = (file) => `
import { Writable } from "node:stream";
const runtime = await import(${JSON.stringify(distFile(file))});
const create = runtime.jsx ?? ((type, props, key) => runtime.jsxDEV(type, props, key, false));
const page = () => create("main", { children: [create("div", { children: "Hi" }), create("neuwo-button", { children: "Go" })] });
if (process.execArgv.includes("--conditions=react-server")) {
  const { renderToPipeableStream } = await import("react-server-dom-webpack/server");
  const errors = [];
  let payload = "";
  await new Promise((resolve) => {
    const sink = new Writable({ write(chunk, _encoding, done) { payload += chunk; done(); } });
    sink.on("finish", resolve);
    renderToPipeableStream(create(page, {}), {}, { onError: (error) => errors.push(String(error.message)) }).pipe(sink);
  });
  console.log(errors.length ? errors.join() : payload.includes("neuwo-button") ? "ok" : "no output");
} else {
  const { renderToStaticMarkup } = await import("react-dom/server");
  console.log(renderToStaticMarkup(create(page, {})).includes("<neuwo-button") ? "ok" : "no output");
}
`;

describe("built JSX runtimes in use", () => {
  for (const [file, envs, conditions] of [
    ["jsx-runtime.js", ["production", "development"], []],
    ["jsx-dev-runtime.js", ["development"], []],
    ["jsx-runtime.react-server.js", ["production", "development"], ["--conditions=react-server"]],
    ["jsx-dev-runtime.react-server.js", ["development"], ["--conditions=react-server"]],
  ]) {
    for (const env of envs) {
      it(`creates a plain and a Neuwo element: ${file} under ${env}`, () => {
        expect(run(file, env, conditions, probe).trim()).toBe("ok");
      });
    }
  }
});
