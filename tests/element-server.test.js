// @vitest-environment node
import { expect, it } from "vitest";

it("imports without HTMLElement or customElements", async () => {
  expect(globalThis.HTMLElement).toBeUndefined();
  expect(globalThis.customElements).toBeUndefined();
  const mod = await import("../src/core/element.js");
  expect(typeof mod.NeuwoElement).toBe("function");
  expect(() => mod.define("x-server", mod.NeuwoElement)).not.toThrow();
});
