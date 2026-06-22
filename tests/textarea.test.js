import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import "../src/components/fields/textarea/neuwo-textarea.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const textareaCss = readFileSync(
  join(__dirname, "../src/components/fields/textarea/textarea.css"),
  "utf8"
);

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild;
}

describe("<neuwo-textarea>", () => {
  it("renders a textarea with the input recipe and part", () => {
    const control = make(`<neuwo-textarea></neuwo-textarea>`).shadowRoot.querySelector("textarea");
    expect(control).toBeTruthy();
    expect(control.classList.contains("input")).toBe(true);
    expect(control.getAttribute("part")).toBe("input");
  });

  it("forwards rows to the textarea", () => {
    const control = make(`<neuwo-textarea rows="6"></neuwo-textarea>`).shadowRoot.querySelector("textarea");
    expect(control.getAttribute("rows")).toBe("6");
  });

  it("adds the multi-line recipe (min-height, vertical resize)", () => {
    expect(textareaCss).toContain("min-height");
    expect(textareaCss).toContain("resize: vertical");
  });
});
