// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { NeuwoElement, define } from "../src/core/element.js";
import { REACT } from "../src/core/marks.js";
import { h, region } from "../src/core/template.js";
import { expand } from "../src/server/index.js";
import { templates } from "../src/templates.js";
import { cases, markup } from "./fixtures/template-cases.js";
import { groupTemplate, itemTemplate, withinTemplates } from "./fixtures/within.js";

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

describe("readers of an enclosing element (within), upgraded and copied in jsdom", () => {
  const container = document.createElement("div");
  const seen = [];
  /** @param {ParentNode} root */
  const shown = (root) => Array.from(root.querySelectorAll(".x-item__group"), (el) => el.textContent);
  /** @param {Element} host */
  const watchCopy = (host) => {
    const observer = new MutationObserver(() => {});
    observer.observe(container, { subtree: true, childList: true, attributes: true, characterData: true });
    return () => observer.takeRecords().filter((record) => host.contains(record.target));
  };

  beforeAll(() => {
    container.innerHTML = expand(
      `<x-group name="size" value="m"><x-item>Medium</x-item><x-item>Large</x-item></x-group><x-group name="colour" value="red"><x-item>Red</x-item></x-group>`,
      withinTemplates,
    );
    document.body.append(container);
    const observer = new MutationObserver((records) => void seen.push(...records));
    observer.observe(container, { subtree: true, childList: true, attributes: true, attributeOldValue: true, characterData: true, characterDataOldValue: true });
    define("x-group", class extends NeuwoElement {
      static template = groupTemplate;
      static observedAttributes = ["name", "value", "tone"];
    });
    define("x-item", class extends NeuwoElement {
      static template = itemTemplate;
      static observedAttributes = [];
    });
    seen.push(...observer.takeRecords());
    observer.disconnect();
  });

  afterAll(() => container.remove());

  /** @param {Element} copy */
  const track = (copy) => cleanup.push(() => copy.remove());

  it("upgrades served groups and their items at definition and writes nothing", () => {
    expect(container.querySelector("x-item")).toBeInstanceOf(customElements.get("x-item"));
    expect(seen.map(describeRecord)).toEqual([]);
    expect(shown(container)).toEqual(["size=m", "size=m", "colour=red"]);
  });

  it("gives a copy of an item appended to another group that group's attributes", () => {
    const [size, colour] = Array.from(container.querySelectorAll(".x-group"));
    const copy = /** @type {Element} */ (size.querySelector("x-item").cloneNode(true));
    track(copy);
    colour.append(copy);
    expect(shown(copy)).toEqual(["colour=red"]);
    expect(copy.querySelector(".x-item").getAttribute("data-value")).toBe("red");
  });

  it("drops the group from a copy of an item appended outside any group", () => {
    const copy = /** @type {Element} */ (container.querySelector("x-item").cloneNode(true));
    track(copy);
    container.append(copy);
    expect(shown(copy)).toEqual(["none"]);
    expect(copy.querySelector(".x-item").hasAttribute("data-value")).toBe(false);
  });

  it("drops the group from the items in a copy of a wrapper appended outside any group", () => {
    const copy = /** @type {Element} */ (container.querySelector(".x-group").cloneNode(true));
    track(copy);
    container.append(copy);
    expect(shown(copy)).toEqual(["none", "none"]);
    expect(Array.from(copy.querySelectorAll(".x-item"), (el) => el.hasAttribute("data-value"))).toEqual([false, false]);
  });

  it("writes nothing in a copy of an item appended to its own group", () => {
    const size = container.querySelector(".x-group");
    const copy = /** @type {Element} */ (size.querySelector("x-item").cloneNode(true));
    track(copy);
    const written = watchCopy(copy);
    size.append(copy);
    expect(written().map(describeRecord)).toEqual([]);
    expect(shown(copy)).toEqual(["size=m"]);
  });

  it("writes nothing when served markup outside the document is upgraded", () => {
    const holder = document.createElement("div");
    holder.innerHTML = expand(`<x-group name="size" value="m"><x-late-item>Medium</x-late-item></x-group>`, { ...withinTemplates, "x-late-item": itemTemplate });
    define("x-late-item", class extends NeuwoElement {
      static template = itemTemplate;
      static observedAttributes = [];
    });
    expect(holder.querySelector("x-late-item")).not.toBeInstanceOf(customElements.get("x-late-item"));
    const observer = new MutationObserver(() => {});
    observer.observe(holder, { subtree: true, childList: true, attributes: true, characterData: true });
    customElements.upgrade(holder);
    expect(holder.querySelector("x-late-item")).toBeInstanceOf(customElements.get("x-late-item"));
    expect(observer.takeRecords().map(describeRecord)).toEqual([]);
    expect(shown(holder)).toEqual(["size=m"]);
  });

  it("gives a copy the change its group made between the copy and its insertion", () => {
    const group = container.querySelector("x-group");
    const copy = /** @type {Element} */ (group.querySelector("x-item").cloneNode(true));
    track(copy);
    group.setAttribute("value", "l");
    group.querySelector(".x-group").append(copy);
    expect(shown(group)).toEqual(["size=l", "size=l", "size=l"]);
    group.setAttribute("value", "m");
  });
});

