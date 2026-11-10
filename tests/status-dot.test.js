import { describe, expect, it } from "vitest";
import "../src/index.js";
import { NeuwoStatusDot } from "../src/components/status-dot/neuwo-status-dot.js";

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild;
}

const dot = (el) => el.querySelector(".neuwo-status-dot");

describe("<neuwo-status-dot>", () => {
  it("renders a green .neuwo-status-dot into its light DOM by default", () => {
    const el = make(`<neuwo-status-dot></neuwo-status-dot>`);
    expect(el).toBeInstanceOf(NeuwoStatusDot);
    expect(el.shadowRoot).toBeNull();
    expect(dot(el).localName).toBe("span");
    expect(dot(el).className).toBe("neuwo-status-dot");
    expect(dot(el).hasAttribute("part")).toBe(false);
    expect(el.children).toHaveLength(1);
    expect(el.textContent).toBe("");
  });

  it("switches colour via the variant axis", () => {
    expect(dot(make(`<neuwo-status-dot variant="blue"></neuwo-status-dot>`)).classList.contains("neuwo-status-dot--blue")).toBe(true);
    expect(dot(make(`<neuwo-status-dot variant="xyz"></neuwo-status-dot>`)).className).toBe("neuwo-status-dot");
  });

  it("applies the motion axis (pulse / blink) independently of colour", () => {
    expect(dot(make(`<neuwo-status-dot motion="pulse"></neuwo-status-dot>`)).classList.contains("neuwo-status-dot--pulse")).toBe(true);
    const c = dot(make(`<neuwo-status-dot variant="blue" motion="blink"></neuwo-status-dot>`)).classList;
    expect(c.contains("neuwo-status-dot--blink")).toBe(true);
    expect(c.contains("neuwo-status-dot--blue")).toBe(true);
  });

  it("reflects the variant and motion properties and patches the same dot", () => {
    const el = make(`<neuwo-status-dot></neuwo-status-dot>`);
    const before = dot(el);
    el.variant = "blue";
    el.motion = "pulse";
    expect(el.getAttribute("variant")).toBe("blue");
    expect(el.getAttribute("motion")).toBe("pulse");
    expect(dot(el)).toBe(before);
    expect(dot(el).className).toBe("neuwo-status-dot neuwo-status-dot--blue neuwo-status-dot--pulse");
    el.motion = "";
    expect(el.hasAttribute("motion")).toBe(false);
    expect(dot(el).classList.contains("neuwo-status-dot--pulse")).toBe(false);
  });

  it("maps halo s/l to a modifier class; m or unknown add none", () => {
    expect(dot(make(`<neuwo-status-dot></neuwo-status-dot>`)).className).toBe("neuwo-status-dot");
    expect(dot(make(`<neuwo-status-dot halo="m"></neuwo-status-dot>`)).className).toBe("neuwo-status-dot");
    expect(dot(make(`<neuwo-status-dot halo="s"></neuwo-status-dot>`)).classList.contains("neuwo-status-dot--halo-s")).toBe(true);
    expect(dot(make(`<neuwo-status-dot halo="l"></neuwo-status-dot>`)).classList.contains("neuwo-status-dot--halo-l")).toBe(true);
  });

  it("reflects the halo property to the attribute", () => {
    const el = make(`<neuwo-status-dot></neuwo-status-dot>`);
    expect(el.halo).toBe("m");
    el.halo = "l";
    expect(el.getAttribute("halo")).toBe("l");
    el.halo = "";
    expect(el.hasAttribute("halo")).toBe(false);
  });

  it("maps glow s/m/l to a modifier class; none or unknown add none", () => {
    expect(dot(make(`<neuwo-status-dot glow="none"></neuwo-status-dot>`)).className).toBe("neuwo-status-dot");
    expect(dot(make(`<neuwo-status-dot glow="xl"></neuwo-status-dot>`)).className).toBe("neuwo-status-dot");
    for (const level of ["s", "m", "l"]) {
      expect(dot(make(`<neuwo-status-dot glow="${level}"></neuwo-status-dot>`)).classList.contains(`neuwo-status-dot--glow-${level}`)).toBe(true);
    }
  });

  it("composes glow with variant, halo and motion on one dot", () => {
    const c = dot(make(`<neuwo-status-dot variant="blue" halo="l" glow="m" motion="blink"></neuwo-status-dot>`)).classList;
    for (const cls of ["neuwo-status-dot--blue", "neuwo-status-dot--halo-l", "neuwo-status-dot--glow-m", "neuwo-status-dot--blink"]) {
      expect(c.contains(cls)).toBe(true);
    }
  });

  it("reflects the glow property to the attribute and defaults to none", () => {
    const el = make(`<neuwo-status-dot></neuwo-status-dot>`);
    expect(el.glow).toBe("none");
    el.glow = "m";
    expect(el.getAttribute("glow")).toBe("m");
    expect(dot(el).classList.contains("neuwo-status-dot--glow-m")).toBe(true);
    el.glow = "";
    expect(el.hasAttribute("glow")).toBe(false);
    expect(el.glow).toBe("none");
    expect(dot(el).classList.contains("neuwo-status-dot--glow-m")).toBe(false);
  });

  it("keeps title and aria-* on the host alone", () => {
    const el = make(`<neuwo-status-dot title="Online" aria-label="Online" data-x="1"></neuwo-status-dot>`);
    expect(dot(el).getAttributeNames()).toEqual(["class"]);
  });
});
