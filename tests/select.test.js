import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import "../src/components/fields/select/neuwo-select.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const selectCss = readFileSync(
  join(__dirname, "../src/components/fields/select/select.css"),
  "utf8"
);

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild;
}

describe("<neuwo-select>", () => {
  it("clones light-DOM options into the inner select", () => {
    const el = make(
      `<neuwo-select><option value="a">A</option><option value="b">B</option></neuwo-select>`
    );
    const select = el.shadowRoot.querySelector("select");
    expect(select.getAttribute("part")).toBe("input");
    expect(select.querySelectorAll("option").length).toBe(2);
  });

  it("selects the option named by the value attribute", () => {
    const el = make(
      `<neuwo-select value="b"><option value="a">A</option><option value="b">B</option></neuwo-select>`
    );
    expect(el.shadowRoot.querySelector("select").value).toBe("b");
    expect(el.value).toBe("b");
  });

  it("renders a masked chevron coloured from a token", () => {
    const el = make(`<neuwo-select><option>A</option></neuwo-select>`);
    expect(el.shadowRoot.querySelector(".select__chevron")).toBeTruthy();
    expect(selectCss).toContain("background-color: var(--color-text-muted)");
    expect(selectCss).toContain("mask:");
  });
});