describe("a copy of a wrapper around a rendered <neuwo-radio>, in jsdom", () => {
  it("drops the group's name and starting value once the copy is appended outside any group", async () => {
    await import("../src/index.js");
    const holder = form(
      expand(`<neuwo-radio-group name="plan" value="a"><div class="pair"><neuwo-radio value="a">A</neuwo-radio></div></neuwo-radio-group><section></section>`),
    );
    expect(holder.querySelector(".pair input").name).toBe("plan");
    const copy = /** @type {Element} */ (holder.querySelector(".pair").cloneNode(true));
    holder.querySelector("section").append(copy);
    const input = /** @type {HTMLInputElement} */ (copy.querySelector("input"));
    expect(input.hasAttribute("name")).toBe(false);
    expect(input.hasAttribute("checked")).toBe(false);
  });
});

describe("a renamed copy of a rendered radio appended to the same form, in jsdom", () => {
  const ROW = `<div class="row"><neuwo-radio-group name="tier-0" label="Tier" value="pro"><neuwo-radio value="free">Free</neuwo-radio><neuwo-radio value="pro">Pro</neuwo-radio></neuwo-radio-group></div>`;
  const LONE = `<div class="row"><neuwo-radio name="agree-0" value="yes" checked>Agree</neuwo-radio></div>`;

  for (const [source, html] of [
    ["rendered by the elements", ROW],
    ["served", expand(ROW)],
  ]) {
    it(`keeps the original group's pick, for a group ${source}`, async () => {
      await import("../src/index.js");
      const holder = form(html);
      const row = /** @type {Element} */ (holder.querySelector(".row").cloneNode(true));
      row.querySelector("neuwo-radio-group").setAttribute("name", "tier-1");
      holder.append(row);
      const [original, copy] = /** @type {import("../src/components/selection/radio/neuwo-radio-group.js").NeuwoRadioGroup[]} */ (
        Array.from(holder.querySelectorAll("neuwo-radio-group"))
      );
      expect(Array.from(copy.querySelectorAll("input"), (input) => input.name)).toEqual(["tier-1", "tier-1"]);
      expect([original.value, copy.value]).toEqual(["pro", "pro"]);
      expect([...new FormData(holder)]).toEqual([
        ["tier-0", "pro"],
        ["tier-1", "pro"],
      ]);
    });
  }

  it("keeps the original lone radio checked", async () => {
    await import("../src/index.js");
    const holder = form(LONE);
    const row = /** @type {Element} */ (holder.querySelector(".row").cloneNode(true));
    row.querySelector("neuwo-radio").setAttribute("name", "agree-1");
    holder.append(row);
    expect([...new FormData(holder)]).toEqual([
      ["agree-0", "yes"],
      ["agree-1", "yes"],
    ]);
  });
});

