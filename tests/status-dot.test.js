import { describe, expect, it } from "vitest";
import "../src/components/status-dot/neuwo-status-dot.js";

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild;
}

describe("<neuwo-status-dot>", () => {
  it("registers and renders a green .status-dot by default", () => {
    const el = make(`<neuwo-status-dot></neuwo-status-dot>`);
    expect(customElements.get("neuwo-status-dot")).toBeTruthy();
    const dot = el.shadowRoot.querySelector(".status-dot");
    expect(dot).toBeTruthy();
    expect(dot.getAttribute("part")).toBe("dot");
    expect(dot.classList.contains("status-dot--blue")).toBe(false);
  });

  it("switches colour via the variant axis", () => {
    const el = make(`<neuwo-status-dot variant="blue"></neuwo-status-dot>`);
    expect(el.shadowRoot.querySelector(".status-dot").classList.contains("status-dot--blue")).toBe(true);
  });

  it("applies the motion axis (pulse / blink) independently of colour", () => {
    const pulse = make(`<neuwo-status-dot motion="pulse"></neuwo-status-dot>`);
    expect(pulse.shadowRoot.querySelector(".status-dot").classList.contains("status-dot--pulse")).toBe(true);
    const blink = make(`<neuwo-status-dot variant="blue" motion="blink"></neuwo-status-dot>`);
    const c = blink.shadowRoot.querySelector(".status-dot").classList;
    expect(c.contains("status-dot--blink")).toBe(true);
    expect(c.contains("status-dot--blue")).toBe(true);
  });

  it("reflects the variant and motion properties to attributes", () => {
    const el = make(`<neuwo-status-dot></neuwo-status-dot>`);
    el.variant = "blue";
    el.motion = "pulse";
    expect(el.getAttribute("variant")).toBe("blue");
    expect(el.getAttribute("motion")).toBe("pulse");
    expect(el.shadowRoot.querySelector(".status-dot").classList.contains("status-dot--pulse")).toBe(true);
    el.motion = "";
    expect(el.hasAttribute("motion")).toBe(false);
    expect(el.shadowRoot.querySelector(".status-dot").classList.contains("status-dot--pulse")).toBe(false);
  });

  it("maps halo intensity s/l to a modifier class; m/none add none", () => {
    const base = make(`<neuwo-status-dot></neuwo-status-dot>`).shadowRoot.querySelector(".status-dot");
    expect(base.classList.contains("status-dot--halo-s")).toBe(false);
    expect(base.classList.contains("status-dot--halo-l")).toBe(false);
    expect(make(`<neuwo-status-dot halo="m"></neuwo-status-dot>`).shadowRoot.querySelector(".status-dot").className)
      .toBe("status-dot");
    expect(make(`<neuwo-status-dot halo="s"></neuwo-status-dot>`).shadowRoot.querySelector(".status-dot")
      .classList.contains("status-dot--halo-s")).toBe(true);
    expect(make(`<neuwo-status-dot halo="l"></neuwo-status-dot>`).shadowRoot.querySelector(".status-dot")
      .classList.contains("status-dot--halo-l")).toBe(true);
  });

  it("reflects the halo property to the attribute", () => {
    const el = make(`<neuwo-status-dot></neuwo-status-dot>`);
    el.halo = "l";
    expect(el.getAttribute("halo")).toBe("l");
    el.halo = "";
    expect(el.hasAttribute("halo")).toBe(false);
  });

  it("maps glow intensity s/m/l to a modifier class; none/unknown add none", () => {
    const base = make(`<neuwo-status-dot></neuwo-status-dot>`).shadowRoot.querySelector(".status-dot");
    expect(base.className).toBe("status-dot");
    expect(make(`<neuwo-status-dot glow="none"></neuwo-status-dot>`).shadowRoot.querySelector(".status-dot").className)
      .toBe("status-dot");
    expect(make(`<neuwo-status-dot glow="xl"></neuwo-status-dot>`).shadowRoot.querySelector(".status-dot").className)
      .toBe("status-dot");
    for (const level of ["s", "m", "l"]) {
      expect(make(`<neuwo-status-dot glow="${level}"></neuwo-status-dot>`).shadowRoot.querySelector(".status-dot")
        .classList.contains(`status-dot--glow-${level}`)).toBe(true);
    }
  });

  it("composes glow with variant, halo and motion on one dot", () => {
    const dot = make(`<neuwo-status-dot variant="blue" halo="l" glow="m" motion="blink"></neuwo-status-dot>`)
      .shadowRoot.querySelector(".status-dot");
    for (const cls of ["status-dot--blue", "status-dot--halo-l", "status-dot--glow-m", "status-dot--blink"])
      expect(dot.classList.contains(cls)).toBe(true);
  });

  it("reflects the glow property to the attribute and defaults to none", () => {
    const el = make(`<neuwo-status-dot></neuwo-status-dot>`);
    expect(el.glow).toBe("none");
    el.glow = "m";
    expect(el.getAttribute("glow")).toBe("m");
    expect(el.shadowRoot.querySelector(".status-dot").classList.contains("status-dot--glow-m")).toBe(true);
    el.glow = "";
    expect(el.hasAttribute("glow")).toBe(false);
    expect(el.glow).toBe("none");
    expect(el.shadowRoot.querySelector(".status-dot").classList.contains("status-dot--glow-m")).toBe(false);
  });
});
