// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { expand } from "../src/server/index.js";
import { templates } from "../src/templates.js";
import { cases, markup } from "./fixtures/template-cases.js";

const REFERENCES = ["for", "aria-describedby", "aria-controls", "aria-labelledby", "aria-activedescendant"];
const FIELDS =
  `<neuwo-input name="email" label="Email" error="Bad"></neuwo-input>` +
  `<neuwo-combobox name="plan" label="Plan" error="Pick one"><option>A</option><optgroup label="Paid"><option>B</option></optgroup></neuwo-combobox>`;

const page = expand(
  Object.entries(cases)
    .flatMap(([tag, list]) => list.map((testCase) => markup({ tag, attrs: testCase.attrs, children: testCase.children })))
    .join(""),
);

const cleanup = [];
afterEach(() => {
  while (cleanup.length) cleanup.pop()();
});

/** @param {string} html */
function form(html) {
  const holder = document.createElement("form");
  holder.innerHTML = html;
  document.body.append(holder);
  cleanup.push(() => holder.remove());
  return holder;
}

/** @param {MutationRecord} record */
function describeRecord(record) {
  const target = record.target.nodeType === 1 ? `${record.target.localName}.${record.target.className}` : `text in ${record.target.parentElement?.className}`;
  if (record.type === "attributes") return `${target} ${record.attributeName}: ${record.oldValue}`;
  if (record.type === "characterData") return `${target} text: ${record.oldValue}`;
  return `${target} children: +${record.addedNodes.length} -${record.removedNodes.length}`;
}

/** @param {Element} host */
const referencesOf = (host) =>
  Array.from(host.querySelectorAll("*")).flatMap((el) => REFERENCES.flatMap((name) => el.getAttribute(name)?.split(/\s+/).filter(Boolean) ?? []));

/** @param {Element} host */
const labelled = (host) => host.querySelector(host.localName === "neuwo-combobox" ? ".neuwo-combobox__trigger" : ".neuwo-input");

/** @param {Element[]} hosts */
function expectOwnIds(hosts) {
  const ids = Array.from(document.querySelectorAll("[id]"), (el) => el.id);
  expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
  for (const host of hosts) {
    expect(referencesOf(host).length).toBeGreaterThan(0);
    for (const id of referencesOf(host)) expect(host.contains(document.getElementById(id)), `${host.localName} ${id}`).toBe(true);
  }
}

describe("served markup upgraded when the elements are defined, in jsdom", () => {
  const container = document.createElement("div");
  const seen = [];
  const constructed = [];

  beforeAll(async () => {
    container.innerHTML = page;
    document.body.append(container);
    for (const tag of Object.keys(templates)) expect(customElements.get(tag), tag).toBeUndefined();
    const observer = new MutationObserver((records) => void seen.push(...records));
    observer.observe(container, { subtree: true, childList: true, attributes: true, attributeOldValue: true, characterData: true, characterDataOldValue: true });
    const define = customElements.define.bind(customElements);
    customElements.define = (name, ctor, options) => {
      define(
        name,
        class extends ctor {
          constructor() {
            super();
            constructed.push(this.hasAttributes() || this.hasChildNodes());
          }
        },
        options,
      );
    };
    try {
      await import("../src/index.js");
    } finally {
      delete customElements.define;
    }
    seen.push(...observer.takeRecords());
    observer.disconnect();
  });

  afterAll(() => container.remove());

  it("constructs every served host with its attributes and children, as a browser does", () => {
    const hosts = container.querySelectorAll(Object.keys(templates).join(","));
    expect(constructed.length).toBe(hosts.length);
    expect(constructed.every(Boolean)).toBe(true);
    for (const host of hosts) expect(host, host.localName).toBeInstanceOf(customElements.get(host.localName));
  });

  it("writes nothing inside the hosts", () => {
    expect(seen.map(describeRecord)).toEqual([]);
  });
});

describe("a copy of a rendered <neuwo-input> made with cloneNode(true), in jsdom", () => {
  for (const [attribute, value, read] of [
    ["name", "email-2", (/** @type {HTMLInputElement} */ control) => control.name],
    ["aria-label", "Email 2", (/** @type {HTMLInputElement} */ control) => control.getAttribute("aria-label")],
  ]) {
    it(`gives the copy's control a${attribute === "name" ? "" : "n"} ${attribute} set on the copy before it is inserted`, () => {
      const holder = form(`<neuwo-input name="email" label="Email" aria-label="Email 1"></neuwo-input>`);
      const original = holder.firstElementChild;
      const before = { name: original.control.name, label: original.control.getAttribute("aria-label") };
      expect(before).toEqual({ name: "email", label: "Email 1" });
      const copy = /** @type {Element} */ (original.cloneNode(true));
      copy.setAttribute(attribute, value);
      holder.append(copy);
      expect(read(copy.control)).toBe(value);
      expect({ name: original.control.name, label: original.control.getAttribute("aria-label") }).toEqual(before);
      expect(copy.querySelector("label").control).toBe(copy.control);
    });
  }
});

describe("adoption with no CSS global, in jsdom", () => {
  it("adopts served fields and separates the ids of their copies", () => {
    const css = Object.getOwnPropertyDescriptor(globalThis, "CSS");
    delete globalThis.CSS;
    try {
      expect(globalThis.CSS).toBeUndefined();
      const holder = form(expand(FIELDS));
      const originals = Array.from(holder.children);
      holder.prepend(...originals.map((host) => /** @type {Element} */ (host.cloneNode(true))));
      holder.append(...originals.map((host) => /** @type {Element} */ (host.cloneNode(true))));
      const hosts = Array.from(holder.children);
      expectOwnIds(hosts);
      for (const host of hosts) expect(host.querySelector("label").control, host.localName).toBe(labelled(host));
    } finally {
      if (css) Object.defineProperty(globalThis, "CSS", css);
    }
  });
});
