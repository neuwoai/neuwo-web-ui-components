import { describe, expect, it } from "vitest";
import "../src/components/dropdown/neuwo-dropdown.js";

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild;
}

describe("<neuwo-dropdown> structure", () => {
  it("registers and renders a trigger over a panel", () => {
    const el = make(`<neuwo-dropdown label="Publishers"></neuwo-dropdown>`);
    expect(el.tagName.toLowerCase()).toBe("neuwo-dropdown");
    const trigger = el.shadowRoot.querySelector("button.dropdown__trigger");
    const panel = el.shadowRoot.querySelector(".dropdown__panel");
    expect(trigger.type).toBe("button");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(panel).toBeTruthy();
  });

  it("wires aria-controls from the trigger to the panel", () => {
    const el = make(`<neuwo-dropdown label="Publishers"></neuwo-dropdown>`);
    const trigger = el.shadowRoot.querySelector(".dropdown__trigger");
    const panel = el.shadowRoot.querySelector(".dropdown__panel");
    expect(panel.id).toBeTruthy();
    expect(trigger.getAttribute("aria-controls")).toBe(panel.id);
  });

  it("gives every host-reachable piece a part", () => {
    const el = make(`<neuwo-dropdown label="X"></neuwo-dropdown>`);
    const parts = [...el.shadowRoot.querySelectorAll("[part]")].map((n) => n.getAttribute("part"));
    for (const p of ["trigger", "label", "arrow", "panel"]) expect(parts).toContain(p);
  });

  it("renders the label attribute as the label slot's fallback text", () => {
    const el = make(`<neuwo-dropdown label="Publishers"></neuwo-dropdown>`);
    const slot = el.shadowRoot.querySelector('slot[name="label"]');
    expect(slot.textContent).toBe("Publishers");
    el.label = "Advertisers";
    expect(slot.textContent).toBe("Advertisers");
  });

  it("offers an icon slot and a default slot for the items", () => {
    const el = make(`<neuwo-dropdown label="X"><a href="/a">A</a></neuwo-dropdown>`);
    expect(el.shadowRoot.querySelector('slot[name="icon"]')).toBeTruthy();
    expect(el.shadowRoot.querySelector(".dropdown__panel slot:not([name])")).toBeTruthy();
  });

  it("leaves the items in the light DOM with their href intact", () => {
    // The whole reason this is not a combobox: real links, so middle-click,
    // Ctrl-click and delegated document listeners all keep working.
    const el = make(
      `<neuwo-dropdown label="X"><a href="/fi/" data-lang-choose="fi">Suomi</a></neuwo-dropdown>`
    );
    const link = el.querySelector("a");
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/fi/");
    expect(link.closest("[data-lang-choose]")).toBe(link);
    expect(el.shadowRoot.querySelector("a")).toBeNull();
  });

  it("composes only the non-default modifiers onto the wrapper", () => {
    const plain = make(`<neuwo-dropdown label="X"></neuwo-dropdown>`);
    expect(plain.shadowRoot.querySelector(".dropdown").className).toBe("dropdown");

    const fancy = make(
      `<neuwo-dropdown label="X" placement="top" align="end" inline></neuwo-dropdown>`
    );
    const cls = fancy.shadowRoot.querySelector(".dropdown").className;
    expect(cls).toContain("dropdown--top");
    expect(cls).toContain("dropdown--end");
    expect(cls).toContain("dropdown--inline");
  });

  it("falls back to the defaults for unknown enum values", () => {
    const el = make(`<neuwo-dropdown label="X" placement="sideways" align="middle"></neuwo-dropdown>`);
    expect(el.placement).toBe("bottom");
    expect(el.align).toBe("start");
    expect(el.shadowRoot.querySelector(".dropdown").className).toBe("dropdown");
  });

  it("reflects every property to its attribute and back", () => {
    const el = make(`<neuwo-dropdown></neuwo-dropdown>`);

    el.label = "Company";
    expect(el.getAttribute("label")).toBe("Company");
    el.label = "";
    expect(el.hasAttribute("label")).toBe(false);

    el.placement = "top";
    expect(el.getAttribute("placement")).toBe("top");
    el.align = "end";
    expect(el.getAttribute("align")).toBe("end");

    el.inline = true;
    expect(el.hasAttribute("inline")).toBe(true);
    el.inline = false;
    expect(el.hasAttribute("inline")).toBe(false);

    el.open = true;
    expect(el.hasAttribute("open")).toBe(true);
    el.open = false;
    expect(el.hasAttribute("open")).toBe(false);
  });

  it("drives the open attribute from show() and hide()", () => {
    const el = make(`<neuwo-dropdown label="X"><a href="/a">A</a></neuwo-dropdown>`);
    el.show();
    expect(el.open).toBe(true);
    el.hide();
    expect(el.open).toBe(false);
  });

  it("patches rather than rebuilding, so the panel survives attribute changes", () => {
    const el = make(`<neuwo-dropdown label="X"><a href="/a">A</a></neuwo-dropdown>`);
    const panel = el.shadowRoot.querySelector(".dropdown__panel");
    el.label = "Y";
    el.placement = "top";
    expect(el.shadowRoot.querySelector(".dropdown__panel")).toBe(panel);
  });
});
