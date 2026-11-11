import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushSync } from "react-dom";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import "../src/index.js";
import { NeuwoCopy } from "../src/components/copy/neuwo-copy.js";
import { copyTemplate } from "../src/components/copy/copy.template.js";
import { renderElement } from "../src/core/adapters/html.js";
import { idScope } from "../src/core/ids.js";
import { jsx } from "../src/react/jsx-runtime.js";

const SAMPLE = "const topics = await neuwo.classify(url);";
const CODE = `<neuwo-copy>
  <pre><code>${SAMPLE}</code></pre>
</neuwo-copy>`;

const cleanup = [];
let writeText;

beforeEach(() => {
  writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
  vi.useFakeTimers();
});

afterEach(() => {
  while (cleanup.length) cleanup.pop()();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function attach(node) {
  document.body.appendChild(node);
  cleanup.push(() => node.remove());
  return node;
}

function make(html) {
  const holder = document.createElement("div");
  holder.innerHTML = html;
  return attach(holder).firstElementChild;
}

const part = (el, name) => el.querySelector(`:scope > .neuwo-copy > .neuwo-copy__${name}`);

describe("<neuwo-copy>", () => {
  it("registers the element", () => {
    expect(customElements.get("neuwo-copy")).toBe(NeuwoCopy);
  });

  // Reading and tab order follow the visual order, so the control comes after
  // the content it acts on.
  it("renders into its light DOM, the content wrapper before the control and the live region", () => {
    const el = make(CODE);
    expect(el.shadowRoot).toBeNull();
    expect(el.children).toHaveLength(1);
    const root = el.firstElementChild;
    expect(root.className).toBe("neuwo-copy");
    expect(Array.from(root.children, (child) => child.className)).toEqual(["neuwo-copy__content", "neuwo-copy__button", "neuwo-copy__status"]);
    expect(part(el, "content").querySelector("pre code").textContent).toBe(SAMPLE);
  });

  it("renders a named button with no part, and a polite live region that is empty at rest", () => {
    const el = make(CODE);
    const button = part(el, "button");
    expect(button.localName).toBe("button");
    expect(button.type).toBe("button");
    expect(button.getAttribute("aria-label")).toBe("Copy");
    expect(button.hasAttribute("part")).toBe(false);
    const status = part(el, "status");
    expect(status.getAttribute("role")).toBe("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.childNodes).toHaveLength(0);
    expect(el.hasAttribute("data-neuwo-state")).toBe(false);
  });

  // The newline and spaces around the nested <pre> are the author's formatting,
  // not part of the sample.
  it("keeps indented markup's whitespace inside the content wrapper and copies the text trimmed of it", async () => {
    const el = make(CODE);
    const content = part(el, "content");
    expect(content.firstChild.nodeType).toBe(Node.TEXT_NODE);
    expect(content.firstChild.data.trim()).toBe("");
    expect(el.text).toBe(SAMPLE);
    await el.copy();
    expect(writeText).toHaveBeenCalledWith(SAMPLE);
  });

  it("copies on a click on the control, and not on a click in the content", async () => {
    const el = make(CODE);
    el.querySelector("pre").click();
    await Promise.resolve();
    expect(writeText).not.toHaveBeenCalled();
    part(el, "button").click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    expect(writeText).toHaveBeenCalledWith(SAMPLE);
  });

  it("shows the tick through the host attribute and announces in the status wrapper, then clears both after 1200 ms", async () => {
    const el = make(CODE);
    expect(await el.copy()).toBe(true);
    expect(el.getAttribute("data-neuwo-state")).toBe("copied");
    const status = part(el, "status");
    expect(status.childNodes).toHaveLength(1);
    expect(status.firstChild.nodeType).toBe(Node.TEXT_NODE);
    expect(status.textContent).toBe("Copied");

    vi.advanceTimersByTime(1199);
    expect(el.getAttribute("data-neuwo-state")).toBe("copied");
    vi.advanceTimersByTime(1);
    expect(el.hasAttribute("data-neuwo-state")).toBe(false);
    expect(status.childNodes).toHaveLength(0);
  });

  it("copies only the content on a second copy inside the window, and restarts the window", async () => {
    const el = make(CODE);
    await el.copy();
    expect(el.textContent).toContain("Copied");
    vi.advanceTimersByTime(600);
    await el.copy();
    expect(writeText).toHaveBeenNthCalledWith(2, SAMPLE);
    expect(part(el, "status").textContent).toBe("Copied");
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(1199);
    expect(el.getAttribute("data-neuwo-state")).toBe("copied");
    vi.advanceTimersByTime(1);
    expect(el.hasAttribute("data-neuwo-state")).toBe(false);
  });

  it("shows exactly one announcement through rapid copies inside the window, whatever their outcome", async () => {
    const el = make(CODE);
    await el.copy();
    writeText.mockRejectedValueOnce(new Error("denied"));
    await el.copy();
    await el.copy();
    const status = part(el, "status");
    expect(status.childNodes).toHaveLength(1);
    expect(status.firstChild.nodeType).toBe(Node.TEXT_NODE);
    expect(status.textContent).toBe("Copied");
  });

  it("leaves author content in the status region alone through a copy and the reset", async () => {
    const el = make('<neuwo-copy><pre>x</pre><span slot="status">AUTHOR</span></neuwo-copy>');
    const author = el.querySelector('[slot="status"]');
    expect(author.parentElement).toBe(part(el, "status"));
    await el.copy();
    expect(author.parentElement).toBe(part(el, "status"));
    expect(part(el, "status").textContent).toBe("AUTHORCopied");
    vi.advanceTimersByTime(1200);
    expect(author.parentElement).toBe(part(el, "status"));
    expect(part(el, "status").textContent).toBe("AUTHOR");
  });

  it("reports a refused clipboard without claiming success", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    const el = make(CODE);
    const onCopied = vi.fn();
    el.addEventListener("copied", onCopied);

    expect(await el.copy()).toBe(false);
    expect(el.getAttribute("data-neuwo-state")).toBe("failed");
    expect(part(el, "status").textContent).toBe("Copying failed");
    expect(onCopied).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1200);
    expect(el.hasAttribute("data-neuwo-state")).toBe(false);
    expect(part(el, "status").textContent).toBe("");
  });

  it("fires copied with the written text, bubbling to the document", async () => {
    const el = make(CODE);
    const onCopied = vi.fn();
    document.addEventListener("copied", onCopied);
    cleanup.push(() => document.removeEventListener("copied", onCopied));

    expect(await el.copy()).toBe(true);
    expect(onCopied).toHaveBeenCalledOnce();
    const event = onCopied.mock.calls[0][0];
    expect(event.target).toBe(el);
    expect(event.detail.text).toBe(SAMPLE);
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
  });

  it("names the control, and takes the consumer's language for every string", async () => {
    const el = make(`<neuwo-copy label="Kopioi" copied-label="Kopioitu" failed-label="Kopiointi ei onnistunut"><pre>x</pre></neuwo-copy>`);
    expect(part(el, "button").getAttribute("aria-label")).toBe("Kopioi");
    await el.copy();
    expect(part(el, "status").textContent).toBe("Kopioitu");
    writeText.mockRejectedValue(new Error("denied"));
    await el.copy();
    expect(part(el, "status").textContent).toBe("Kopiointi ei onnistunut");
  });

  it("reflects each label property to its attribute", () => {
    const el = make(`<neuwo-copy><pre>x</pre></neuwo-copy>`);
    el.label = "Kopioi";
    expect(el.getAttribute("label")).toBe("Kopioi");
    el.copiedLabel = "Kopioitu";
    expect(el.getAttribute("copied-label")).toBe("Kopioitu");
    el.failedLabel = "Ei onnistunut";
    expect(el.getAttribute("failed-label")).toBe("Ei onnistunut");

    el.label = "";
    expect(el.hasAttribute("label")).toBe(false);
    expect(el.label).toBe("Copy");
    expect(el.copiedLabel).toBe("Kopioitu");
    el.copiedLabel = null;
    expect(el.copiedLabel).toBe("Copied");
    el.failedLabel = null;
    expect(el.failedLabel).toBe("Copying failed");
  });

  it("keeps the control and the announcement across a label change inside the window", async () => {
    const el = make(CODE);
    const button = part(el, "button");
    await el.copy();
    el.label = "Kopioi";
    await Promise.resolve();
    expect(part(el, "button")).toBe(button);
    expect(button.getAttribute("aria-label")).toBe("Kopioi");
    expect(el.getAttribute("data-neuwo-state")).toBe("copied");
    expect(part(el, "status").textContent).toBe("Copied");
  });

  it("clears the timer, the attribute and the announcement when removed inside the window, and copies again once back", async () => {
    const el = make(CODE);
    await el.copy();
    expect(vi.getTimerCount()).toBe(1);
    el.remove();
    expect(vi.getTimerCount()).toBe(0);
    expect(el.hasAttribute("data-neuwo-state")).toBe(false);
    expect(part(el, "status").childNodes).toHaveLength(0);

    attach(el);
    part(el, "button").click();
    await vi.waitFor(() => expect(el.getAttribute("data-neuwo-state")).toBe("copied"));
    expect(writeText).toHaveBeenCalledTimes(2);
  });

  it("copies from server markup it adopted without a mutation, through the delegated click", async () => {
    const text = (value) => ({ tag: null, attrs: {}, text: value, slot: "default", html: value });
    const pre = { tag: "pre", attrs: {}, text: SAMPLE, slot: "default", html: `<pre>${SAMPLE}</pre>` };
    const holder = document.createElement("div");
    holder.innerHTML = renderElement("neuwo-copy", {}, [text("\n  "), pre, text("\n")], copyTemplate, idScope("neuwo-s"));
    const records = [];
    const observer = new MutationObserver((list) => records.push(...list));
    observer.observe(holder, { subtree: true, childList: true, attributes: true, characterData: true });
    attach(holder);
    await Promise.resolve();
    records.push(...observer.takeRecords());
    observer.disconnect();
    expect(records).toEqual([]);

    const el = holder.firstElementChild;
    expect(el).toBeInstanceOf(NeuwoCopy);
    part(el, "button").click();
    await vi.waitFor(() => expect(part(el, "status").textContent).toBe("Copied"));
    expect(writeText).toHaveBeenCalledWith(SAMPLE);
  });

  it("copies the text a script set after render", async () => {
    const el = make(CODE);
    el.textContent = "npm test";
    await Promise.resolve();
    expect(part(el, "content").textContent).toBe("npm test");
    part(el, "button").click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("npm test"));
  });

  it("copies its own text before it has rendered", async () => {
    const el = document.createElement("neuwo-copy");
    el.innerHTML = "\n  <pre>never connected</pre>\n";
    const onCopied = vi.fn();
    el.addEventListener("copied", onCopied);
    expect(await el.copy()).toBe(true);
    expect(writeText).toHaveBeenCalledWith("never connected");
    expect(onCopied.mock.calls[0][0].detail.text).toBe("never connected");
  });

  it.each([
    ["rendered", () => make("<neuwo-copy>\n  \n</neuwo-copy>")],
    ["never rendered", () => document.createElement("neuwo-copy")],
  ])("reports failure when there is no text to copy, %s, and writes and fires nothing", async (_, create) => {
    const el = create();
    const onCopied = vi.fn();
    el.addEventListener("copied", onCopied);
    expect(await el.copy()).toBe(false);
    expect(writeText).not.toHaveBeenCalled();
    expect(onCopied).not.toHaveBeenCalled();
    expect(el.getAttribute("data-neuwo-state")).toBe("failed");
    if (el.isConnected) expect(part(el, "status").textContent).toBe("Copying failed");
  });

  it("leaves a nested wrapper's announcement out of the outer wrapper's text", async () => {
    const outer = make("<neuwo-copy><p>Outer</p><neuwo-copy><pre>inner</pre></neuwo-copy></neuwo-copy>");
    const inner = outer.querySelector("neuwo-copy");
    await inner.copy();
    expect(part(inner, "status").textContent).toBe("Copied");
    expect(outer.text).toBe("Outerinner");
    await outer.copy();
    expect(writeText).toHaveBeenLastCalledWith("Outerinner");
  });

  it("drives only its own wrapper when copy wrappers nest", async () => {
    const outer = make(`<neuwo-copy><p>Outer</p><neuwo-copy><pre>inner</pre></neuwo-copy></neuwo-copy>`);
    const inner = outer.querySelector("neuwo-copy");
    part(inner, "button").click();
    await vi.waitFor(() => expect(inner.getAttribute("data-neuwo-state")).toBe("copied"));
    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith("inner");
    expect(part(inner, "status").textContent).toBe("Copied");
    expect(outer.hasAttribute("data-neuwo-state")).toBe(false);
    expect(part(outer, "status").textContent).toBe("");
  });
});

