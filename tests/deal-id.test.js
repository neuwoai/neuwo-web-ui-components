import { describe, expect, it } from "vitest";
import "../src/index.js";
import { NeuwoDealId } from "../src/components/deal-id/neuwo-deal-id.js";

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild;
}

const box = (el) => el.querySelector(".neuwo-deal-id");

describe("<neuwo-deal-id>", () => {
  it("renders a read-only .neuwo-deal-id box into its light DOM that holds the value", () => {
    const el = make(`<neuwo-deal-id>NW-CA-2026-04-8A3F</neuwo-deal-id>`);
    expect(el).toBeInstanceOf(NeuwoDealId);
    expect(el.shadowRoot).toBeNull();
    expect(box(el).localName).toBe("span");
    expect(box(el).className).toBe("neuwo-deal-id");
    expect(box(el).textContent).toBe("NW-CA-2026-04-8A3F");
    expect(box(el).hasAttribute("part")).toBe(false);
    expect(el.querySelector("slot")).toBeNull();
    expect(el.textContent).toBe("NW-CA-2026-04-8A3F");
  });

  it("is size m (no modifier class) by default", () => {
    const el = make(`<neuwo-deal-id>NW-1</neuwo-deal-id>`);
    expect(box(el).className).toBe("neuwo-deal-id");
    expect(el.size).toBe("m");
  });

  it("maps size s and l to a modifier class, m or unknown to none, and reflects the property", () => {
    expect(box(make(`<neuwo-deal-id size="s">NW-1</neuwo-deal-id>`)).classList.contains("neuwo-deal-id--s")).toBe(true);
    expect(box(make(`<neuwo-deal-id size="l">NW-1</neuwo-deal-id>`)).classList.contains("neuwo-deal-id--l")).toBe(true);
    expect(box(make(`<neuwo-deal-id size="xl">NW-1</neuwo-deal-id>`)).className).toBe("neuwo-deal-id");
    const el = make(`<neuwo-deal-id>NW-1</neuwo-deal-id>`);
    const before = box(el);
    el.size = "s";
    expect(el.getAttribute("size")).toBe("s");
    expect(box(el)).toBe(before);
    expect(box(el).classList.contains("neuwo-deal-id--s")).toBe(true);
    el.size = "";
    expect(el.hasAttribute("size")).toBe(false);
    expect(box(el).className).toBe("neuwo-deal-id");
  });

  it("keeps data-* and other attributes on the host alone", () => {
    const el = make(`<neuwo-deal-id data-id="1" title="Deal">NW-1</neuwo-deal-id>`);
    expect(box(el).getAttributeNames()).toEqual(["class"]);
  });
});
