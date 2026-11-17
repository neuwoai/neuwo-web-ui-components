import { describe, expect, it } from "vitest";
import "../src/index.js";
import { NeuwoBadge } from "../src/components/badge/neuwo-badge.js";

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild;
}

const pill = (el) => el.querySelector(".neuwo-badge");
const classes = (el) => pill(el).classList;

describe("<neuwo-badge>", () => {
  it("renders a .neuwo-badge pill into its light DOM that holds the label", () => {
    const el = make(`<neuwo-badge>For Publishers</neuwo-badge>`);
    expect(el).toBeInstanceOf(NeuwoBadge);
    expect(el.shadowRoot).toBeNull();
    expect(pill(el).localName).toBe("span");
    expect(pill(el).className).toBe("neuwo-badge");
    expect(pill(el).textContent).toBe("For Publishers");
    expect(pill(el).hasAttribute("part")).toBe(false);
    expect(el.querySelector("slot")).toBeNull();
  });

  it("keeps author markup inside the pill", () => {
    const el = make(`<neuwo-badge>Sale <b>50%</b></neuwo-badge>`);
    expect(pill(el).innerHTML).toBe("Sale <b>50%</b>");
    expect(el.querySelectorAll(".neuwo-badge")).toHaveLength(1);
  });

  it("is blue by default and green via the variant, and treats unknown as blue", () => {
    expect(classes(make(`<neuwo-badge>x</neuwo-badge>`)).contains("neuwo-badge--green")).toBe(false);
    expect(classes(make(`<neuwo-badge variant="green">x</neuwo-badge>`)).contains("neuwo-badge--green")).toBe(true);
    expect(classes(make(`<neuwo-badge variant="xyz">x</neuwo-badge>`)).contains("neuwo-badge--green")).toBe(false);
  });

  it("reflects the variant property to the attribute and re-renders the same pill", () => {
    const el = make(`<neuwo-badge>x</neuwo-badge>`);
    const before = pill(el);
    el.variant = "green";
    expect(el.getAttribute("variant")).toBe("green");
    expect(pill(el)).toBe(before);
    expect(classes(el).contains("neuwo-badge--green")).toBe(true);
    el.variant = "";
    expect(el.hasAttribute("variant")).toBe(false);
    expect(el.variant).toBe("blue");
    expect(classes(el).contains("neuwo-badge--green")).toBe(false);
  });

  it("sets the label in capitals under uppercase, leaving the text as written, and reflects the property", () => {
    const el = make(`<neuwo-badge uppercase>Live</neuwo-badge>`);
    expect(classes(el).contains("neuwo-badge--uppercase")).toBe(true);
    expect(el.textContent).toBe("Live");
    expect(el.uppercase).toBe(true);
    el.uppercase = false;
    expect(el.hasAttribute("uppercase")).toBe(false);
    expect(classes(el).contains("neuwo-badge--uppercase")).toBe(false);
  });

  it("drops the border via the borderless axis and reflects the property", () => {
    expect(classes(make(`<neuwo-badge>x</neuwo-badge>`)).contains("neuwo-badge--borderless")).toBe(false);
    const el = make(`<neuwo-badge borderless>x</neuwo-badge>`);
    expect(classes(el).contains("neuwo-badge--borderless")).toBe(true);
    el.borderless = false;
    expect(el.hasAttribute("borderless")).toBe(false);
    expect(classes(el).contains("neuwo-badge--borderless")).toBe(false);
  });

  it("selects pulse or shimmer via motion, independent of colour, and nothing for unknown", () => {
    const el = make(`<neuwo-badge motion="pulse">x</neuwo-badge>`);
    expect(classes(el).contains("neuwo-badge--pulse")).toBe(true);
    el.motion = "";
    expect(el.hasAttribute("motion")).toBe(false);
    expect(classes(el).contains("neuwo-badge--pulse")).toBe(false);
    const shimmer = classes(make(`<neuwo-badge variant="green" motion="shimmer">New</neuwo-badge>`));
    expect(shimmer.contains("neuwo-badge--shimmer")).toBe(true);
    expect(shimmer.contains("neuwo-badge--green")).toBe(true);
    expect(make(`<neuwo-badge motion="xyz">x</neuwo-badge>`).querySelector(".neuwo-badge").className).toBe("neuwo-badge");
  });

  it("maps size s and l to a modifier, m or unknown to none, and reflects the property", () => {
    expect(classes(make(`<neuwo-badge size="s">x</neuwo-badge>`)).contains("neuwo-badge--s")).toBe(true);
    expect(classes(make(`<neuwo-badge size="l">x</neuwo-badge>`)).contains("neuwo-badge--l")).toBe(true);
    expect(pill(make(`<neuwo-badge size="m">x</neuwo-badge>`)).className).toBe("neuwo-badge");
    expect(pill(make(`<neuwo-badge size="xl">x</neuwo-badge>`)).className).toBe("neuwo-badge");
    const el = make(`<neuwo-badge>x</neuwo-badge>`);
    expect(el.size).toBe("m");
    el.size = "s";
    expect(el.getAttribute("size")).toBe("s");
    expect(classes(el).contains("neuwo-badge--s")).toBe(true);
    el.size = "";
    expect(el.hasAttribute("size")).toBe(false);
    expect(el.size).toBe("m");
  });

  it("maps intensity s and l alongside a motion only, and reflects the property", () => {
    const el = make(`<neuwo-badge motion="pulse">x</neuwo-badge>`);
    expect(el.intensity).toBe("m");
    expect(pill(el).className).toBe("neuwo-badge neuwo-badge--pulse");
    el.intensity = "s";
    expect(el.getAttribute("intensity")).toBe("s");
    expect(classes(el).contains("neuwo-badge--intensity-s")).toBe(true);
    el.intensity = "";
    expect(el.hasAttribute("intensity")).toBe(false);
    expect(classes(el).contains("neuwo-badge--intensity-s")).toBe(false);
    expect(classes(make(`<neuwo-badge motion="shimmer" intensity="l">x</neuwo-badge>`)).contains("neuwo-badge--intensity-l")).toBe(true);
    expect(pill(make(`<neuwo-badge intensity="l">x</neuwo-badge>`)).className).toBe("neuwo-badge");
    expect(pill(make(`<neuwo-badge motion="pulse" intensity="xl">x</neuwo-badge>`)).className).toBe("neuwo-badge neuwo-badge--pulse");
  });

  it("adds the glow treatment, toggles it from the property, and composes with the other axes", () => {
    expect(classes(make(`<neuwo-badge>x</neuwo-badge>`)).contains("neuwo-badge--glow")).toBe(false);
    const el = make(`<neuwo-badge variant="green" glow motion="shimmer">Hot</neuwo-badge>`);
    for (const cls of ["neuwo-badge--glow", "neuwo-badge--green", "neuwo-badge--shimmer"]) expect(classes(el).contains(cls)).toBe(true);
    el.glow = false;
    expect(el.hasAttribute("glow")).toBe(false);
    expect(classes(el).contains("neuwo-badge--glow")).toBe(false);
  });

  it("mixes the axes freely", () => {
    const el = make(`<neuwo-badge variant="green" size="l" borderless motion="pulse" intensity="s">Live</neuwo-badge>`);
    expect(pill(el).className).toBe(
      "neuwo-badge neuwo-badge--green neuwo-badge--l neuwo-badge--borderless neuwo-badge--pulse neuwo-badge--intensity-s",
    );
  });

  it("keeps data-* and other attributes on the host alone", () => {
    const el = make(`<neuwo-badge data-track="b" title="Tip" aria-label="Status">x</neuwo-badge>`);
    expect(pill(el).getAttributeNames()).toEqual(["class"]);
    expect(Array.from(document.querySelectorAll('[data-track="b"]'))).toEqual([el]);
  });
});
