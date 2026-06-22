import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import "../src/index.js"; // registers <neuwo-button> and injects fonts
import { NeuwoButton } from "../src/components/button/neuwo-button.js";

// The recipe is consumed via `?raw`, which Vitest does not transform, so read
// the file off disk to assert on its CSS text (see typography.test.js).
const __dirname = dirname(fileURLToPath(import.meta.url));
const buttonCss = readFileSync(join(__dirname, "../src/components/button/button.css"), "utf8");

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

  it("reflects the disabled property to the attribute and inner control", () => {
    const el = make(`<neuwo-button>Go</neuwo-button>`);
    expect(el.disabled).toBe(false);
    el.disabled = true;
    expect(el.hasAttribute("disabled")).toBe(true);
    expect(el.shadowRoot.querySelector("button").disabled).toBe(true);
    el.disabled = false;
    expect(el.hasAttribute("disabled")).toBe(false);
    expect(el.shadowRoot.querySelector("button").disabled).toBe(false);
  });

  it("is a form-associated element", () => {
    expect(NeuwoButton.formAssociated).toBe(true);
  });

  it("submits its form when a type=submit button is activated", () => {
    const form = document.createElement("form");
    form.innerHTML = `<neuwo-button type="submit">Send</neuwo-button>`;
    document.body.appendChild(form);
    let submitted = false;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submitted = true;
    });
    form.querySelector("neuwo-button").click();
    expect(submitted).toBe(true);
  });

  it("resets its form when a type=reset button is activated", () => {
    const form = document.createElement("form");
    form.innerHTML = `<input name="q" value="x"><neuwo-button type="reset">Reset</neuwo-button>`;
    document.body.appendChild(form);
    const input = form.querySelector("input");
    input.value = "changed";
    form.querySelector("neuwo-button").click();
    expect(input.value).toBe("x");
  });

  it("does not submit its form when disabled", () => {
    const form = document.createElement("form");
    form.innerHTML = `<neuwo-button type="submit" disabled>Send</neuwo-button>`;
    document.body.appendChild(form);
    let submitted = false;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submitted = true;
    });
    form.querySelector("neuwo-button").click();
    expect(submitted).toBe(false);
  });

  it("does not submit its form when it is a link", () => {
    const form = document.createElement("form");
    form.innerHTML = `<neuwo-button type="submit" href="https://neuwo.ai">Go</neuwo-button>`;
    document.body.appendChild(form);
    let submitted = false;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submitted = true;
    });
    form.querySelector("neuwo-button").click();
    expect(submitted).toBe(false);
  });

  it("treats href as a value, not markup (no injection)", () => {
    const el = make(`<neuwo-button href='"><img src=x onerror=1>'>Go</neuwo-button>`);
    const a = el.shadowRoot.querySelector("a");
    expect(a).toBeTruthy();
    expect(el.shadowRoot.querySelector("img")).toBeNull();
    expect(a.getAttribute("href")).toBe('"><img src=x onerror=1>');
  });

  it("draws a keyboard focus ring on .btn from the shadow-focus token", () => {
    expect(buttonCss).toContain(".btn:focus-visible");
    expect(buttonCss).toContain("var(--shadow-focus)");
  });
});
