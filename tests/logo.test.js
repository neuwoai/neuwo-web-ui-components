import { describe, expect, it } from "vitest";
import "../src/components/logo/neuwo-logo.js";

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild;
}

// The brand's own fills, in document order: the first three paths (n e u) carry
// the lead ink, the last two (w o) the trail. The pair identifies which of the
// four files was inlined, so these assertions test the drawing and not just the
// class name. Unlike a CSS `?raw` import, an SVG one resolves under Vitest.
const INK = {
  "bg-light": ["#0AA5C3", "#1E1E0A"],
  "bg-dark": ["white", "#0AA5C3"],
  "bg-dark-alt": ["#0AA5C3", "white"],
  "bg-colour": ["white", "#1E1E0A"],
};

function inkOf(el) {
  const paths = el.shadowRoot.querySelector("svg").children;
  return [paths[0].getAttribute("fill"), paths[4].getAttribute("fill")];
}

describe("<neuwo-logo>", () => {
  it("registers and inlines the wordmark as SVG, not as an image", () => {
    expect(customElements.get("neuwo-logo")).toBeTruthy();
    const svg = make(`<neuwo-logo></neuwo-logo>`).shadowRoot.querySelector("svg");
    expect(svg.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(svg.getAttribute("viewBox")).toBe("0 0 320 50");
    expect(svg.children).toHaveLength(5);
  });

  it("exposes the drawing as the logo part", () => {
    const el = make(`<neuwo-logo></neuwo-logo>`);
    expect(el.shadowRoot.querySelector("svg").getAttribute("part")).toBe("logo");
  });

  it("draws each variant's own file and names it on the class", () => {
    for (const [variant, ink] of Object.entries(INK)) {
      const el = make(`<neuwo-logo variant="${variant}"></neuwo-logo>`);
      expect(inkOf(el)).toEqual(ink);
      expect(el.shadowRoot.querySelector("svg").getAttribute("class")).toBe(
        `logo logo--${variant}`
      );
    }
  });

  it("defaults to bg-dark, the tone for the library's own dark surface", () => {
    const el = make(`<neuwo-logo></neuwo-logo>`);
    expect(el.variant).toBe("bg-dark");
    expect(inkOf(el)).toEqual(INK["bg-dark"]);
  });

  it("falls back to bg-dark on an unknown variant", () => {
    expect(inkOf(make(`<neuwo-logo variant="teal"></neuwo-logo>`))).toEqual(INK["bg-dark"]);
    // An inherited object key must not pass for a variant either.
    expect(inkOf(make(`<neuwo-logo variant="toString"></neuwo-logo>`))).toEqual(INK["bg-dark"]);
  });

  it("names itself Neuwo, and takes a custom name", () => {
    const el = make(`<neuwo-logo></neuwo-logo>`);
    const svg = el.shadowRoot.querySelector("svg");
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-label")).toBe("Neuwo");
    expect(el.label).toBe("Neuwo");

    const named = make(`<neuwo-logo label="Neuwo home"></neuwo-logo>`);
    expect(named.shadowRoot.querySelector("svg").getAttribute("aria-label")).toBe("Neuwo home");
  });

  it("goes decorative on an empty label, so a labelled link says Neuwo once", () => {
    const svg = make(`<neuwo-logo label=""></neuwo-logo>`).shadowRoot.querySelector("svg");
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.hasAttribute("role")).toBe(false);
    expect(svg.hasAttribute("aria-label")).toBe(false);
  });

  it("reflects variant between property and attribute", () => {
    const el = make(`<neuwo-logo></neuwo-logo>`);
    el.variant = "bg-light";
    expect(el.getAttribute("variant")).toBe("bg-light");
    expect(inkOf(el)).toEqual(INK["bg-light"]);
    el.variant = "";
    expect(el.hasAttribute("variant")).toBe(false);
    expect(inkOf(el)).toEqual(INK["bg-dark"]);
  });

  it("keeps an empty label as an attribute, and only removes it for null", () => {
    const el = make(`<neuwo-logo></neuwo-logo>`);
    el.label = "";
    // Empty means decorative, so it must survive as an attribute where the
    // other string axes would have removed themselves.
    expect(el.getAttribute("label")).toBe("");
    expect(el.shadowRoot.querySelector("svg").getAttribute("aria-hidden")).toBe("true");
    el.label = null;
    expect(el.hasAttribute("label")).toBe(false);
    expect(el.shadowRoot.querySelector("svg").getAttribute("aria-label")).toBe("Neuwo");
  });
});
