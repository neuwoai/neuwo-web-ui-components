import { afterEach, describe, expect, it, vi } from "vitest";
import { Suspense, act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { createRuntime } from "./fixtures/runtime.js";
import { NeuwoElement, define } from "../src/core/element.js";
import { expand } from "../src/server/index.js";
import { boxTemplate, groupTemplate, itemTemplate, withinTemplates } from "./fixtures/within.js";

class XGroup extends NeuwoElement {
  static template = groupTemplate;
  static observedAttributes = ["name", "value", "tone"];
}

class XItem extends NeuwoElement {
  static template = itemTemplate;
  static observedAttributes = [];
  updates = 0;
  updated() {
    this.updates++;
  }
}

class XBox extends NeuwoElement {
  static template = boxTemplate;
  static observedAttributes = ["label"];
}

define("x-group", XGroup);
define("x-item", XItem);
define("x-box", XBox);

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** @type {Array<() => void>} */
const cleanup = [];
afterEach(() => {
  while (cleanup.length) cleanup.pop()();
  vi.restoreAllMocks();
});

/** @param {string} html */
function mount(html) {
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.append(container);
  cleanup.push(() => container.remove());
  return container;
}

/** @param {Node} root */
function watch(root) {
  const observer = new MutationObserver(() => {});
  observer.observe(root, { subtree: true, attributes: true, attributeOldValue: true, childList: true, characterData: true });
  cleanup.push(() => observer.disconnect());
  return observer;
}

/** @param {MutationRecord} record */
function describeRecord(record) {
  const target = record.target.nodeType === 1 ? `${record.target.localName}.${record.target.className}` : `text in ${record.target.parentElement?.className}`;
  if (record.type === "attributes") return `${target} ${record.attributeName}`;
  if (record.type === "characterData") return `${target} text`;
  return `${target} children: +${record.addedNodes.length} -${record.removedNodes.length}`;
}

// Microtasks only: happy-dom holds an observer's callback in a WeakRef, so a GC between tasks can silence it.
async function settled() {
  for (let turn = 0; turn < 3; turn++) await Promise.resolve();
}

/** @param {ParentNode} root */
const shown = (root) => Array.from(root.querySelectorAll(".x-item__group"), (el) => el.textContent);

const GROUP = `<x-group name="size" value="m"><x-item>Medium</x-item><x-item>Large</x-item></x-group>`;

describe("an element whose template reads its enclosing element (within)", () => {
  for (const [source, html] of [
    ["rendered by the elements", GROUP],
    ["served", expand(GROUP, withinTemplates)],
  ]) {
    describe(source, () => {
      it("renders each item with its group's name and value", () => {
        expect(shown(mount(html))).toEqual(["size=m", "size=m"]);
      });

      it("refreshes the items when the group's value changes, and writes nothing else", () => {
        const holder = mount(html);
        const group = holder.querySelector("x-group");
        const updates = () => Array.from(holder.querySelectorAll("x-item"), (el) => /** @type {XItem} */ (el).updates);
        const before = updates();
        const observer = watch(holder);
        group.setAttribute("value", "l");
        expect(observer.takeRecords().map(describeRecord)).toEqual([
          "x-group. value",
          "span.x-item data-value",
          "text in x-item__group text",
          "span.x-item data-value",
          "text in x-item__group text",
        ]);
        expect(shown(holder)).toEqual(["size=l", "size=l"]);
        expect(updates()).toEqual(before.map((count) => count + 1));
      });

      it("refreshes the items but writes nothing in them when the group changes an attribute they do not read", () => {
        const holder = mount(html);
        const observer = watch(holder);
        holder.querySelector("x-group").setAttribute("tone", "b");
        expect(observer.takeRecords().map(describeRecord)).toEqual(["x-group. tone", "div.x-group x-group--b class"]);
        expect(shown(holder)).toEqual(["size=m", "size=m"]);
      });

      it("gives the items in a copy of the group the copy's change before the copy is inserted, and writes only what differs", () => {
        const holder = mount(html);
        const copy = /** @type {Element} */ (holder.querySelector("x-group").cloneNode(true));
        const changed = watch(copy);
        copy.setAttribute("value", "l");
        expect(changed.takeRecords().map(describeRecord)).toEqual([
          "x-group. value",
          "span.x-item data-value",
          "text in x-item__group text",
          "span.x-item data-value",
          "text in x-item__group text",
        ]);
        expect(shown(copy)).toEqual(["size=l", "size=l"]);
        expect(shown(holder)).toEqual(["size=m", "size=m"]);
        holder.append(copy);
        expect(changed.takeRecords()).toEqual([]);
        expect(shown(holder)).toEqual(["size=m", "size=m", "size=l", "size=l"]);
      });

      it("gives the items of a group the change made while it was removed, before it returns", () => {
        const holder = mount(html);
        const group = holder.querySelector("x-group");
        const updates = () => Array.from(group.querySelectorAll("x-item"), (el) => /** @type {XItem} */ (el).updates);
        const before = updates();
        group.remove();
        group.setAttribute("value", "s");
        expect(shown(group)).toEqual(["size=s", "size=s"]);
        expect(updates()).toEqual(before);
        const observer = watch(group);
        holder.append(group);
        expect(observer.takeRecords()).toEqual([]);
        expect(updates()).toEqual(before.map((count) => count + 1));
      });
    });
  }

  it("renders an item outside any group with no group, and reads its group once it is moved into one", () => {
    const holder = mount(`<x-item>Alone</x-item>${GROUP}`);
    const lone = holder.querySelector("x-item");
    expect(shown(lone)).toEqual(["none"]);
    holder.querySelector(".x-group").append(lone);
    expect(shown(lone)).toEqual(["size=m"]);
  });

  it("reads the new group after a move from one group to another, and writes nothing on a move within one", () => {
    const holder = mount(`${GROUP}<x-group name="colour" value="red"><x-item>Red</x-item></x-group>`);
    const [first, second] = Array.from(holder.querySelectorAll(".x-group"));
    const moved = first.querySelector("x-item");
    second.append(moved);
    expect(shown(moved)).toEqual(["colour=red"]);
    const observer = watch(moved);
    second.prepend(moved);
    expect(observer.takeRecords()).toEqual([]);
    expect(shown(moved)).toEqual(["colour=red"]);
  });

  it("reads the group's change made while the item was away", () => {
    const holder = mount(GROUP);
    const group = holder.querySelector("x-group");
    group.remove();
    group.setAttribute("value", "s");
    holder.append(group);
    expect(shown(holder)).toEqual(["size=s", "size=s"]);
  });

  it("refreshes only the items whose nearest group changed", () => {
    const holder = mount(`<x-group name="outer" value="1"><x-item>A</x-item><x-group name="inner" value="2"><x-item>B</x-item></x-group></x-group>`);
    expect(shown(holder)).toEqual(["outer=1", "inner=2"]);
    const [, inner] = /** @type {XItem[]} */ (Array.from(holder.querySelectorAll("x-item")));
    const before = inner.updates;
    const observer = watch(inner);
    holder.querySelector("x-group").setAttribute("value", "9");
    expect(shown(holder)).toEqual(["outer=9", "inner=2"]);
    expect(observer.takeRecords()).toEqual([]);
    expect(inner.updates).toBe(before);
  });

  it("does not reconcile the existing items when an item is appended to the group", async () => {
    /** @type {string[]} */
    const labels = [];
    /** @type {import("../src/core/template.js").Template} */
    const counted = (attrs, ctx) => {
      labels.push(ctx.children.map((child) => child.text).join(""));
      return itemTemplate(attrs, ctx);
    };
    counted.within = "x-group";
    define(
      "x-counted",
      class extends NeuwoElement {
        static template = counted;
        static observedAttributes = [];
      },
    );
    const holder = mount(`<x-group name="size" value="m"><x-counted>Medium</x-counted><x-counted>Large</x-counted></x-group>`);
    const group = holder.querySelector("x-group");
    labels.length = 0;
    const added = document.createElement("x-counted");
    added.textContent = "Small";
    group.append(added);
    await settled();
    expect(added.parentElement).toBe(group.querySelector(".x-group"));
    expect(labels.filter((label) => label === "Medium" || label === "Large")).toEqual([]);
    expect(shown(holder)).toEqual(["size=m", "size=m", "size=m"]);
    const wrapped = document.createElement("x-counted");
    wrapped.textContent = "Tiny";
    group.querySelector(".x-group").append(wrapped);
    await settled();
    expect(labels.filter((label) => label === "Medium" || label === "Large")).toEqual([]);
    expect(shown(holder)).toEqual(["size=m", "size=m", "size=m", "size=m"]);
    group.setAttribute("value", "l");
    expect(labels.filter((label) => label === "Medium" || label === "Large")).toEqual(["Medium", "Large"]);
    expect(shown(holder)).toEqual(["size=l", "size=l", "size=l", "size=l"]);
  });

  it("refreshes a nested box from the box around it, never from itself", () => {
    const holder = mount(`<x-box label="outer"><x-box label="inner">x</x-box></x-box>`);
    const outer = holder.querySelector("x-box");
    expect(Array.from(holder.querySelectorAll(".x-box"), (el) => el.getAttribute("data-outer"))).toEqual(["none", "outer"]);
    outer.setAttribute("label", "changed");
    expect(Array.from(holder.querySelectorAll(".x-box"), (el) => el.getAttribute("data-outer"))).toEqual(["none", "changed"]);
  });

  describe("while the document is still parsing", () => {
    afterEach(() => delete document.readyState);

    it("applies a group change made while the served items wait for the document", () => {
      Object.defineProperty(document, "readyState", { configurable: true, get: () => "loading" });
      const served = document.createElement("template");
      served.innerHTML = expand(`<x-group name="size" value="m"><x-item>Medium</x-item></x-group>`, withinTemplates);
      const root = served.content.querySelector(".x-group");
      const itemMarkup = served.content.querySelector("x-item").innerHTML;
      const holder = mount("");
      const group = document.createElement("x-group");
      group.setAttribute("name", "size");
      group.setAttribute("value", "m");
      holder.append(group);
      group.append(/** @type {Element} */ (root.cloneNode(false)));
      const item = document.createElement("x-item");
      group.firstElementChild.append(item);
      item.innerHTML = itemMarkup;
      group.setAttribute("value", "l");
      expect(shown(holder)).toEqual(["size=m"]);
      delete document.readyState;
      document.dispatchEvent(new Event("DOMContentLoaded"));
      expect(shown(holder)).toEqual(["size=l"]);
    });
  });

  describe("React output revealed from a Suspense boundary before hydration", () => {
    it("writes nothing when the reader moves from its hidden container into the group, and hydrates with no error", async () => {
      const errors = vi.spyOn(console, "error");
      const { jsx } = createRuntime(withinTemplates);
      const tree = () => jsx("x-group", { name: "size", value: "m", onChange() {}, children: jsx(Suspense, { children: jsx("x-item", { children: "Medium" }) }) });
      const parsed = document.createElement("div");
      parsed.innerHTML = renderToString(tree());
      const item = parsed.querySelector("x-item");
      const end = /** @type {ChildNode} */ (item.nextSibling);
      expect(end.nodeType).toBe(Node.COMMENT_NODE);
      item.remove();
      const container = mount("");
      container.append(...parsed.childNodes);
      const parked = mount("");
      parked.hidden = true;
      parked.append(item);
      expect(shown(item)).toEqual(["size=m"]);
      const observer = watch(item);
      end.before(item);
      expect(observer.takeRecords().map(describeRecord)).toEqual([]);
      expect(shown(container)).toEqual(["size=m"]);
      const recoverable = [];
      let root;
      await act(async () => {
        root = hydrateRoot(container, tree(), { onRecoverableError: (thrown) => void recoverable.push(String(thrown?.message ?? thrown)) });
      });
      cleanup.push(() => act(() => root.unmount()));
      expect(recoverable).toEqual([]);
      expect(errors).not.toHaveBeenCalled();
      expect(container.querySelector("x-item")).toBe(item);
    });
  });
});
