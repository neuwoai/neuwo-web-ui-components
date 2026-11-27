import { afterEach, describe, expect, it, vi } from "vitest";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import "../src/index.js";
import { NeuwoSpinner } from "../src/components/spinner/neuwo-spinner.js";
import { DEFAULT_LABEL, spinnerTemplate } from "../src/components/spinner/spinner.template.js";
import { renderElement } from "../src/core/adapters/html.js";
import { idScope } from "../src/core/ids.js";
import { normalizeProps } from "../src/core/template.js";
import { jsx } from "../src/react/jsx-runtime.js";
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

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  return attach(host).firstElementChild;
}

const ring = (el) => el.querySelector(".neuwo-spinner");
const server = (attrs) => renderElement("neuwo-spinner", attrs, [], spinnerTemplate, idScope("neuwo-s"));

describe("<neuwo-spinner>", () => {
  it("renders one ring into its light DOM, with no shadow root and no part", () => {
    const el = make(`<neuwo-spinner></neuwo-spinner>`);
    expect(el).toBeInstanceOf(NeuwoSpinner);
    expect(el.shadowRoot).toBeNull();
    expect(el.children).toHaveLength(1);
    expect(ring(el).localName).toBe("span");
    expect(ring(el).className).toBe("neuwo-spinner");
    expect(ring(el).getAttribute("role")).toBe("progressbar");
    expect(ring(el).getAttribute("aria-label")).toBe("Loading");
    expect(ring(el).hasAttribute("part")).toBe(false);
    expect(el.textContent).toBe("");
  });

  it("reads its label default from the template's own", () => {
    const el = make(`<neuwo-spinner></neuwo-spinner>`);
    expect(DEFAULT_LABEL).toBe("Loading");
    expect(el.label).toBe(DEFAULT_LABEL);
  });

  it("reflects size and variant, removing the attribute for an empty value, and patches the same ring", () => {
    const el = make(`<neuwo-spinner></neuwo-spinner>`);
    const before = ring(el);
    expect([el.size, el.variant]).toEqual(["", ""]);
    el.size = "l";
    el.variant = "green";
    expect(el.getAttribute("size")).toBe("l");
    expect(el.getAttribute("variant")).toBe("green");
    expect(ring(el)).toBe(before);
    expect(ring(el).className).toBe("neuwo-spinner neuwo-spinner--l neuwo-spinner--green");
    el.size = "";
    el.variant = null;
    expect(el.hasAttribute("size")).toBe(false);
    expect(el.hasAttribute("variant")).toBe(false);
    expect(ring(el).className).toBe("neuwo-spinner");
  });

  it("takes a custom name from label", () => {
    const el = make(`<neuwo-spinner label="Loading results"></neuwo-spinner>`);
    expect(el.label).toBe("Loading results");
    expect(ring(el).getAttribute("aria-label")).toBe("Loading results");
  });

  it("goes decorative when the label is emptied after render, and back again on null", () => {
    const el = make(`<neuwo-spinner></neuwo-spinner>`);
    const before = ring(el);
    el.label = "";
    expect(el.getAttribute("label")).toBe("");
    expect(ring(el)).toBe(before);
    expect(ring(el).getAttribute("aria-hidden")).toBe("true");
    expect(ring(el).hasAttribute("role")).toBe(false);
    expect(ring(el).hasAttribute("aria-label")).toBe(false);
    el.label = null;
    expect(el.hasAttribute("label")).toBe(false);
    expect(ring(el).getAttribute("role")).toBe("progressbar");
    expect(ring(el).getAttribute("aria-label")).toBe("Loading");
    expect(ring(el).hasAttribute("aria-hidden")).toBe(false);
  });

  it("keeps title and aria-* on the host alone", () => {
    const el = make(`<neuwo-spinner title="Busy" aria-label="Busy" data-x="1"></neuwo-spinner>`);
    expect(ring(el).getAttributeNames()).toEqual(["class", "role", "aria-label"]);
  });

  it("adopts server markup without a single mutation", async () => {
    const holder = document.createElement("div");
    holder.innerHTML = server({ size: "l", variant: "blue", label: "Loading results" });
    const records = [];
    const observer = new MutationObserver((list) => records.push(...list));
    observer.observe(holder, { subtree: true, childList: true, attributes: true, characterData: true });
    attach(holder);
    await Promise.resolve();
    records.push(...observer.takeRecords());
    observer.disconnect();
    expect(records).toEqual([]);
    expect(holder.querySelectorAll(".neuwo-spinner")).toHaveLength(1);
  });
});

describe("<neuwo-spinner> under React", () => {
  it("matches spinnerTemplate through every re-render, with no React warning", () => {
    const error = vi.spyOn(console, "error");
    const warn = vi.spyOn(console, "warn");
    const container = attach(document.createElement("div"));
    const root = createRoot(container);
    cleanup.push(() => root.unmount());

    const show = (props) => {
      flushSync(() => root.render(jsx("neuwo-spinner", props)));
      expect(container.firstElementChild).toBeInstanceOf(NeuwoSpinner);
      expect(normalise(container.innerHTML, false)).toBe(normalise(server(normalizeProps(props)), true));
      return ring(container.firstElementChild);
    };

    const first = show({});
    expect(show({ size: "m", variant: "blue" })).toBe(first);
    expect(show({ label: "" }).getAttribute("aria-hidden")).toBe("true");
    expect(show({ label: "Loading results" }).getAttribute("aria-label")).toBe("Loading results");

    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
