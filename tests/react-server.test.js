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
import { jsxDEV } from "../src/react/jsx-dev-runtime.js";
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

  it.runIf(built)("renders <neuwo-input value> through the built runtime as an uncontrolled control with no function", () => {
    const expected = {
      control: { className: "neuwo-input", type: "text", id: expect.stringMatching(/-control$/), name: "n", defaultValue: "a" },
      functions: [],
    };
    expect(found.input).toEqual({ jsx: expected, jsxDEV: expected });
  });

  it.runIf(built)("renders <neuwo-combobox value> through the built runtime with the value as its default and no function", () => {
    for (const name of ["jsx", "jsxDEV"]) {
      const rendered = found.combobox[name];
      expect(rendered.hostValue, name).toBeUndefined();
      expect(rendered.formValue, name).toMatchObject({ className: "neuwo-combobox__form-value", name: "country", defaultValue: "fr" });
      expect(rendered.formValue, name).not.toHaveProperty("value");
      expect(rendered.shown, name).toBe("France");
      expect(rendered.functions, name).toEqual([]);
    }
  });

  it.runIf(built)("keeps a <neuwo-combobox> pick when the server sends a new placeholder", async () => {
    const decode = (payload) => createFromReadableStream(new Response(payload).body, { serverConsumerManifest: { moduleMap: {}, moduleLoading: null } });
    const [first, second] = await Promise.all(found.combobox.payloads.map(decode));
    const error = vi.spyOn(console, "error");
    const container = mount();
    const app = createRoot(container);
    cleanups.unshift(() => act(() => app.unmount()));
    // Synchronous act() and microtasks only: happy-dom holds an observer's callback in a WeakRef, which a GC between tasks drops.
    act(() => app.render(first));
    const host = container.querySelector("neuwo-combobox");
    const shown = () => host.querySelector(".neuwo-combobox__value").textContent;
    expect(shown()).toBe("Pick");
    act(() => host.querySelector('.neuwo-combobox__option[data-value="fr"]').click());
    expect(host.value).toBe("fr");
    act(() => app.render(second));
    for (let turn = 0; turn < 3; turn++) await Promise.resolve();
    expect(container.querySelector("neuwo-combobox")).toBe(host);
    expect(host.value).toBe("fr");
    expect(shown()).toBe("France");
    expect(host.querySelector(".neuwo-combobox__trigger").hasAttribute("data-placeholder")).toBe(false);
    expect(error).not.toHaveBeenCalled();
  });

  it.runIf(built)("renders a form control's value as its default, with no function, through the server runtime", () => {
    const expected = {
      input: { className: "x-field__input", name: "q", defaultValue: "a" },
      textarea: { className: "x-notes__input", defaultValue: "n" },
      functions: [],
    };
    expect(found.form).toEqual({ jsx: expected, jsxDEV: expected });
  });

  it.runIf(built)("gives an item its group's attributes through the server runtime, with no element given the internal prop and no function", () => {
    const expected = { shown: ["size=m", "size=m", "none"], values: ["m", "m", null], leaked: false, functions: [] };
    expect(found.within).toEqual({ jsx: expected, jsxDEV: expected });
  });

  it.runIf(built)("renders a radio group's radios with its name and value as their default, in other markup too, with no function", () => {
    const input = (extra) => ({ className: "neuwo-form-check__input", type: "radio", ...extra });
    const expected = {
      inputs: [
        input({ name: "plan", value: "free" }),
        input({ name: "plan", value: "pro", defaultChecked: true }),
        input({ name: "solo", value: "x", defaultChecked: true }),
      ],
      hostValue: null,
      leaked: false,
      functions: [],
    };
    expect(found.radio).toEqual({ jsx: expected, jsxDEV: expected });
  });

  it.runIf(built)("warns once in development when a client radio group meets radios a Server Component rendered outside it", async () => {
    const decode = (payload) => createFromReadableStream(new Response(payload).body, { serverConsumerManifest: { moduleMap: {}, moduleLoading: null } });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error");
    for (const [runtime, create] of [
      ["production", jsx],
      ["development", (type, props) => jsxDEV(type, props, undefined, false)],
    ]) {
      for (const [name, payload] of Object.entries(found.expanded)) {
        const radios = await decode(payload);
        const container = mount();
        const app = createRoot(container);
        cleanups.unshift(() => act(() => app.unmount()));
        await act(async () => app.render(create("neuwo-radio-group", { name: "plan", defaultValue: "pro", children: radios })));
        const inputs = Array.from(container.querySelectorAll("neuwo-radio input"), (input) => [input.value, input.name, input.checked]);
        expect(inputs, `${runtime} group, ${name} radios`).toEqual([
          ["free", "", false],
          ["pro", "", false],
        ]);
      }
      if (runtime === "production") expect(warn).not.toHaveBeenCalled();
    }
    expect(warn).toHaveBeenCalledTimes(1);
    const [message] = warn.mock.calls[0];
    expect(message).toContain("<neuwo-radio>");
    expect(message).toContain("<neuwo-radio-group>");
    expect(message).toMatch(/Server Component/);
    expect(message).toMatch(/same component/);
    expect(error).not.toHaveBeenCalled();
  });

  it.runIf(built)("renders <neuwo-segmented value> with its option checked and the value as the form value's default, with no function", () => {
    const expected = {
      hostValue: null,
      formValue: expect.objectContaining({ className: "neuwo-segmented__form-value", name: "view", defaultValue: "json" }),
      options: [
        ["visual", "false", "-1"],
        ["json", "true", "0"],
      ],
      indicator: { className: "neuwo-segmented__indicator", "aria-hidden": "true" },
      functions: [],
    };
    expect(found.segmented).toEqual({ jsx: expected, jsxDEV: expected });
    expect(found.segmented.jsx.formValue).not.toHaveProperty("value");
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
