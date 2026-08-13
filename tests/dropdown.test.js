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

describe("<neuwo-dropdown> open and close", () => {
  it("toggles on trigger click", () => {
    const el = make(`<neuwo-dropdown label="X"><a href="/a">A</a></neuwo-dropdown>`);
    const trigger = el.shadowRoot.querySelector(".dropdown__trigger");

    trigger.click();
    expect(el.open).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(el.shadowRoot.querySelector(".dropdown__panel").hidden).toBe(false);

    trigger.click();
    expect(el.open).toBe(false);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(el.shadowRoot.querySelector(".dropdown__panel").hidden).toBe(true);
  });

  it("fires toggle once per state change", () => {
    const el = make(`<neuwo-dropdown label="X"><a href="/a">A</a></neuwo-dropdown>`);
    let count = 0;
    el.addEventListener("toggle", () => count++);
    el.show();
    expect(count).toBe(1);
    el.show(); // already open, no change
    expect(count).toBe(1);
    el.hide();
    expect(count).toBe(2);
  });

  it("opens on load when the open attribute is present", () => {
    const el = make(`<neuwo-dropdown label="X" open><a href="/a">A</a></neuwo-dropdown>`);
    expect(el.shadowRoot.querySelector(".dropdown__trigger").getAttribute("aria-expanded")).toBe(
      "true"
    );
  });

  it("carries popover in the default mode and drops it when inline", () => {
    const el = make(`<neuwo-dropdown label="X"><a href="/a">A</a></neuwo-dropdown>`);
    const panel = el.shadowRoot.querySelector(".dropdown__panel");
    expect(panel.getAttribute("popover")).toBe("auto");

    el.inline = true;
    expect(panel.hasAttribute("popover")).toBe(false);

    el.inline = false;
    expect(panel.getAttribute("popover")).toBe("auto");
  });

  it("closes when inline changes while open, rather than reconfiguring a live popover", () => {
    const el = make(`<neuwo-dropdown label="X"><a href="/a">A</a></neuwo-dropdown>`);
    el.show();
    expect(el.open).toBe(true);
    el.inline = true;
    expect(el.open).toBe(false);
    expect(el.shadowRoot.querySelector(".dropdown__panel").hasAttribute("popover")).toBe(false);
  });

  it("closes on a click outside and ignores clicks within", () => {
    const el = make(`<neuwo-dropdown label="X"><a href="/a">A</a></neuwo-dropdown>`);
    el.show();

    el.querySelector("a").dispatchEvent(new Event("click", { bubbles: true }));
    expect(el.open).toBe(true);

    document.body.dispatchEvent(new Event("click", { bubbles: true }));
    expect(el.open).toBe(false);
  });

  it("keeps a declaratively open inline dropdown open on first connect", () => {
    // The inline-transition guard must not mistake the first sync for a live
    // change, or it strips the open attribute the consumer declared.
    const el = make(`<neuwo-dropdown label="X" inline open><a href="/a">A</a></neuwo-dropdown>`);
    expect(el.hasAttribute("open")).toBe(true);
    expect(el.shadowRoot.querySelector(".dropdown__trigger").getAttribute("aria-expanded")).toBe("true");
    expect(el.shadowRoot.querySelector(".dropdown__panel").hidden).toBe(false);
  });
});