// An insecure context leaves navigator.clipboard undefined, which the markup cannot know.
describe("<neuwo-copy> without a clipboard", () => {
  let clipboard;

  beforeEach(() => {
    clipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", { value: clipboard, configurable: true });
  });

  it("renders the control, and a click announces the failure", async () => {
    const el = make(CODE);
    expect(part(el, "button")).not.toBeNull();
    part(el, "button").click();
    await vi.waitFor(() => expect(el.getAttribute("data-neuwo-state")).toBe("failed"));
    expect(part(el, "status").textContent).toBe("Copying failed");
  });

  it("reports failure from a programmatic copy instead of throwing", async () => {
    const el = make(CODE);
    const onCopied = vi.fn();
    el.addEventListener("copied", onCopied);
    await expect(el.copy()).resolves.toBe(false);
    expect(onCopied).not.toHaveBeenCalled();
  });
});

describe("<neuwo-copy> under React", () => {
  it("shows the status after a click, keeps it across a re-render and fires oncopied, with no console.error", async () => {
    const error = vi.spyOn(console, "error");
    const container = attach(document.createElement("div"));
    const root = createRoot(container);
    cleanup.push(() => root.unmount());
    const onCopied = vi.fn();
    const show = (props) =>
      flushSync(() => root.render(jsx("neuwo-copy", { ...props, oncopied: onCopied, children: jsx("pre", { children: "npm install" }) })));

    show({});
    const el = container.firstElementChild;
    expect(el).toBeInstanceOf(NeuwoCopy);
    part(el, "button").click();
    await vi.waitFor(() => expect(part(el, "status").textContent).toBe("Copied"));
    expect(writeText).toHaveBeenCalledWith("npm install");
    expect(el.getAttribute("data-neuwo-state")).toBe("copied");
    expect(onCopied).toHaveBeenCalledOnce();
    expect(onCopied.mock.calls[0][0].detail.text).toBe("npm install");

    show({ label: "Kopioi" });
    expect(part(el, "button").getAttribute("aria-label")).toBe("Kopioi");
    expect(part(el, "status").textContent).toBe("Copied");

    vi.advanceTimersByTime(1200);
    expect(el.hasAttribute("data-neuwo-state")).toBe(false);
    expect(part(el, "status").textContent).toBe("");
    show({});
    expect(part(el, "button").getAttribute("aria-label")).toBe("Copy");
    expect(error).not.toHaveBeenCalled();
  });

  it("runs oncopied on markup React hydrates, from the first copy", async () => {
    const error = vi.spyOn(console, "error");
    const onCopied = vi.fn();
    const tree = () => jsx("neuwo-copy", { oncopied: onCopied, children: jsx("pre", { children: "npm install" }) });
    const parsed = document.createElement("div");
    parsed.innerHTML = renderToString(tree());
    const container = attach(document.createElement("div"));
    container.append(...parsed.childNodes);
    const el = container.firstElementChild;
    expect(el).toBeInstanceOf(NeuwoCopy);
    let root;
    flushSync(() => {
      root = hydrateRoot(container, tree());
    });
    cleanup.push(() => root.unmount());
    await vi.waitFor(() => expect(Object.keys(el).some((key) => key.startsWith("__reactFiber$"))).toBe(true));
    part(el, "button").click();
    await vi.waitFor(() => expect(el.getAttribute("data-neuwo-state")).toBe("copied"));
    expect(onCopied).toHaveBeenCalledOnce();
    expect(onCopied.mock.calls[0][0].detail.text).toBe("npm install");
    expect(error).not.toHaveBeenCalled();
  });

  it("lets React change and remove a status child while the announcement shows, with no error", async () => {
    const error = vi.spyOn(console, "error");
    const container = attach(document.createElement("div"));
    const root = createRoot(container);
    cleanup.push(() => root.unmount());
    const show = (message) =>
      flushSync(() =>
        root.render(jsx("neuwo-copy", { children: [jsx("pre", { children: "x" }, "code"), message && jsx("span", { slot: "status", children: message }, "note")] })),
      );

    show("hi");
    const el = container.firstElementChild;
    part(el, "button").click();
    await vi.waitFor(() => expect(el.getAttribute("data-neuwo-state")).toBe("copied"));
    expect(part(el, "status").textContent).toBe("hiCopied");
    expect(() => show("bye")).not.toThrow();
    expect(part(el, "status").textContent).toBe("byeCopied");
    expect(() => show(null)).not.toThrow();
    expect(part(el, "status").textContent).toBe("Copied");
    vi.advanceTimersByTime(1200);
    expect(part(el, "status").childNodes).toHaveLength(0);
    expect(() => show("again")).not.toThrow();
    expect(part(el, "status").textContent).toBe("again");
    expect(error).not.toHaveBeenCalled();
  });
});
