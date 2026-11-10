import { afterEach, describe, expect, it, vi } from "vitest";
import { flushSync } from "react-dom";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import "../src/index.js";
import { NeuwoCta } from "../src/components/cta/neuwo-cta.js";
import { ctaTemplate } from "../src/components/cta/cta.template.js";
import { renderElement } from "../src/core/adapters/html.js";
import { idScope } from "../src/core/ids.js";
import { jsx, jsxs } from "../src/react/jsx-runtime.js";
import { normalise } from "./fixtures/template-cases.js";

const cleanup = [];

afterEach(() => {
  while (cleanup.length) cleanup.pop()();
  vi.restoreAllMocks();
});

function attach(node) {
  document.body.appendChild(node);
  cleanup.push(() => node.remove());
  return node;
}

// Parsed detached, then attached: innerHTML on a connected container upgrades before the children exist.
function make(html) {
  const holder = document.createElement("div");
  holder.innerHTML = html;
  return attach(holder).firstElementChild;
}

// Microtasks only: happy-dom holds an observer's callback in a WeakRef, so a GC between tasks can silence it.
async function settled() {
  for (let turn = 0; turn < 3; turn++) await Promise.resolve();
}

function watch(target) {
  const records = [];
  const observer = new MutationObserver((list) => records.push(...list));
  observer.observe(target, { subtree: true, childList: true, attributes: true, characterData: true });
  return () => {
    records.push(...observer.takeRecords());
    observer.disconnect();
    return records;
  };
}

const quiet = () => vi.spyOn(console, "warn").mockImplementation(() => {});

// A complete CTA (headline and button) so the content guard stays quiet.
const FULL = (attrs = "") =>
  `<neuwo-cta ${attrs}>Ready to <span data-accent>go</span>?` +
  `<span slot="sub">Sub line.</span>` +
  `<neuwo-button slot="actions" variant="solid">Get Started</neuwo-button></neuwo-cta>`;

const card = (el) => el.querySelector(":scope > .neuwo-cta");
const part = (el, name) => card(el).querySelector(`.neuwo-cta__${name}`);
const isEmpty = (el) => part(el, "field").classList.contains("neuwo-cta__field--empty");
const serverChild = (tag, slot, text, html) => ({ tag, attrs: tag && slot !== "default" ? { slot } : {}, text, slot, html });
const same = (actual, expected) => {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((node, index) => expect(node).toBe(expected[index]));
};