describe("a property set on a light element before it is defined, in jsdom", () => {
  let count = 0;
  /** A tag of its own for each test, defined only when the test says so, as a page's deferred module does. */
  async function later() {
    const { NeuwoButton } = await import("../src/components/button/neuwo-button.js");
    const tag = `early-${++count}-button`;
    return { tag, define: () => customElements.define(tag, class extends NeuwoButton {}) };
  }

  /** @param {Element} el */
  const shown = (el) => {
    const button = /** @type {HTMLButtonElement} */ (el.querySelector(".neuwo-btn"));
    return { disabled: button.disabled, busy: button.getAttribute("aria-busy"), loading: button.classList.contains("neuwo-btn--loading") };
  };

  it("puts disabled and loading on a <neuwo-button> once it upgrades", async () => {
    const { tag, define } = await later();
    const holder = form("");
    const el = holder.appendChild(document.createElement(tag));
    el.disabled = true;
    el.loading = true;
    expect(Object.hasOwn(el, "disabled")).toBe(true);
    define();
    expect(Object.keys(el)).toEqual([]);
    expect([el.disabled, el.loading]).toEqual([true, true]);
    expect([el.hasAttribute("disabled"), el.hasAttribute("loading")]).toEqual([true, true]);
    expect(shown(el)).toEqual({ disabled: true, busy: "true", loading: true });
  });

  it("holds them for a <neuwo-button> upgraded while detached, and renders them when it connects", async () => {
    const { tag, define } = await later();
    const el = document.createElement(tag);
    el.loading = true;
    el.disabled = true;
    define();
    customElements.upgrade(el);
    expect(Object.keys(el)).toEqual([]);
    await Promise.resolve();
    expect([el.disabled, el.loading]).toEqual([true, true]);
    expect(el.querySelector(".neuwo-btn")).toBeNull();
    form("").append(el);
    expect(shown(el)).toEqual({ disabled: true, busy: "true", loading: true });
  });

  it("runs connect() without an updated() before it when a restored property changes an attribute", async () => {
    const { NeuwoButton } = await import("../src/components/button/neuwo-button.js");
    const calls = [];
    const tag = `early-${++count}-button`;
    const el = form("").appendChild(document.createElement(tag));
    el.loading = true;
    customElements.define(
      tag,
      class extends NeuwoButton {
        connect() {
          calls.push("connect");
        }
        updated() {
          calls.push("updated");
        }
      },
    );
    expect(calls).toEqual(["connect"]);
    expect(shown(el).loading).toBe(true);
    el.remove();
    form("").append(el);
    expect(calls).toEqual(["connect", "connect", "updated"]);
  });

  it("leaves a property with no setter on the element alone", async () => {
    const { tag, define } = await later();
    const el = form("").appendChild(document.createElement(tag));
    el.extra = 1;
    el.template = "mine";
    define();
    expect(el.extra).toBe(1);
    expect(Object.getOwnPropertyDescriptor(el, "template")?.value).toBe("mine");
    expect(el.querySelector(".neuwo-btn")).not.toBeNull();
  });
});

