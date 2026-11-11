import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { flushSync } from "react-dom";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import "../src/index.js";
import { NeuwoNotice } from "../src/components/notice/neuwo-notice.js";
import { noticeTemplate } from "../src/components/notice/notice.template.js";
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

const card = (el) => el.querySelector(":scope > .neuwo-notice");
const PATHS = {
  content: "neuwo-notice__content",
  title: "neuwo-notice__content > .neuwo-notice__title",
  message: "neuwo-notice__content > .neuwo-notice__message",
  actions: "neuwo-notice__actions",
  dismiss: "neuwo-notice__dismiss",
};
const part = (el, name) => el.querySelector(`:scope > .neuwo-notice > .${PATHS[name]}`);
const classesOf = (el) => [...card(el).classList];
const isEmpty = (el, name) => part(el, name).classList.contains(`neuwo-notice__${name}--empty`);

describe("<neuwo-notice>", () => {
  it("registers the element", () => {
    expect(customElements.get("neuwo-notice")).toBe(NeuwoNotice);
  });

  it("renders the card into its light DOM, with no parts", () => {
    const el = make(`<neuwo-notice dismissible>Hint</neuwo-notice>`);
    expect(el.shadowRoot).toBeNull();
    expect(el.children).toHaveLength(1);
    expect(Array.from(card(el).children, (child) => child.className)).toEqual([
      "neuwo-notice__content",
      "neuwo-notice__actions neuwo-notice__actions--empty",
      "neuwo-notice__dismiss",
    ]);
    expect(Array.from(part(el, "content").children, (child) => child.localName)).toEqual(["div", "div"]);
    expect(el.querySelector("[part]")).toBeNull();
  });

  it("puts the title, the message and the actions in their wrappers", () => {
    const el = make(`
      <neuwo-notice>
        <span slot="title">Cookies</span>
        We use them.
        <button slot="actions">Accept</button>
      </neuwo-notice>
    `);
    expect(part(el, "title").firstElementChild.textContent).toBe("Cookies");
    expect(part(el, "message").textContent.trim()).toBe("We use them.");
    expect(part(el, "actions").firstElementChild.textContent).toBe("Accept");
    for (const name of ["title", "message", "actions"]) expect(isEmpty(el, name), name).toBe(false);
  });

  it("docks to the bottom-end corner by default and drops the fixed placement for an in-flow notice", () => {
    expect(classesOf(make(`<neuwo-notice></neuwo-notice>`))).toEqual(["neuwo-notice", "neuwo-notice--fixed", "neuwo-notice--bottom", "neuwo-notice--end"]);
    expect(classesOf(make(`<neuwo-notice position="static"></neuwo-notice>`))).toEqual(["neuwo-notice"]);
  });

  it("keeps the card and the author's nodes across position, layout and dismissible changes, so the entrance never replays", () => {
    const el = make(`<neuwo-notice><span slot="title">Saved</span>Hint</neuwo-notice>`);
    const root = card(el);
    const title = el.querySelector('[slot="title"]');
    el.position = "top-center";
    el.layout = "row";
    el.dismissible = true;
    expect(card(el)).toBe(root);
    expect(classesOf(el)).toEqual(["neuwo-notice", "neuwo-notice--fixed", "neuwo-notice--top", "neuwo-notice--center", "neuwo-notice--row", "neuwo-notice--dismissible"]);
    expect(title.parentElement).toBe(part(el, "title"));
    el.position = "static";
    el.layout = "stack";
    expect(card(el)).toBe(root);
    expect(classesOf(el)).toEqual(["neuwo-notice", "neuwo-notice--dismissible"]);
  });

  it("renders the close button only when dismissible, and re-labels it in place", () => {
    const el = make(`<neuwo-notice>Hint</neuwo-notice>`);
    expect(part(el, "dismiss")).toBeNull();
    el.dismissible = true;
    const button = part(el, "dismiss");
    expect(button.type).toBe("button");
    expect(button.getAttribute("aria-label")).toBe("Dismiss");
    el.dismissLabel = "Zamknij";
    expect(part(el, "dismiss")).toBe(button);
    expect(button.getAttribute("aria-label")).toBe("Zamknij");
    el.dismissible = false;
    expect(part(el, "dismiss")).toBeNull();
  });

  it("dismisses on a click in server markup it adopted without a mutation", async () => {
    const holder = document.createElement("div");
    holder.innerHTML = renderElement(
      "neuwo-notice",
      { dismissible: "" },
      [{ tag: null, attrs: {}, text: "Hint", slot: "default", html: "Hint" }],
      noticeTemplate,
      idScope("neuwo-s"),
    );
    const records = [];
    const observer = new MutationObserver((list) => records.push(...list));
    observer.observe(holder, { subtree: true, childList: true, attributes: true, characterData: true });
    attach(holder);
    await settled();
    records.push(...observer.takeRecords());
    observer.disconnect();
    expect(records).toEqual([]);

    const el = holder.firstElementChild;
    expect(el).toBeInstanceOf(NeuwoNotice);
    const onDismiss = vi.fn();
    el.addEventListener("dismiss", onDismiss);
    part(el, "dismiss").click();
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(el.hidden).toBe(true);
  });

  it("stays visible when a listener cancels the dismissal, from the button and from dismiss()", () => {
    const el = make(`<neuwo-notice dismissible>Hint</neuwo-notice>`);
    el.addEventListener("dismiss", (event) => event.preventDefault());
    part(el, "dismiss").click();
    expect(el.hidden).toBe(false);
    expect(el.dismiss()).toBe(false);
    expect(el.hidden).toBe(false);
  });

  it("fires a cancelable dismiss that bubbles to the document", () => {
    const el = make(`<neuwo-notice dismissible>Hint</neuwo-notice>`);
    const onDismiss = vi.fn();
    document.addEventListener("dismiss", onDismiss);
    cleanup.push(() => document.removeEventListener("dismiss", onDismiss));
    expect(el.dismiss()).toBe(true);
    const event = onDismiss.mock.calls[0][0];
    expect(event.target).toBe(el);
    expect(event.bubbles).toBe(true);
    expect(event.cancelable).toBe(true);
  });

  it("ignores clicks anywhere but its own close button", () => {
    const el = make(`<neuwo-notice dismissible><span slot="title">T</span>Hint<button slot="actions">Accept</button></neuwo-notice>`);
    const onDismiss = vi.fn();
    el.addEventListener("dismiss", onDismiss);
    for (const target of [card(el), part(el, "title").firstElementChild, part(el, "message"), part(el, "actions").firstElementChild]) target.click();
    expect(onDismiss).not.toHaveBeenCalled();
    expect(el.hidden).toBe(false);
  });

  it("dismisses only the inner notice when notices nest", () => {
    const outer = make(`<neuwo-notice dismissible>Outer<neuwo-notice dismissible>Inner</neuwo-notice></neuwo-notice>`);
    const inner = outer.querySelector("neuwo-notice");
    part(inner, "dismiss").click();
    expect(inner.hidden).toBe(true);
    expect(outer.hidden).toBe(false);
  });

  it("hides through the host's hidden attribute, leaving its own markup untouched, and shows again when the page clears it", async () => {
    const el = make(`<neuwo-notice dismissible>Hint</neuwo-notice>`);
    const observer = new MutationObserver(() => {});
    observer.observe(card(el), { subtree: true, childList: true, attributes: true, characterData: true });
    part(el, "dismiss").click();
    expect(el.hasAttribute("hidden")).toBe(true);
    el.hidden = false;
    expect(el.hasAttribute("hidden")).toBe(false);
    await settled();
    expect(observer.takeRecords()).toEqual([]);
    observer.disconnect();
  });

  it("stops listening when removed, and dismisses again once back", () => {
    const el = make(`<neuwo-notice dismissible>Hint</neuwo-notice>`);
    el.remove();
    part(el, "dismiss").click();
    expect(el.hidden).toBe(false);
    attach(el);
    part(el, "dismiss").click();
    expect(el.hidden).toBe(true);
  });

  it("drops the title's empty modifier when a script appends a title later, keeping the card", async () => {
    const el = make(`<neuwo-notice>Hint</neuwo-notice>`);
    const root = card(el);
    expect(isEmpty(el, "title")).toBe(true);
    const title = document.createElement("span");
    title.slot = "title";
    title.textContent = "Saved";
    el.append(title);
    await settled();
    expect(isEmpty(el, "title")).toBe(false);
    expect(title.parentElement).toBe(part(el, "title"));
    expect(card(el)).toBe(root);
  });

  it("moves a child whose slot changes", async () => {
    const el = make(`<neuwo-notice><span slot="title">T</span>Body</neuwo-notice>`);
    const root = card(el);
    const title = el.querySelector('[slot="title"]');
    title.slot = "actions";
    await settled();
    expect(title.parentElement).toBe(part(el, "actions"));
    expect(isEmpty(el, "title")).toBe(true);
    expect(isEmpty(el, "actions")).toBe(false);
    title.removeAttribute("slot");
    await settled();
    expect(title.parentElement).toBe(part(el, "message"));
    expect(part(el, "message").textContent).toBe("BodyT");
    expect(isEmpty(el, "actions")).toBe(true);
    expect(card(el)).toBe(root);
  });

  it("moves a child whose slot changes in the same task as an attribute", async () => {
    const el = make(`<neuwo-notice><span slot="title">T</span>Body</neuwo-notice>`);
    const title = el.querySelector('[slot="title"]');
    title.slot = "actions";
    el.layout = "row";
    expect(title.parentElement).toBe(part(el, "actions"));
    await settled();
    expect(title.parentElement).toBe(part(el, "actions"));
    expect(isEmpty(el, "title")).toBe(true);
  });

  describe("on served markup adopted while the document is still loading", () => {
    afterEach(() => delete document.readyState);
    const loading = () => Object.defineProperty(document, "readyState", { configurable: true, get: () => "loading" });
    const parsed = () => {
      delete document.readyState;
      document.dispatchEvent(new Event("DOMContentLoaded"));
    };
    const served = () => {
      loading();
      return make(
        renderElement(
          "neuwo-notice",
          {},
          [
            { tag: "span", attrs: { slot: "title" }, text: "T", slot: "title", html: '<span slot="title">T</span>' },
            { tag: null, attrs: {}, text: "Body", slot: "default", html: "Body" },
            { tag: "button", attrs: { slot: "actions" }, text: "Go", slot: "actions", html: '<button slot="actions">Go</button>' },
          ],
          noticeTemplate,
          idScope("neuwo-s"),
        ),
      );
    };

    it("moves a child whose slot changed while it loads, once it has loaded", async () => {
      const el = served();
      const title = el.querySelector('[slot="title"]');
      title.slot = "actions";
      await settled();
      expect(title.parentElement).toBe(part(el, "title"));
      parsed();
      expect(title.parentElement).toBe(part(el, "actions"));
      expect(isEmpty(el, "title")).toBe(true);
    });

    it("restores --empty on a wrapper a script emptied while it loads, once it has loaded", async () => {
      const el = served();
      part(el, "actions").replaceChildren();
      await settled();
      expect(isEmpty(el, "actions")).toBe(false);
      parsed();
      expect(isEmpty(el, "actions")).toBe(true);
    });
  });

  it("restores --empty when a script empties a wrapper", async () => {
    const el = make(`<neuwo-notice><span slot="title">T</span>Body<button slot="actions">Go</button></neuwo-notice>`);
    const root = card(el);
    el.querySelector('[slot="title"]').remove();
    await settled();
    expect(isEmpty(el, "title")).toBe(true);
    part(el, "actions").replaceChildren();
    await settled();
    expect(isEmpty(el, "actions")).toBe(true);
    expect(isEmpty(el, "message")).toBe(false);
    expect(card(el)).toBe(root);
  });

  it("counts indented markup's whitespace as empty", () => {
    const el = make(`<neuwo-notice>
      <span slot="title">Only a headline</span>
    </neuwo-notice>`);
    expect(isEmpty(el, "title")).toBe(false);
    expect(isEmpty(el, "message")).toBe(true);
    expect(isEmpty(el, "actions")).toBe(true);
  });

  it("keeps a block-level title inside its wrapper through parsing, adoption and an attribute change", async () => {
    const heading = { tag: "h2", attrs: { slot: "title" }, text: "Cookies", slot: "title", html: '<h2 slot="title">Cookies</h2>' };
    const message = { tag: null, attrs: {}, text: "We use them.", slot: "default", html: "We use them." };
    const holder = document.createElement("div");
    holder.innerHTML = renderElement("neuwo-notice", {}, [heading, message], noticeTemplate, idScope("neuwo-s"));
    const h2 = holder.querySelector("h2");
    expect(h2.parentElement.className).toBe("neuwo-notice__title");
    const records = [];
    const observer = new MutationObserver((list) => records.push(...list));
    observer.observe(holder, { subtree: true, childList: true, attributes: true, characterData: true });
    attach(holder);
    await settled();
    records.push(...observer.takeRecords());
    observer.disconnect();
    expect(records).toEqual([]);

    const el = holder.firstElementChild;
    el.position = "top-end";
    await settled();
    expect(h2.isConnected).toBe(true);
    expect(h2.parentElement).toBe(part(el, "title"));
    expect(isEmpty(el, "title")).toBe(false);
    expect(part(el, "content").children).toHaveLength(2);
  });

  it("announces politely from the card unless the host declares a role, and never writes role onto the host", () => {
    const plain = make(`<neuwo-notice>Hint</neuwo-notice>`);
    expect(plain.hasAttribute("role")).toBe(false);
    expect(card(plain).getAttribute("role")).toBe("status");
    const dialog = make(`<neuwo-notice role="dialog" aria-label="Cookies">Hint</neuwo-notice>`);
    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(card(dialog).hasAttribute("role")).toBe(false);
    expect(card(dialog).hasAttribute("aria-label")).toBe(false);
  });

  it("hands the card's role over to a role a script sets on the host after render, and takes it back when removed", async () => {
    const el = make(`<neuwo-notice>Hint</neuwo-notice>`);
    const root = card(el);
    el.setAttribute("role", "dialog");
    await settled();
    expect(card(el)).toBe(root);
    expect(root.hasAttribute("role")).toBe(false);
    el.removeAttribute("role");
    await settled();
    expect(root.getAttribute("role")).toBe("status");
  });

  it("reflects every axis between property and attribute", () => {
    const el = make(`<neuwo-notice></neuwo-notice>`);
    expect(el.position).toBe("bottom-end");
    expect(el.layout).toBe("stack");
    expect(el.dismissible).toBe(false);
    expect(el.dismissLabel).toBe("Dismiss");
    el.position = "top-start";
    el.layout = "row";
    el.dismissible = true;
    el.dismissLabel = "Zamknij";
    expect(el.getAttribute("position")).toBe("top-start");
    expect(el.getAttribute("layout")).toBe("row");
    expect(el.hasAttribute("dismissible")).toBe(true);
    expect(el.getAttribute("dismiss-label")).toBe("Zamknij");
    el.position = "";
    el.layout = null;
    el.dismissLabel = "";
    expect(el.hasAttribute("position")).toBe(false);
    expect(el.hasAttribute("layout")).toBe(false);
    expect(el.hasAttribute("dismiss-label")).toBe(false);
    expect(el.position).toBe("bottom-end");
  });
});

