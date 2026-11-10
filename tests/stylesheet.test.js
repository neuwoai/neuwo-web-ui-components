import { beforeEach, describe, expect, it, vi } from "vitest";

const CSS = ":root { --neuwo-components: 1; } .neuwo-x { color: red; }";

describe("applyComponentsStylesheet", () => {
  beforeEach(() => {
    document.head.replaceChildren();
    document.adoptedStyleSheets = [];
    vi.resetModules();
  });

  it("adopts the sheet when the page links none", async () => {
    const { applyComponentsStylesheet } = await import("../src/core/stylesheet.js");
    const before = document.adoptedStyleSheets.length;
    expect(applyComponentsStylesheet(CSS)).toBe(true);
    expect(document.adoptedStyleSheets.length).toBe(before + 1);
  });

  it("adopts nothing when a linked sheet already carries the marker", async () => {
    const style = document.createElement("style");
    style.textContent = ":root{--neuwo-components:1}";
    document.head.append(style);
    const { applyComponentsStylesheet } = await import("../src/core/stylesheet.js");
    expect(applyComponentsStylesheet(CSS)).toBe(false);
    expect(document.adoptedStyleSheets).toHaveLength(0);
  });

  it("adopts once however often it is called", async () => {
    const { applyComponentsStylesheet } = await import("../src/core/stylesheet.js");
    applyComponentsStylesheet(CSS);
    expect(applyComponentsStylesheet(CSS)).toBe(false);
    expect(document.adoptedStyleSheets).toHaveLength(1);
  });
});