describe("<neuwo-cta>", () => {
  it("registers the element", () => {
    expect(customElements.get("neuwo-cta")).toBe(NeuwoCta);
  });

  it("renders the banner into its light DOM by default, with no parts", () => {
    const el = make(FULL());
    expect(el.shadowRoot).toBeNull();
    expect(el.children).toHaveLength(1);
    expect([...card(el).classList]).toEqual(["neuwo-cta", "neuwo-cta--banner"]);
    expect(Array.from(card(el).children, (node) => node.className)).toEqual(["neuwo-cta__body", "neuwo-cta__actions"]);
    expect(Array.from(part(el, "body").children, (node) => node.className)).toEqual([
      "neuwo-cta__headline",
      "neuwo-cta__sub",
      "neuwo-cta__field neuwo-cta__field--empty",
      "neuwo-cta__status",
    ]);
    expect(el.querySelector(":scope > .neuwo-cta [part]")).toBeNull();
  });

  it("renders the spotlight as a hidden glow and an inner panel", () => {
    const el = make(FULL('variant="spotlight"'));
    expect([...card(el).classList]).toEqual(["neuwo-cta", "neuwo-cta--spotlight"]);
    expect(Array.from(card(el).children, (node) => node.className)).toEqual(["neuwo-cta__glow", "neuwo-cta__inner"]);
    expect(part(el, "glow").getAttribute("aria-hidden")).toBe("true");
    expect(part(el, "actions").parentElement).toBe(part(el, "inner"));
    expect(part(el, "body")).toBeNull();
  });

  it("puts the headline, sub, field and actions in their wrappers", () => {
    const el = make(
      `<neuwo-cta>Ready to <span data-accent>go</span>?<span slot="sub">Sub</span>` +
        `<input slot="field" type="email"><neuwo-button slot="actions">Go</neuwo-button></neuwo-cta>`,
    );
    expect(part(el, "headline").textContent).toBe("Ready to go?");
    expect(part(el, "headline").querySelector("[data-accent]").textContent).toBe("go");
    expect(part(el, "sub").firstElementChild.getAttribute("slot")).toBe("sub");
    expect(part(el, "field").firstElementChild.localName).toBe("input");
    expect(part(el, "actions").firstElementChild.localName).toBe("neuwo-button");
    expect(isEmpty(el)).toBe(false);
  });

  it("keeps the author's nodes, in their new wrappers, when the variant changes and changes back", () => {
    const el = make(FULL());
    const accent = el.querySelector("[data-accent]");
    const sub = el.querySelector('[slot="sub"]');
    const button = el.querySelector('[slot="actions"]');
    el.variant = "spotlight";
    expect(part(el, "inner")).not.toBeNull();
    expect(accent.parentElement).toBe(part(el, "headline"));
    expect(sub.parentElement).toBe(part(el, "sub"));
    expect(button.parentElement).toBe(part(el, "actions"));
    expect(part(el, "actions").parentElement).toBe(part(el, "inner"));
    el.variant = "";
    expect(el.hasAttribute("variant")).toBe(false);
    expect([...card(el).classList]).toEqual(["neuwo-cta", "neuwo-cta--banner"]);
    expect(accent.parentElement).toBe(part(el, "headline"));
    expect(button.parentElement).toBe(part(el, "actions"));
    expect(part(el, "actions").parentElement).toBe(card(el));
    expect(part(el, "headline").textContent).toBe("Ready to go?");
  });

  it("keeps the headline's children when heading-level re-tags the headline", () => {
    const el = make(FULL());
    const nodes = [...part(el, "headline").childNodes];
    expect(part(el, "headline").localName).toBe("h2");
    el.headingLevel = 4;
    expect(el.getAttribute("heading-level")).toBe("4");
    expect(part(el, "headline").localName).toBe("h4");
    same([...part(el, "headline").childNodes], nodes);
    el.setAttribute("heading-level", "9");
    expect(part(el, "headline").localName).toBe("h2");
    same([...part(el, "headline").childNodes], nodes);
    el.headingLevel = "";
    expect(el.hasAttribute("heading-level")).toBe(false);
  });

  it("keeps the card when only the status, pulse or intensity changes", () => {
    const el = make(FULL());
    const root = card(el);
    el.status = "Sent";
    el.pulse = true;
    el.intensity = "l";
    expect(card(el)).toBe(root);
  });

  it("updates the status in place on the same live region, and leaves it with no child when cleared", () => {
    const el = make(FULL());
    const status = part(el, "status");
    expect(status.getAttribute("role")).toBe("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.childNodes).toHaveLength(0);

    el.status = "Sending";
    expect(part(el, "status")).toBe(status);
    expect(status.textContent).toBe("Sending");
    const line = status.firstChild;
    el.status = "Thanks, we will be in touch shortly.";
    el.statusState = "success";
    expect(part(el, "status")).toBe(status);
    expect(status.firstChild).toBe(line);
    expect(status.textContent).toBe("Thanks, we will be in touch shortly.");
    expect([...status.classList]).toEqual(["neuwo-cta__status", "neuwo-cta__status--success"]);

    el.statusState = "error";
    expect([...status.classList]).toEqual(["neuwo-cta__status", "neuwo-cta__status--error"]);
    el.status = "";
    expect(part(el, "status")).toBe(status);
    expect(status.childNodes).toHaveLength(0);
  });

  it("falls back to the muted state for an unknown status state", () => {
    const status = part(make(FULL('status="Working" status-state="loud"')), "status");
    expect(status.textContent).toBe("Working");
    expect([...status.classList]).toEqual(["neuwo-cta__status"]);
  });

  it("observes pulse and intensity, which change no markup, and reflects them", () => {
    expect(NeuwoCta.observedAttributes).toEqual(expect.arrayContaining(["pulse", "intensity"]));
    const el = make(FULL());
    const done = watch(card(el));
    expect(el.pulse).toBe(false);
    expect(el.intensity).toBe("m");
    el.pulse = true;
    el.intensity = "l";
    expect(el.hasAttribute("pulse")).toBe(true);
    expect(el.getAttribute("intensity")).toBe("l");
    el.pulse = false;
    el.intensity = "";
    expect(el.hasAttribute("pulse")).toBe(false);
    expect(el.hasAttribute("intensity")).toBe(false);
    expect(el.intensity).toBe("m");
    expect(done()).toEqual([]);
  });

  it("reflects the variant and status properties to their attributes", () => {
    const el = make(FULL());
    expect(el.variant).toBe("banner");
    expect(el.headingLevel).toBe("2");
    expect(el.status).toBe("");
    expect(el.statusState).toBe("muted");
    el.variant = "spotlight";
    el.status = "Sent";
    el.statusState = "success";
    expect(el.getAttribute("variant")).toBe("spotlight");
    expect(el.getAttribute("status")).toBe("Sent");
    expect(el.getAttribute("status-state")).toBe("success");
    el.variant = null;
    el.status = "";
    el.statusState = "muted";
    expect(el.hasAttribute("variant")).toBe(false);
    expect(el.hasAttribute("status")).toBe(false);
    expect(el.hasAttribute("status-state")).toBe(false);
  });

  it("collapses the field wrapper when nothing is slotted into it, even around indented markup", () => {
    const el = make(`<neuwo-cta>
      Ready?
      <span slot="sub">Sub</span>
      <neuwo-button slot="actions">Go</neuwo-button>
    </neuwo-cta>`);
    expect(isEmpty(el)).toBe(true);
    expect(part(el, "field").childNodes).toHaveLength(0);
    expect(part(el, "status").childNodes).toHaveLength(0);
  });

  it("drops the field's empty modifier when a script appends a field later, keeping the card", async () => {
    const el = make(FULL());
    const root = card(el);
    const input = document.createElement("input");
    input.slot = "field";
    el.append(input);
    await settled();
    expect(isEmpty(el)).toBe(false);
    expect(input.parentElement).toBe(part(el, "field"));
    expect(card(el)).toBe(root);
  });

  it("adopts server markup without a single mutation, and warns about nothing", async () => {
    const warn = quiet();
    const holder = document.createElement("div");
    holder.innerHTML = renderElement(
      "neuwo-cta",
      { variant: "spotlight", status: "Sent", "status-state": "success" },
      [
        serverChild(null, "default", "Ready?", "Ready?"),
        serverChild("input", "field", "", '<input slot="field" type="email">'),
        serverChild("button", "actions", "Go", '<button slot="actions">Go</button>'),
      ],
      ctaTemplate,
      idScope("neuwo-s"),
    );
    const done = watch(holder);
    attach(holder);
    await settled();
    expect(done()).toEqual([]);
    expect(holder.firstElementChild).toBeInstanceOf(NeuwoCta);
    expect(warn).not.toHaveBeenCalled();
  });

  it("keeps a block-level sub inside its wrapper through parsing, adoption and attribute changes", async () => {
    const holder = document.createElement("div");
    holder.innerHTML = renderElement(
      "neuwo-cta",
      {},
      [
        serverChild(null, "default", "Ready?", "Ready?"),
        serverChild("p", "sub", "Talk to our team.", '<p slot="sub">Talk to our team.</p>'),
        serverChild("button", "actions", "Go", '<button slot="actions">Go</button>'),
      ],
      ctaTemplate,
      idScope("neuwo-s"),
    );
    const sub = holder.querySelector('[slot="sub"]');
    expect(sub.parentElement.className).toBe("neuwo-cta__sub");
    const done = watch(holder);
    attach(holder);
    await settled();
    expect(done()).toEqual([]);

    const el = holder.firstElementChild;
    el.status = "Sent";
    el.variant = "spotlight";
    await settled();
    expect(sub.isConnected).toBe(true);
    expect(sub.parentElement).toBe(part(el, "sub"));
    expect(part(el, "inner").children).toHaveLength(5);
    expect(el.querySelectorAll("p:not([slot])")).toHaveLength(1);
  });

  it("validates nothing on a React-owned host that has no card to check, and leaves its children alone", () => {
    const warn = quiet();
    const queued = [];
    const queue = vi.spyOn(globalThis, "queueMicrotask").mockImplementation((callback) => queued.push(callback));
    const holder = document.createElement("div");
    holder.innerHTML = `<neuwo-cta>Ready?<neuwo-button slot="actions">Go</neuwo-button></neuwo-cta>`;
    const el = holder.firstElementChild;
    el[Symbol.for("neuwo.react")] = true;
    const before = [...el.childNodes];
    attach(holder);
    queue.mockRestore();
    expect(queued.length).toBeGreaterThan(0);
    for (const callback of queued) expect(callback).not.toThrow();
    expect(card(el)).toBeNull();
    same([...el.childNodes], before);
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns once each about a missing headline or a missing action, after the children have arrived", async () => {
    const warn = quiet();
    make(`<neuwo-cta>Ready?</neuwo-cta>`);
    expect(warn).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain('"actions"');

    warn.mockClear();
    make(`<neuwo-cta>
      <neuwo-button slot="actions">Go</neuwo-button>
    </neuwo-cta>`);
    await Promise.resolve();
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("headline");
  });

  it("does not warn about content a script appends after connecting the element", async () => {
    const warn = quiet();
    const el = attach(document.createElement("neuwo-cta"));
    const headline = document.createElement("span");
    headline.textContent = "Ready?";
    const button = document.createElement("button");
    button.slot = "actions";
    button.textContent = "Go";
    el.append(headline);
    el.append(button);
    await settled();
    expect(headline.parentElement).toBe(part(el, "headline"));
    expect(button.parentElement).toBe(part(el, "actions"));
    expect(warn).not.toHaveBeenCalled();
  });

  it("does not warn about a complete CTA, and writes nothing while it checks", async () => {
    const warn = quiet();
    const holder = document.createElement("div");
    holder.innerHTML = FULL('variant="spotlight"');
    attach(holder);
    const done = watch(holder);
    await settled();
    expect(warn).not.toHaveBeenCalled();
    expect(done()).toEqual([]);
  });
});

describe("<neuwo-cta> under React", () => {
  it("sets the field's empty modifier as the field child is removed and added, with no element writes and no console.error", async () => {
    const error = vi.spyOn(console, "error");
    const warn = quiet();
    const container = attach(document.createElement("div"));
    const root = createRoot(container);
    cleanup.push(() => root.unmount());
    const observer = new MutationObserver(() => {});
    observer.observe(container, { subtree: true, childList: true, attributes: true, characterData: true });
    cleanup.push(() => observer.disconnect());
    const tree = (field) =>
      jsxs("neuwo-cta", {
        ...(!field && { status: "Thanks" }),
        children: [
          "Ready?",
          jsx("span", { slot: "sub", children: "Sub" }, "sub"),
          field && jsx("input", { slot: "field", type: "email", name: "email" }, "field"),
          jsx("neuwo-button", { slot: "actions", children: "Go" }, "go"),
        ],
      });

    const show = async (field) => {
      flushSync(() => root.render(tree(field)));
      expect(observer.takeRecords().length, `React wrote nothing for field=${field}`).toBeGreaterThan(0);
      await settled();
      expect(observer.takeRecords(), `the element wrote after React rendered field=${field}`).toEqual([]);
      expect(normalise(container.innerHTML)).toBe(normalise(renderToStaticMarkup(tree(field))));
      return container.firstElementChild;
    };

    const el = await show(true);
    expect(el).toBeInstanceOf(NeuwoCta);
    const first = card(el);
    expect(isEmpty(el)).toBe(false);
    await show(false);
    expect(isEmpty(el)).toBe(true);
    expect(part(el, "status").textContent).toBe("Thanks");
    await show(true);
    expect(isEmpty(el)).toBe(false);
    expect(part(el, "status").childNodes).toHaveLength(0);
    expect(card(el)).toBe(first);
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("renders and hydrates a block-level sub inside its wrapper with no nesting or hydration error", async () => {
    const error = vi.spyOn(console, "error");
    quiet();
    const tree = () =>
      jsxs("neuwo-cta", {
        children: ["Ready?", jsx("p", { slot: "sub", children: "Talk to our team." }, "sub"), jsx("button", { slot: "actions", children: "Go" }, "go")],
      });

    const rendered = attach(document.createElement("div"));
    const app = createRoot(rendered);
    cleanup.push(() => app.unmount());
    flushSync(() => app.render(tree()));
    expect(rendered.querySelector('[slot="sub"]').parentElement.className).toBe("neuwo-cta__sub");

    const parsed = document.createElement("div");
    parsed.innerHTML = renderToString(tree());
    const sub = parsed.querySelector('[slot="sub"]');
    expect(sub.parentElement.className).toBe("neuwo-cta__sub");
    const hydrated = attach(document.createElement("div"));
    hydrated.append(...parsed.childNodes);
    const recoverable = [];
    const hydratedApp = hydrateRoot(hydrated, tree(), { onRecoverableError: (thrown) => void recoverable.push(String(thrown?.message ?? thrown)) });
    cleanup.push(() => hydratedApp.unmount());
    await vi.waitFor(() => expect(Object.keys(sub).some((key) => key.startsWith("__reactFiber$"))).toBe(true));
    expect(recoverable).toEqual([]);
    expect(hydrated.querySelector('[slot="sub"]')).toBe(sub);
    expect(error).not.toHaveBeenCalled();
  });
});