describe("<neuwo-notice> under React", () => {
  it("updates the empty modifiers as a title child is added and removed, with no element writes and no console.error", async () => {
    const error = vi.spyOn(console, "error");
    const container = attach(document.createElement("div"));
    const root = createRoot(container);
    cleanup.push(() => root.unmount());
    const observer = new MutationObserver(() => {});
    observer.observe(container, { subtree: true, childList: true, attributes: true, characterData: true });
    cleanup.push(() => observer.disconnect());
    const tree = (title) =>
      jsxs("neuwo-notice", { dismissible: true, children: [title && jsx("span", { slot: "title", children: title }, "title"), "Message"] });

    const show = async (title) => {
      flushSync(() => root.render(tree(title)));
      expect(observer.takeRecords().length, `React wrote nothing for ${title}`).toBeGreaterThan(0);
      await settled();
      expect(observer.takeRecords(), `the element wrote after React rendered ${title}`).toEqual([]);
      expect(normalise(container.innerHTML)).toBe(normalise(renderToStaticMarkup(tree(title))));
      return container.firstElementChild;
    };

    const el = await show(null);
    expect(el).toBeInstanceOf(NeuwoNotice);
    const first = card(el);
    expect(isEmpty(el, "title")).toBe(true);
    expect(isEmpty(el, "message")).toBe(false);
    await show("Saved");
    expect(isEmpty(el, "title")).toBe(false);
    expect(part(el, "title").textContent).toBe("Saved");
    await show(null);
    expect(isEmpty(el, "title")).toBe(true);
    expect(card(el)).toBe(first);
    expect(el.hasAttribute("role")).toBe(false);
    expect(error).not.toHaveBeenCalled();
  });

  it("renders and hydrates a block-level title inside its wrapper with no nesting or hydration error", async () => {
    const error = vi.spyOn(console, "error");
    const tree = () => jsx("neuwo-notice", { children: jsx("h2", { slot: "title", children: "Cookies" }) });

    const rendered = attach(document.createElement("div"));
    const app = createRoot(rendered);
    cleanup.push(() => app.unmount());
    flushSync(() => app.render(tree()));
    expect(rendered.querySelector("h2").parentElement.className).toBe("neuwo-notice__title");

    const parsed = document.createElement("div");
    parsed.innerHTML = renderToString(tree());
    const h2 = parsed.querySelector("h2");
    expect(h2.parentElement.className).toBe("neuwo-notice__title");
    const hydrated = attach(document.createElement("div"));
    hydrated.append(...parsed.childNodes);
    const recoverable = [];
    const hydratedApp = hydrateRoot(hydrated, tree(), { onRecoverableError: (thrown) => void recoverable.push(String(thrown?.message ?? thrown)) });
    cleanup.push(() => hydratedApp.unmount());
    await vi.waitFor(() => expect(Object.keys(h2).some((key) => key.startsWith("__reactFiber$"))).toBe(true));
    expect(recoverable).toEqual([]);
    expect(hydrated.querySelector("h2")).toBe(h2);
    expect(error).not.toHaveBeenCalled();
  });

  it("runs ondismiss on markup React hydrates, from the first dismiss, so cancelling it keeps the card shown", async () => {
    const error = vi.spyOn(console, "error");
    const calls = [];
    const tree = () =>
      jsx("neuwo-notice", {
        dismissible: true,
        ondismiss: (event) => {
          event.preventDefault();
          calls.push(event.type);
        },
        children: "Hint",
      });
    const parsed = document.createElement("div");
    parsed.innerHTML = renderToString(tree());
    const container = attach(document.createElement("div"));
    container.append(...parsed.childNodes);
    const el = container.firstElementChild;
    expect(el).toBeInstanceOf(NeuwoNotice);
    const recoverable = [];
    let root;
    flushSync(() => {
      root = hydrateRoot(container, tree(), { onRecoverableError: (thrown) => void recoverable.push(String(thrown?.message ?? thrown)) });
    });
    cleanup.push(() => root.unmount());
    await vi.waitFor(() => expect(Object.keys(el).some((key) => key.startsWith("__reactFiber$"))).toBe(true));
    part(el, "dismiss").click();
    expect(calls).toEqual(["dismiss"]);
    expect(el.hidden).toBe(false);
    expect(el.dismiss()).toBe(false);
    expect(calls).toEqual(["dismiss", "dismiss"]);
    expect(recoverable).toEqual([]);
    expect(error).not.toHaveBeenCalled();
  });

  it("closes and reopens through state on markup React hydrates, as the documented pattern does", async () => {
    const error = vi.spyOn(console, "error");
    let reopen = () => {};
    function Hint() {
      const [open, setOpen] = useState(true);
      reopen = () => setOpen(true);
      return jsx("neuwo-notice", {
        dismissible: true,
        hidden: !open,
        ondismiss: (event) => {
          event.preventDefault();
          setOpen(false);
        },
        children: "Hint",
      });
    }
    const parsed = document.createElement("div");
    parsed.innerHTML = renderToString(jsx(Hint, {}));
    const container = attach(document.createElement("div"));
    container.append(...parsed.childNodes);
    const el = container.firstElementChild;
    let root;
    flushSync(() => {
      root = hydrateRoot(container, jsx(Hint, {}));
    });
    cleanup.push(() => root.unmount());
    await vi.waitFor(() => expect(Object.keys(el).some((key) => key.startsWith("__reactFiber$"))).toBe(true));
    for (let round = 0; round < 2; round++) {
      part(el, "dismiss").click();
      await vi.waitFor(() => expect(el.hidden).toBe(true));
      flushSync(() => reopen());
      expect(el.hidden).toBe(false);
    }
    expect(error).not.toHaveBeenCalled();
  });

  it("calls an ondismiss swapped on a re-render and not the old one, and stops when it goes", () => {
    const error = vi.spyOn(console, "error");
    const container = attach(document.createElement("div"));
    const root = createRoot(container);
    cleanup.push(() => root.unmount());
    const first = vi.fn((event) => event.preventDefault());
    const second = vi.fn((event) => event.preventDefault());
    const show = (ondismiss) => flushSync(() => root.render(jsx("neuwo-notice", { dismissible: true, ondismiss, children: "Hint" })));
    show(first);
    const el = container.firstElementChild;
    show(second);
    expect(el.dismiss()).toBe(false);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    show(undefined);
    expect(el.dismiss()).toBe(true);
    expect(second).toHaveBeenCalledOnce();
    expect(error).not.toHaveBeenCalled();
  });

  it("calls ondismiss, and a capture handler, exactly once per dismiss on a client render", () => {
    const error = vi.spyOn(console, "error");
    const container = attach(document.createElement("div"));
    const root = createRoot(container);
    cleanup.push(() => root.unmount());
    const calls = [];
    flushSync(() =>
      root.render(
        jsx("neuwo-notice", {
          dismissible: true,
          ondismiss: (event) => {
            event.preventDefault();
            calls.push("bubble");
          },
          ondismissCapture: () => calls.push("capture"),
          children: "Hint",
        }),
      ),
    );
    const el = container.firstElementChild;
    part(el, "dismiss").click();
    expect(calls).toEqual(["capture", "bubble"]);
    expect(el.dismiss()).toBe(false);
    expect(calls).toEqual(["capture", "bubble", "capture", "bubble"]);
    expect(error).not.toHaveBeenCalled();
  });

  it("closes and reopens through state when ondismiss cancels and hidden follows it", async () => {
    const error = vi.spyOn(console, "error");
    const container = attach(document.createElement("div"));
    const root = createRoot(container);
    cleanup.push(() => root.unmount());
    let reopen = () => {};
    function Hint() {
      const [open, setOpen] = useState(true);
      reopen = () => setOpen(true);
      return jsx("neuwo-notice", {
        dismissible: true,
        hidden: !open,
        ondismiss: (event) => {
          event.preventDefault();
          setOpen(false);
        },
        children: "Hint",
      });
    }

    flushSync(() => root.render(jsx(Hint, {})));
    const el = container.firstElementChild;
    expect(el.hidden).toBe(false);
    part(el, "dismiss").click();
    await vi.waitFor(() => expect(el.hidden).toBe(true));
    flushSync(() => reopen());
    expect(el.hidden).toBe(false);
    expect(error).not.toHaveBeenCalled();
  });
});
