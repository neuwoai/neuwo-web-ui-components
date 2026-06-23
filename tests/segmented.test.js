import { describe, expect, it } from "vitest";
import "../src/components/selection/segmented/neuwo-segmented.js";

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild;
}
const OPTS = `<option value="visual">Visual</option><option value="json">JSON</option><option value="raw" disabled>Raw</option>`;
function options(el) { return [...el.shadowRoot.querySelectorAll(".segmented__option")]; }

describe("<neuwo-segmented>", () => {
  it("renders a radiogroup of button options from <option> children", () => {
    const el = make(`<neuwo-segmented label="View">${OPTS}</neuwo-segmented>`);
    const group = el.shadowRoot.querySelector(".segmented");
    expect(group.getAttribute("role")).toBe("radiogroup");
    expect(group.getAttribute("aria-label")).toBe("View");
    const opts = options(el);
    expect(opts.length).toBe(3);
    expect(opts.every((b) => b.getAttribute("role") === "radio")).toBe(true);
  });

  it("is form-associated", () => {
    expect(make(`<neuwo-segmented>${OPTS}</neuwo-segmented>`).constructor.formAssociated).toBe(true);
  });

  it("marks the selected option aria-checked, exclusively", () => {
    const el = make(`<neuwo-segmented value="json">${OPTS}</neuwo-segmented>`);
    const checked = options(el).filter((b) => b.getAttribute("aria-checked") === "true");
    expect(checked.length).toBe(1);
    expect(checked[0].dataset.value).toBe("json");
  });

  it("seeds value from <option selected>", () => {
    const el = make(`<neuwo-segmented><option value="a">A</option><option value="b" selected>B</option></neuwo-segmented>`);
    expect(el.value).toBe("b");
  });

  it("selects on click and emits change, ignoring disabled options", () => {
    const el = make(`<neuwo-segmented>${OPTS}</neuwo-segmented>`);
    let changed = false;
    el.addEventListener("change", () => (changed = true));
    options(el).find((b) => b.dataset.value === "json").click();
    expect(el.value).toBe("json");
    expect(changed).toBe(true);
    options(el).find((b) => b.dataset.value === "raw").click();
    expect(el.value).toBe("json"); // disabled ignored
  });

  it("arrow-navigates with selection following focus", () => {
    const el = make(`<neuwo-segmented value="visual">${OPTS}</neuwo-segmented>`);
    const first = options(el)[0];
    first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    expect(el.value).toBe("json");
  });

  it("fails required validity until a value is set", () => {
    const el = make(`<neuwo-segmented required>${OPTS}</neuwo-segmented>`);
    expect(el.checkValidity()).toBe(false);
    el.value = "visual";
    expect(el.checkValidity()).toBe(true);
  });

  it("shows a group error accent on the pill", () => {
    const el = make(`<neuwo-segmented label="View" error="Choose a view">${OPTS}</neuwo-segmented>`);
    expect(el.shadowRoot.querySelector(".segmented").classList.contains("segmented--error")).toBe(true);
    expect(el.shadowRoot.querySelector(".control-error").textContent).toBe("Choose a view");
  });
});
