import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import "../src/index.js";
import { compare, weight } from "./fixtures/specificity.js";

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../src/components/fields/field.css"), "utf8");
const FLASH = '[data-neuwo-state="error-flash"] > .neuwo-field > .neuwo-input';

const cleanup = [];
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  while (cleanup.length) cleanup.pop()();
  vi.useRealTimers();
});

/** @param {string} tag */
function field(tag, attributes = {}) {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  document.body.append(element);
  cleanup.push(() => element.remove());
  return element;
}

describe("flashError()", () => {
  it.each(["neuwo-input", "neuwo-textarea"])("shows the error look on a %s for 0.9 s, then returns it to rest", (tag) => {
    const element = field(tag);
    element.flashError();
    expect(element.getAttribute("data-neuwo-state")).toBe("error-flash");
    vi.advanceTimersByTime(899);
    expect(element.getAttribute("data-neuwo-state")).toBe("error-flash");
    vi.advanceTimersByTime(1);
    expect(element.hasAttribute("data-neuwo-state")).toBe(false);
  });

  it("prints no message and sets no invalid state", () => {
    const element = field("neuwo-input", { label: "URL" });
    element.flashError();
    expect(element.hasAttribute("error")).toBe(false);
    expect(element.querySelector(".neuwo-field__error").textContent).toBe("");
    expect(element.control.hasAttribute("aria-invalid")).toBe(false);
    expect(element.control.classList.contains("neuwo-input--error")).toBe(false);
  });

  it("keeps an error set while it shows", async () => {
    const element = field("neuwo-input");
    element.flashError();
    element.setAttribute("error", "Enter a URL");
    await Promise.resolve();
    vi.advanceTimersByTime(900);
    expect(element.getAttribute("error")).toBe("Enter a URL");
    expect(element.querySelector(".neuwo-field__error").textContent).toBe("Enter a URL");
    expect(element.control.classList.contains("neuwo-input--error")).toBe(true);
  });

  it("restarts when called again while it shows", () => {
    const element = field("neuwo-input");
    element.flashError();
    vi.advanceTimersByTime(600);
    element.flashError();
    vi.advanceTimersByTime(600);
    expect(element.getAttribute("data-neuwo-state")).toBe("error-flash");
    vi.advanceTimersByTime(300);
    expect(element.hasAttribute("data-neuwo-state")).toBe(false);
  });

  it("stops when the field leaves the document", () => {
    const element = field("neuwo-textarea");
    element.flashError();
    element.remove();
    expect(element.hasAttribute("data-neuwo-state")).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("belongs to the text fields only", () => {
    expect(typeof field("neuwo-combobox").flashError).toBe("undefined");
    expect(typeof field("neuwo-range").flashError).toBe("undefined");
  });
});

describe("field.css error flash", () => {
  it("draws the flash with the error's own declarations, so no project repeats them", () => {
    const rule = css.match(/^\.neuwo-input--error,\n(.+) \{([^}]*)\}/m);
    expect(rule?.[1]).toBe(FLASH);
    expect(rule?.[2]).toContain("border-color: var(--neuwo-color-red);");
    expect(rule?.[2]).toContain("box-shadow: var(--neuwo-shadow-danger);");
    expect(rule?.[2]).toContain("animation: neuwo-field-shake");
  });

  it("drops the shake of the flash under reduced motion, keeping the colours", () => {
    const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toMatch(new RegExp(`\\.neuwo-input--error,\\n\\s*${FLASH.replace(/[[\]().*+="]/g, "\\$&")} \\{\\s*animation: none;\\s*\\}`));
  });

  it("outweighs a field's focus, which the error does not", () => {
    expect(css).toMatch(/^\.neuwo-input:focus-visible \{/m);
    expect(compare(weight(FLASH), weight(".neuwo-input:focus-visible"))).toBeGreaterThan(0);
    expect(compare(weight(".neuwo-input--error"), weight(".neuwo-input:focus-visible"))).toBeLessThan(0);
  });
});
