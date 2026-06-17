import { describe, expect, it } from "vitest";
import "../src/index.js"; // registers <neuwo-button> and injects fonts

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild;
}

describe("<neuwo-button>", () => {
  it("renders a solid button by default", () => {
    const btn = make(`<neuwo-button>Go</neuwo-button>`).shadowRoot.querySelector("button");
    expect(btn).toBeTruthy();
    expect(btn.className).toBe("btn btn--solid");
    expect(btn.getAttribute("type")).toBe("button");
  });

  it("maps variant and size to BEM classes", () => {
    const el = make(`<neuwo-button variant="outline" size="lg">Go</neuwo-button>`);
    expect(el.shadowRoot.querySelector("button").className).toBe("btn btn--outline btn--lg");
  });

  it("adds wide and xwide modifiers", () => {
    const cls = make(`<neuwo-button wide xwide>Go</neuwo-button>`)
      .shadowRoot.querySelector("button").className;
    expect(cls).toContain("btn--wide");
    expect(cls).toContain("btn--xwide");
  });

  it("renders an anchor when href is set", () => {
    const a = make(`<neuwo-button href="https://neuwo.ai">Go</neuwo-button>`)
      .shadowRoot.querySelector("a");
    expect(a).toBeTruthy();
    expect(a.getAttribute("href")).toBe("https://neuwo.ai");
  });

  it("stays a disabled button even with href", () => {
    const btn = make(`<neuwo-button href="https://neuwo.ai" disabled>Go</neuwo-button>`)
      .shadowRoot.querySelector("button");
    expect(btn).toBeTruthy();
    expect(btn.hasAttribute("disabled")).toBe(true);
  });

  it("exposes the inner control as ::part(button)", () => {
    const el = make(`<neuwo-button>Go</neuwo-button>`);
    expect(el.shadowRoot.querySelector("button").getAttribute("part")).toBe("button");
  });

  it("exposes part on the anchor variant too", () => {
    const el = make(`<neuwo-button href="https://neuwo.ai">Go</neuwo-button>`);
    expect(el.shadowRoot.querySelector("a").getAttribute("part")).toBe("button");
  });

  it("re-renders when an attribute changes", () => {
    const el = make(`<neuwo-button>Go</neuwo-button>`);
    el.setAttribute("variant", "glass");
    expect(el.shadowRoot.querySelector("button").className).toBe("btn btn--glass");
  });

  it("projects its label through a slot", () => {
    const el = make(`<neuwo-button>Hello</neuwo-button>`);
    expect(el.shadowRoot.querySelector("slot")).toBeTruthy();
    expect(el.textContent).toBe("Hello");
  });

  it("forwards target, rel and download to the anchor", () => {
    const a = make(
      `<neuwo-button href="https://neuwo.ai" target="_blank" rel="noopener" download>Go</neuwo-button>`
    ).shadowRoot.querySelector("a");
    expect(a.getAttribute("target")).toBe("_blank");
    expect(a.getAttribute("rel")).toBe("noopener");
    expect(a.hasAttribute("download")).toBe(true);
  });

  it("forwards aria-*, data-* and title to the inner control", () => {
    const btn = make(
      `<neuwo-button aria-label="Save" data-track="cta" title="Save now">Go</neuwo-button>`
    ).shadowRoot.querySelector("button");
    expect(btn.getAttribute("aria-label")).toBe("Save");
    expect(btn.getAttribute("data-track")).toBe("cta");
    expect(btn.getAttribute("title")).toBe("Save now");
  });

  it("treats href as a value, not markup (no injection)", () => {
    const el = make(`<neuwo-button href='"><img src=x onerror=1>'>Go</neuwo-button>`);
    const a = el.shadowRoot.querySelector("a");
    expect(a).toBeTruthy();
    expect(el.shadowRoot.querySelector("img")).toBeNull();
    expect(a.getAttribute("href")).toBe('"><img src=x onerror=1>');
  });
});