describe("what an observed attribute change, and refresh(), do in each lifecycle state, in jsdom", () => {
  /** @param {Record<string, string>} attrs */
  const lifeTemplate = (attrs) =>
    h("span", { class: `x-life x-life--${attrs.tone ?? "a"}` }, h("span", { class: "x-life__start" }, region("start")), h("span", { class: "x-life__body" }, region()));
  /** @type {import("../src/core/template.js").Template} */
  const lifeItem = (attrs, ctx) => itemTemplate(attrs, ctx);
  lifeItem.within = "x-life-group";
  const LIFE = { "x-life": lifeTemplate, "x-life-idle": lifeTemplate, "x-life-group": groupTemplate, "x-life-item": lifeItem, "x-life-item-idle": lifeItem };

  /** Starts only when the test calls run(), as an element whose connect has not run yet. */
  const idle = (/** @type {typeof NeuwoElement} */ base) =>
    class extends base {
      connectedCallback() {}
      run() {
        super.connectedCallback();
      }
    };

  beforeAll(() => {
    const element = (/** @type {import("../src/core/template.js").Template} */ template, /** @type {string[]} */ observed) =>
      class extends NeuwoElement {
        static template = template;
        static observedAttributes = observed;
      };
    define("x-life", element(lifeTemplate, ["tone"]));
    define("x-life-idle", idle(element(lifeTemplate, ["tone"])));
    define("x-life-group", element(groupTemplate, ["name", "value"]));
    define("x-life-item", element(lifeItem, []));
    define("x-life-item-idle", idle(element(lifeItem, [])));
  });

  afterEach(() => delete document.readyState);

  /** @param {string} html */
  const page = (html) => {
    const holder = document.createElement("div");
    holder.innerHTML = html;
    document.body.append(holder);
    cleanup.push(() => holder.remove());
    return holder;
  };
  /** @param {string} html */
  const served = (html) => expand(html, LIFE);
  const loading = () => Object.defineProperty(document, "readyState", { configurable: true, get: () => "loading" });
  const parsed = () => {
    delete document.readyState;
    document.dispatchEvent(new Event("DOMContentLoaded"));
  };
  /** @param {Element} el */
  const reinsert = (el) => () => page("").append(el);
  /** @param {string} html */
  const markedForReact = (html) => {
    const holder = document.createElement("div");
    holder.innerHTML = served(html);
    for (const el of holder.querySelectorAll("x-life, x-life-item")) Reflect.set(el, REACT, true);
    document.body.append(holder);
    cleanup.push(() => holder.remove());
    return holder.firstElementChild;
  };
  const GROUP = `<x-life-group name="size" value="m"><x-life-item>One</x-life-item></x-life-group>`;

  /** @typedef {{ el: Element, change: () => void, start: () => void }} State */
  /** @param {Element} el */
  const own = (el, start = () => {}) => ({ el, change: () => el.setAttribute("tone", "b"), start });
  /**
   * @param {Element} group
   * @param {Element} el
   */
  const read = (group, el, start = () => {}) => ({ el, change: () => group.setAttribute("value", "l"), start });

  /** @type {Array<[string, "writes now" | "marks dirty" | "ignores", () => State]>} */
  const STATES = [
    ["rendered, in the page, started", "writes now", () => own(page(served(`<x-life>Hi</x-life>`)).firstElementChild)],
    [
      "rendered, out of the page, started",
      "writes now",
      () => {
        const el = page(served(`<x-life>Hi</x-life>`)).firstElementChild;
        el.remove();
        return own(el, reinsert(el));
      },
    ],
    [
      "rendered, out of the page, never started: a copy",
      "writes now",
      () => {
        const el = /** @type {Element} */ (page(served(`<x-life>Hi</x-life>`)).firstElementChild.cloneNode(true));
        return own(el, reinsert(el));
      },
    ],
    [
      "rendered, out of the page, never started: served markup upgraded there",
      "writes now",
      () => {
        const holder = document.createElement("div");
        holder.innerHTML = served(`<x-life>Hi</x-life>`);
        customElements.upgrade(holder);
        const el = holder.firstElementChild;
        return own(el, reinsert(el));
      },
    ],
    [
      "rendered, in the page, never started",
      "marks dirty",
      () => {
        const el = page(served(`<x-life-idle>Hi</x-life-idle>`)).firstElementChild;
        return own(el, () => el.run());
      },
    ],
    [
      "empty, in the page, never started",
      "marks dirty",
      () => {
        const el = page(`<x-life-idle>Hi</x-life-idle>`).firstElementChild;
        return own(el, () => el.run());
      },
    ],
    [
      "empty, out of the page, never started",
      "marks dirty",
      () => {
        const el = document.createElement("x-life");
        el.append("Hi");
        return own(el, reinsert(el));
      },
    ],
    [
      "empty, out of the page, started",
      "marks dirty",
      () => {
        const el = page(served(`<x-life>Hi</x-life>`)).firstElementChild;
        el.remove();
        el.textContent = "Hi";
        return own(el, reinsert(el));
      },
    ],
    [
      "empty, in the page, waiting for the document",
      "marks dirty",
      () => {
        loading();
        const el = document.createElement("x-life");
        el.append("Hi");
        page("").append(el);
        return own(el, parsed);
      },
    ],
    [
      "rendered, in the page, React-owned",
      "ignores",
      () => {
        const el = markedForReact(`<x-life>Hi</x-life>`);
        return own(el, reinsert(el));
      },
    ],
    [
      "rendered, out of the page, React-owned",
      "ignores",
      () => {
        const el = markedForReact(`<x-life>Hi</x-life>`);
        el.remove();
        return own(el, reinsert(el));
      },
    ],
    [
      "a reader, rendered, in the page, started",
      "writes now",
      () => {
        const group = page(served(GROUP)).firstElementChild;
        return read(group, group.querySelector("x-life-item"));
      },
    ],
    [
      "a reader, rendered, out of the page, started",
      "writes now",
      () => {
        const group = page(served(GROUP)).firstElementChild;
        group.remove();
        return read(group, group.querySelector("x-life-item"), reinsert(group));
      },
    ],
    [
      "a reader, rendered, out of the page, never started: in a copy of its group",
      "writes now",
      () => {
        const group = /** @type {Element} */ (page(served(GROUP)).firstElementChild.cloneNode(true));
        return read(group, group.querySelector("x-life-item"), reinsert(group));
      },
    ],
    [
      "a reader, rendered, in the page, never started",
      "marks dirty",
      () => {
        const group = page(served(GROUP.replaceAll("x-life-item", "x-life-item-idle"))).firstElementChild;
        const el = group.querySelector("x-life-item-idle");
        return read(group, el, () => el.run());
      },
    ],
    [
      "a reader, empty, out of the page, in a copy of its group",
      "marks dirty",
      () => {
        const group = /** @type {Element} */ (page(served(`<x-life-group name="size" value="m"></x-life-group>`)).firstElementChild.cloneNode(true));
        const el = document.createElement("x-life-item");
        el.append("One");
        group.querySelector(".x-group").append(el);
        return read(group, el, reinsert(group));
      },
    ],
    [
      "a reader, empty, in the page, waiting for the document",
      "marks dirty",
      () => {
        const group = page(served(`<x-life-group name="size" value="m"></x-life-group>`)).firstElementChild;
        loading();
        const el = document.createElement("x-life-item");
        el.append("One");
        group.querySelector(".x-group").append(el);
        return read(group, el, parsed);
      },
    ],
    [
      "a reader, rendered, in the page, React-owned",
      "ignores",
      () => {
        const group = markedForReact(GROUP);
        return read(group, group.querySelector("x-life-item"), reinsert(group));
      },
    ],
  ];

  /** @param {Element} el */
  const shownOf = (el) => (el.localName.startsWith("x-life-item") ? el.querySelector(".x-item__group")?.textContent : el.querySelector(":scope > .x-life")?.className) ?? null;
  /** @param {Element} el */
  const changedOf = (el) => (el.localName.startsWith("x-life-item") ? "size=l" : "x-life x-life--b");

  it.each(STATES)("%s: an observed attribute change %s", (_, expected, setup) => {
    const { el, change, start } = setup();
    change();
    const now = shownOf(el);
    start();
    const later = shownOf(el);
    const target = changedOf(el);
    expect(now === target ? "writes now" : later === target ? "marks dirty" : "ignores").toBe(expected);
  });

  it.each(STATES)("%s: refresh() writes now only where a change does", (_, expected, setup) => {
    const { el } = setup();
    const child = document.createElement("i");
    el.append(child);
    /** @type {NeuwoElement} */ (el).refresh();
    expect(child.parentElement !== el).toBe(expected === "writes now");
  });
});
