import { afterEach, describe, expect, it, vi } from "vitest";
import { Window } from "happy-dom";
import { act } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import "../src/index.js";
import { NeuwoTextarea } from "../src/components/fields/textarea/neuwo-textarea.js";
import { NeuwoFieldElement } from "../src/components/fields/field-element.js";
import { expand } from "../src/server/index.js";
import { jsx } from "../src/react/jsx-runtime.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(__dirname, path), "utf8");
const textareaCss = read("../src/components/fields/textarea/textarea.css");
const resetCss = read("../src/components/reset.css");

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
  const holder = document.createElement("div");
  holder.innerHTML = html;
  return attach(holder).firstElementChild;
}

const areaOf = (el) => el.querySelector(":scope > .neuwo-field > .neuwo-input");

/** @param {HTMLTextAreaElement} control @param {string} value */
function type(control, value) {
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(control, value);
  control.dispatchEvent(new Event("input", { bubbles: true }));
}

// A browser's parser drops the newline right after `<textarea>`; happy-dom's does not.
const parsedValue = (control) => (control.value.startsWith("\n") ? control.value.slice(1) : control.value);

const VALUES = ["\nlead", "a</textarea>b", "x & y < z", "line one\nline two"];

describe("<neuwo-textarea>", () => {
  it("registers a light DOM field element with a native textarea carrying the multi-line class", () => {
    expect(customElements.get("neuwo-textarea")).toBe(NeuwoTextarea);
    expect(Object.getPrototypeOf(NeuwoTextarea)).toBe(NeuwoFieldElement);
    const el = make(`<neuwo-textarea></neuwo-textarea>`);
    expect(el.shadowRoot).toBeNull();
    const control = areaOf(el);
    expect(control.localName).toBe("textarea");
    expect(control.classList.contains("neuwo-input")).toBe(true);
    expect(control.classList.contains("neuwo-textarea")).toBe(true);
    expect(el.querySelector("[part]")).toBeNull();
  });

  it("forwards rows, minlength and maxlength to the textarea", () => {
    const control = areaOf(make(`<neuwo-textarea rows="6" minlength="2" maxlength="40" name="m" placeholder="p"></neuwo-textarea>`));
    expect(control.getAttribute("rows")).toBe("6");
    expect(control.getAttribute("minlength")).toBe("2");
    expect(control.getAttribute("maxlength")).toBe("40");
    expect(control.getAttribute("name")).toBe("m");
    expect(control.getAttribute("placeholder")).toBe("p");
  });

  it("never gives the textarea a value attribute; the value is its text", () => {
    const el = make(`<neuwo-textarea value="seed"></neuwo-textarea>`);
    expect(areaOf(el).hasAttribute("value")).toBe(false);
    expect(areaOf(el).textContent).toBe("seed");
    expect(areaOf(el).value).toBe("seed");
    expect(el.value).toBe("seed");
  });

  it("keeps the value property live, while the value attribute moves only a clean textarea", () => {
    const el = make(`<neuwo-textarea value="a"></neuwo-textarea>`);
    const control = areaOf(el);
    el.setAttribute("value", "b");
    expect(control.value).toBe("b");
    expect(el.defaultValue).toBe("b");
    type(control, "typed");
    expect(el.value).toBe("typed");
    el.setAttribute("value", "c");
    expect(control.defaultValue).toBe("c");
    expect(control.value).toBe("typed");
  });

  it("returns to the value attribute when its form resets", () => {
    const form = make(`<form><neuwo-textarea name="m" value="seed"></neuwo-textarea></form>`);
    const el = form.querySelector("neuwo-textarea");
    type(areaOf(el), "typed");
    form.reset();
    expect(el.value).toBe("seed");
  });

  it("submits through FormData under its name, and reports required through checkValidity", () => {
    const form = make(`<form><neuwo-textarea name="m" value="one\ntwo"></neuwo-textarea><neuwo-textarea name="r" required></neuwo-textarea></form>`);
    expect([...new FormData(form)]).toEqual([
      ["m", "one\ntwo"],
      ["r", ""],
    ]);
    const required = form.querySelector("[required]");
    expect(required.checkValidity()).toBe(false);
    type(areaOf(required), "x");
    expect(required.checkValidity()).toBe(true);
  });

  it("submits through the native textarea before the script loads", () => {
    const page = new Window();
    cleanup.push(() => page.happyDOM.close());
    page.document.body.innerHTML = expand(
      `<form><neuwo-textarea name="m" value="a\nb"></neuwo-textarea><neuwo-textarea name="q" value="a</textarea>b"></neuwo-textarea></form>`,
    );
    expect(page.customElements.get("neuwo-textarea")).toBeUndefined();
    expect([...new page.FormData(page.document.querySelector("form"))]).toEqual([
      ["m", "a\nb"],
      ["q", "a</textarea>b"],
    ]);
  });

  it("writes one extra newline after the opening tag of a value that starts with one, as React's server renderer does", () => {
    const html = expand(`<neuwo-textarea value="&#10;lead"></neuwo-textarea>`);
    expect(html).toMatch(/<textarea[^>]*>\n\nlead<\/textarea>/);
    expect(expand(`<neuwo-textarea value="lead"></neuwo-textarea>`)).toMatch(/<textarea[^>]*>lead<\/textarea>/);
    expect(renderToString(jsx("neuwo-textarea", { value: "\nlead", onChange() {} }))).toMatch(/<textarea[^>]*>\n\nlead<\/textarea>/);
  });

  it("forwards aria-* and title and focuses the inner textarea, leaving data-* on the element", () => {
    const el = make(`<neuwo-textarea aria-label="Message" title="Msg" data-x="1"></neuwo-textarea>`);
    expect(areaOf(el).getAttribute("aria-label")).toBe("Message");
    expect(areaOf(el).getAttribute("title")).toBe("Msg");
    expect(areaOf(el).hasAttribute("data-x")).toBe(false);
    el.focus();
    expect(document.activeElement).toBe(areaOf(el));
  });

  it("keeps the first line break of a value that starts with a carriage return through server markup", () => {
    for (const [value, reference] of [
      ["\r\nlead", "&#13;&#10;lead"],
      ["\rlead", "&#13;lead"],
    ]) {
      const html = expand(`<neuwo-textarea value="${reference}"></neuwo-textarea>`);
      expect(html, JSON.stringify(value)).toMatch(/<textarea[^>]*>\n\nlead<\/textarea>/);
      // A browser's parser turns every CR LF and lone CR into LF before it drops the newline after the tag.
      const parsed = new DOMParser().parseFromString(html.replace(/\r\n?/g, "\n"), "text/html");
      expect(parsedValue(areaOf(parsed.body.firstElementChild)), JSON.stringify(value)).toBe("\nlead");
      expect(renderToString(jsx("neuwo-textarea", { defaultValue: value })), JSON.stringify(value)).toMatch(/<textarea[^>]*>\n\nlead<\/textarea>/);
    }
  });

  describe("round trip of a value through every adapter", () => {
    for (const value of VALUES) {
      it(`keeps ${JSON.stringify(value)}`, async () => {
        const html = expand(`<neuwo-textarea value="${value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")}"></neuwo-textarea>`);
        const parsed = new DOMParser().parseFromString(html, "text/html");
        expect(parsedValue(areaOf(parsed.body.firstElementChild))).toBe(value);

        const rendered = make(`<neuwo-textarea></neuwo-textarea>`);
        rendered.setAttribute("value", value);
        expect(areaOf(rendered).value).toBe(value);

        const errors = vi.spyOn(console, "error");
        const tree = () => jsx("neuwo-textarea", { value, onChange() {} });
        const holder = document.createElement("div");
        holder.innerHTML = renderToString(tree());
        const container = attach(document.createElement("div"));
        container.append(...holder.childNodes);
        const control = areaOf(container.querySelector("neuwo-textarea"));
        expect(parsedValue(control)).toBe(value);
        const recoverable = [];
        let root;
        await act(async () => {
          root = hydrateRoot(container, tree(), { onRecoverableError: (thrown) => void recoverable.push(String(thrown?.message ?? thrown)) });
        });
        cleanup.push(() => act(() => root.unmount()));
        expect(recoverable).toEqual([]);
        expect(areaOf(container.querySelector("neuwo-textarea"))).toBe(control);
        expect(control.value).toBe(value);
        expect(errors).not.toHaveBeenCalled();
      });
    }
  });
});

describe("textarea recipe", () => {
  it("sizes and resizes only the textarea, on its own class", () => {
    expect(textareaCss).toMatch(/\.neuwo-textarea\s*\{[^}]*min-height:\s*8rem;[^}]*resize:\s*vertical;/);
    expect(textareaCss).not.toMatch(/(^|[\s,}])\.input\b/);
    expect(textareaCss).not.toMatch(/:host/);
  });

  it("is in the reset's tag and block lists", () => {
    expect(resetCss).toContain("neuwo-textarea)");
    expect(resetCss).toContain('[class^="neuwo-textarea"], [class*=" neuwo-textarea"]');
  });
});
