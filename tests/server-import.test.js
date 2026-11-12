// @vitest-environment node
import { expect, it } from "vitest";
import { distFile } from "./setup/dist.js";

it("imports the lean entry without a DOM", async () => {
  expect(globalThis.document).toBeUndefined();
  await expect(import("../src/index.js")).resolves.toHaveProperty("NeuwoButton");
});

it("imports the bundler entry without a DOM", async () => {
  await expect(import(distFile("bundler/neuwo.js"))).resolves.toHaveProperty("NeuwoButton");
});

it("applies no stylesheet without a document", async () => {
  const { applyComponentsStylesheet } = await import("../src/core/stylesheet.js");
  expect(applyComponentsStylesheet(":root { --neuwo-components: 1; }")).toBe(false);
});
