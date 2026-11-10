import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { act } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { createFromReadableStream } from "react-server-dom-webpack/client.edge";
import "../src/index.js";
import { jsx } from "../src/react/jsx-runtime.js";
import { templates } from "../src/templates.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const built = existsSync(join(root, "dist/jsx-runtime.react-server.js"));

/**
 * @param {string} fixture
 * @param {unknown} input
 */
const runServer = (fixture, input) =>
  execFileSync(process.execPath, ["--conditions=react-server", join(root, "tests/fixtures", fixture), JSON.stringify(input)], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

const fiberKeyOf = (node) => Object.keys(node).find((key) => key.startsWith("__reactFiber$"));

let cleanups = [];
afterEach(() => {
  for (const cleanup of cleanups) cleanup();
  cleanups = [];
  vi.restoreAllMocks();
});

function mount() {
  const container = document.body.appendChild(document.createElement("div"));
  cleanups.push(() => container.remove());
  return container;
}

describe("JSX runtime in React Server Components", () => {
  const blocks = Object.fromEntries(
    Object.entries(templates).map(([tag, template]) => [tag, String(template({}, { id: (suffix) => suffix, children: [] }).props.class).split(" ")[0]]),
  );
  let found;
  beforeAll(() => {
    if (built) found = JSON.parse(runServer("flight-render.mjs", blocks));
  });

  it.runIf(built)("renders every light element through jsx and jsxDEV with no error", () => {
    const classes = Object.values(blocks);
    expect(classes).toContain("neuwo-btn");
    expect(found.jsx).toEqual(classes);
    expect(found.jsxDEV).toEqual(classes);
  });

  it.runIf(built)("renders a form control's value as its default, with no function, through the server runtime", () => {
    const expected = {
      input: { className: "x-field__input", name: "q", defaultValue: "a" },
      textarea: { className: "x-notes__input", defaultValue: "n" },
      functions: [],
    };
    expect(found.form).toEqual({ jsx: expected, jsxDEV: expected });
  });
});

describe("Server Component output reconciled in the browser", () => {
  it.runIf(built)("leaves React's markup alone when a refresh changes two attributes at once and swaps the slotted icon", async () => {
    const steps = [
      { props: { variant: "solid" }, icon: "plus" },
      { props: { variant: "outline", loading: true }, icon: "check" },
      { props: { variant: "solid" }, icon: "plus" },
      { props: { variant: "outline", href: "/x" }, icon: "check" },
      { props: { variant: "solid" }, icon: "plus" },
    ];
    const payloads = JSON.parse(runServer("flight-payloads.mjs", steps));
    const error = vi.spyOn(console, "error");
    const reported = [];
    const report = (thrown) => void reported.push(String(thrown?.message ?? thrown));
    const container = mount();
    const app = createRoot(container, { onUncaughtError: report, onCaughtError: report, onRecoverableError: report });
    cleanups.unshift(() => act(() => app.unmount()));
    let first = null;

    for (const [index, payload] of payloads.entries()) {
      const label = `step ${index}: ${JSON.stringify(steps[index])}`;
      const tree = await createFromReadableStream(new Response(payload).body, { serverConsumerManifest: { moduleMap: {}, moduleLoading: null } });
      await act(async () => app.render(tree));
      const host = container.querySelector("neuwo-button");
      first ??= host;
      expect(reported, label).toEqual([]);
      expect(host, label).toBe(first);
      expect([...host.querySelectorAll("*")].filter((el) => !fiberKeyOf(el)).map((el) => el.outerHTML), label).toEqual([]);
      expect(container.innerHTML, label).toBe(renderToStaticMarkup(tree));
      expect(host.querySelector(".neuwo-btn__start > svg").getAttribute("class"), label).toBe(`icon-${steps[index].icon}`);
    }
    expect(error).not.toHaveBeenCalled();
  });

  it("finds React DOM's __reactFiber$ property on a host it rendered or hydrated", async () => {
    const message = "React DOM no longer puts a __reactFiber$ property on its nodes; elements cannot recognise Server Component output";
    const rendered = mount();
    const app = createRoot(rendered);
    cleanups.unshift(() => act(() => app.unmount()));
    await act(async () => app.render(jsx("neuwo-button", { children: "Save" })));
    expect(fiberKeyOf(rendered.querySelector("neuwo-button")), message).toBeDefined();

    const badge = () => jsx("neuwo-badge", { children: "New" });
    const parsed = document.createElement("div");
    parsed.innerHTML = renderToString(badge());
    const hydrated = mount();
    hydrated.append(...parsed.childNodes);
    const host = hydrated.querySelector("neuwo-badge");
    const recoverable = [];
    let hydratedApp;
    await act(async () => {
      hydratedApp = hydrateRoot(hydrated, badge(), { onRecoverableError: (thrown) => void recoverable.push(String(thrown?.message ?? thrown)) });
    });
    cleanups.unshift(() => act(() => hydratedApp.unmount()));
    expect(recoverable).toEqual([]);
    expect(hydrated.querySelector("neuwo-badge")).toBe(host);
    expect(fiberKeyOf(host), message).toBeDefined();
  });
});
