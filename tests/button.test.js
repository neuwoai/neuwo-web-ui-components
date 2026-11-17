import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRef, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import "../src/index.js";
import { NeuwoButton } from "../src/components/button/neuwo-button.js";
import { buttonTemplate } from "../src/components/button/button.template.js";
import { renderElement } from "../src/core/adapters/html.js";
import { idScope } from "../src/core/ids.js";
import { normalizeProps } from "../src/core/template.js";
import { jsx, jsxs } from "../src/react/jsx-runtime.js";
import { normalise } from "./fixtures/template-cases.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const buttonCss = readFileSync(join(__dirname, "../src/components/button/button.css"), "utf8");

const cleanup = [];
afterEach(() => {
  while (cleanup.length) cleanup.pop()();
  vi.restoreAllMocks();
});

function attach(node) {
  document.body.appendChild(node);
  cleanup.push(() => node.remove());
  return node;
}

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  return attach(host).firstElementChild;
}

const control = (el) => el.querySelector(".neuwo-btn");
const text = (value) => ({ tag: null, attrs: {}, text: value, slot: "default", html: value });
const server = (attrs, label) => renderElement("neuwo-button", attrs, [text(label)], buttonTemplate, idScope("neuwo-s"));

function submitsOf(form) {
  const submits = [];
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submits.push(e);
  });
  return submits;
}

describe("<neuwo-button>", () => {
  it("renders a solid button into its light DOM by default", () => {
    const el = make(`<neuwo-button>Go</neuwo-button>`);
    expect(el).toBeInstanceOf(NeuwoButton);
    expect(el.shadowRoot).toBeNull();
    const btn = control(el);
    expect(btn.localName).toBe("button");
    expect(btn.className).toBe("neuwo-btn neuwo-btn--solid");
    expect(btn.getAttribute("type")).toBe("button");
  });

  it("maps variant and size to prefixed BEM classes", () => {
    const el = make(`<neuwo-button variant="outline" size="lg">Go</neuwo-button>`);
    expect(control(el).className).toBe("neuwo-btn neuwo-btn--outline neuwo-btn--lg");
  });

  it("adds wide, xwide and block modifiers", () => {
    const cls = control(make(`<neuwo-button wide xwide block>Go</neuwo-button>`)).classList;
    expect(cls.contains("neuwo-btn--wide")).toBe(true);
    expect(cls.contains("neuwo-btn--xwide")).toBe(true);
    expect(cls.contains("neuwo-btn--block")).toBe(true);
  });

  it("renders an anchor when href is set", () => {
    const a = control(make(`<neuwo-button href="https://neuwo.ai">Go</neuwo-button>`));
    expect(a.localName).toBe("a");
    expect(a.getAttribute("href")).toBe("https://neuwo.ai");
  });

  it("stays a disabled button even with href", () => {
    const btn = control(make(`<neuwo-button href="https://neuwo.ai" disabled>Go</neuwo-button>`));
    expect(btn.localName).toBe("button");
    expect(btn.hasAttribute("disabled")).toBe(true);
  });

  it("exposes no part and no form association", () => {
    expect(control(make(`<neuwo-button>Go</neuwo-button>`)).hasAttribute("part")).toBe(false);
    expect(control(make(`<neuwo-button href="https://neuwo.ai">Go</neuwo-button>`)).hasAttribute("part")).toBe(false);
    expect(Object.hasOwn(NeuwoButton, "formAssociated")).toBe(false);
  });

  it("patches the same control when an attribute changes", () => {
    const el = make(`<neuwo-button>Go</neuwo-button>`);
    const btn = control(el);
    el.setAttribute("variant", "glass");
    el.setAttribute("block", "");
    expect(control(el)).toBe(btn);
    expect(btn.className).toBe("neuwo-btn neuwo-btn--glass neuwo-btn--block");
  });

  it("swaps the control between a button and a link as href comes and goes, keeping the label", () => {
    const el = make(`<neuwo-button><b slot="start">*</b>Go</neuwo-button>`);
    el.setAttribute("href", "/docs");
    expect(control(el).localName).toBe("a");
    expect(el.querySelector(".neuwo-btn__start").innerHTML).toBe('<b slot="start">*</b>');
    expect(el.querySelector(".neuwo-btn__label").textContent).toBe("Go");
    el.removeAttribute("href");
    expect(control(el).localName).toBe("button");
    expect(el.querySelector(".neuwo-btn__label").textContent).toBe("Go");
    expect(el.querySelectorAll(".neuwo-btn")).toHaveLength(1);
  });

  it("places the label, start and end children in their wrappers", () => {
    const el = make(`<neuwo-button><span slot="start">A</span>Go<span slot="end">B</span></neuwo-button>`);
    expect(el.querySelector("slot")).toBeNull();
    expect(Array.from(control(el).children, (child) => child.className)).toEqual(["neuwo-btn__start", "neuwo-btn__label", "neuwo-btn__end"]);
    expect(el.querySelector(".neuwo-btn__start").innerHTML).toBe('<span slot="start">A</span>');
    expect(el.querySelector(".neuwo-btn__label").innerHTML).toBe("Go");
    expect(el.querySelector(".neuwo-btn__end").innerHTML).toBe('<span slot="end">B</span>');
    expect(el.textContent).toBe("AGoB");
  });

  it("forwards target, rel and download to the anchor", () => {
    const a = control(make(`<neuwo-button href="https://neuwo.ai" target="_blank" rel="noopener" download>Go</neuwo-button>`));
    expect(a.getAttribute("target")).toBe("_blank");
    expect(a.getAttribute("rel")).toBe("noopener");
    expect(a.hasAttribute("download")).toBe(true);
  });

  it("forwards aria-* and title to the inner control and keeps data-* on the host alone", () => {
    const el = make(`<neuwo-button aria-label="Save" data-track="cta" title="Save now">Go</neuwo-button>`);
    const btn = control(el);
    expect(btn.getAttribute("aria-label")).toBe("Save");
    expect(btn.getAttribute("title")).toBe("Save now");
    expect(btn.hasAttribute("data-track")).toBe(false);
    expect(Array.from(document.querySelectorAll('[data-track="cta"]'))).toEqual([el]);
  });

  it("reflects the disabled property to the attribute and inner control", () => {
    const el = make(`<neuwo-button>Go</neuwo-button>`);
    expect(el.disabled).toBe(false);
    el.disabled = true;
    expect(el.hasAttribute("disabled")).toBe(true);
    expect(control(el).disabled).toBe(true);
    el.disabled = false;
    expect(el.hasAttribute("disabled")).toBe(false);
    expect(control(el).disabled).toBe(false);
  });

  it("maps hover intensity s/l to a modifier class; m/none add none", () => {
    expect(control(make(`<neuwo-button>Go</neuwo-button>`)).className).toBe("neuwo-btn neuwo-btn--solid");
    expect(control(make(`<neuwo-button hover="m">Go</neuwo-button>`)).className).toBe("neuwo-btn neuwo-btn--solid");
    expect(control(make(`<neuwo-button hover="s">Go</neuwo-button>`)).classList.contains("neuwo-btn--hover-s")).toBe(true);
    expect(control(make(`<neuwo-button hover="l">Go</neuwo-button>`)).classList.contains("neuwo-btn--hover-l")).toBe(true);
  });

  it("reflects the hover property to the attribute", () => {
    const el = make(`<neuwo-button>Go</neuwo-button>`);
    expect(el.hover).toBe("m");
    el.hover = "s";
    expect(el.getAttribute("hover")).toBe("s");
    expect(control(el).classList.contains("neuwo-btn--hover-s")).toBe(true);
    el.hover = "";
    expect(el.hasAttribute("hover")).toBe(false);
  });

  it("enters a loading state: spinner first, aria-busy, disabled control, class", () => {
    const el = make(`<neuwo-button type="submit" loading>Save</neuwo-button>`);
    const btn = control(el);
    expect(el.loading).toBe(true);
    expect(btn.classList.contains("neuwo-btn--loading")).toBe(true);
    expect(btn.getAttribute("aria-busy")).toBe("true");
    expect(btn.disabled).toBe(true);
    expect(btn.firstElementChild.className).toBe("neuwo-btn__spinner");
    expect(btn.firstElementChild.getAttribute("aria-hidden")).toBe("true");
  });

  it("keeps the focused control while loading toggles", () => {
    const el = make(`<neuwo-button>Save</neuwo-button>`);
    const btn = control(el);
    btn.focus();
    el.loading = true;
    expect(control(el)).toBe(btn);
    expect(btn.querySelector(".neuwo-btn__spinner")).toBe(btn.firstElementChild);
    expect(el.querySelector(".neuwo-btn__label").textContent).toBe("Save");
    el.loading = false;
    expect(control(el)).toBe(btn);
    expect(el.querySelector(".neuwo-btn__spinner")).toBeNull();
    expect(btn.hasAttribute("disabled")).toBe(false);
    expect(btn.hasAttribute("aria-busy")).toBe(false);
    expect(document.activeElement).toBe(btn);
  });

  it("treats href as a value, not markup (no injection)", () => {
    const el = make(`<neuwo-button href='"><img src=x onerror=1>'>Go</neuwo-button>`);
    const a = control(el);
    expect(a.localName).toBe("a");
    expect(el.querySelector("img")).toBeNull();
    expect(a.getAttribute("href")).toBe('"><img src=x onerror=1>');
  });

  it("adopts server markup without a single mutation", async () => {
    const holder = document.createElement("div");
    holder.innerHTML = server({ variant: "outline", loading: "" }, "Save");
    const records = [];
    const observer = new MutationObserver((list) => records.push(...list));
    observer.observe(holder, { subtree: true, childList: true, attributes: true, characterData: true });
    attach(holder);
    await Promise.resolve();
    records.push(...observer.takeRecords());
    observer.disconnect();
    expect(records).toEqual([]);
    expect(holder.querySelectorAll(".neuwo-btn")).toHaveLength(1);
  });
});

describe("<neuwo-button> content set by script", () => {
  it("rebuilds a working control around text set through textContent", async () => {
    const f = document.createElement("form");
    f.innerHTML = `<neuwo-button type="submit">Save</neuwo-button>`;
    const el = attach(f).firstElementChild;
    el.textContent = "Saving";
    await Promise.resolve();
    const btn = control(el);
    expect(btn.localName).toBe("button");
    expect(btn.className).toBe("neuwo-btn neuwo-btn--solid");
    expect(el.querySelector(".neuwo-btn__label").textContent).toBe("Saving");
    expect(el.querySelectorAll(".neuwo-btn")).toHaveLength(1);
    const submits = submitsOf(f);
    btn.click();
    expect(submits).toHaveLength(1);
  });

  it("places start content and the label set through innerHTML", async () => {
    const el = make(`<neuwo-button>Go</neuwo-button>`);
    el.innerHTML = '<span slot="start">*</span>Go';
    await Promise.resolve();
    expect(el.querySelector(".neuwo-btn__start").innerHTML).toBe('<span slot="start">*</span>');
    expect(el.querySelector(".neuwo-btn__label").innerHTML).toBe("Go");
    expect(el.querySelectorAll(".neuwo-btn")).toHaveLength(1);
  });

  it("moves an appended end icon into the end wrapper", async () => {
    const el = make(`<neuwo-button>Go</neuwo-button>`);
    const btn = control(el);
    const icon = document.createElement("i");
    icon.slot = "end";
    el.append(icon);
    await Promise.resolve();
    expect(icon.parentElement.className).toBe("neuwo-btn__end");
    expect(control(el)).toBe(btn);
    expect(el.children).toHaveLength(1);
  });

  it("forwards aria-* and title a script sets later to the inner control", async () => {
    const el = make(`<neuwo-button>Go</neuwo-button>`);
    el.setAttribute("aria-pressed", "true");
    el.title = "Toggle";
    await Promise.resolve();
    expect(control(el).getAttribute("aria-pressed")).toBe("true");
    expect(control(el).getAttribute("title")).toBe("Toggle");
    el.removeAttribute("aria-pressed");
    await Promise.resolve();
    expect(control(el).hasAttribute("aria-pressed")).toBe(false);
  });

  it("places an end icon appended in the same task the button is moved", async () => {
    const el = make(`<neuwo-button>Go</neuwo-button>`);
    const other = attach(document.createElement("div"));
    const icon = document.createElement("i");
    icon.slot = "end";
    el.append(icon);
    other.append(el);
    await Promise.resolve();
    expect(icon.parentElement.className).toBe("neuwo-btn__end");
    expect(el.children).toHaveLength(1);
  });

  it("forwards an aria-label set in the same task the button is moved", () => {
    const el = make(`<neuwo-button>Delete</neuwo-button>`);
    const other = attach(document.createElement("div"));
    el.setAttribute("aria-label", "Delete row 2");
    other.append(el);
    expect(control(el).getAttribute("aria-label")).toBe("Delete row 2");
  });

  it("forwards a title set in the same task the button is removed, once it is back", () => {
    const el = make(`<neuwo-button>Go</neuwo-button>`);
    const parent = el.parentNode;
    el.title = "Later";
    el.remove();
    parent.append(el);
    expect(control(el).getAttribute("title")).toBe("Later");
  });

  it("places an end icon appended while the button was out of the document", async () => {
    const el = make(`<neuwo-button>Go</neuwo-button>`);
    const other = attach(document.createElement("div"));
    const icon = document.createElement("i");
    icon.slot = "end";
    el.remove();
    el.append(icon);
    other.append(el);
    await Promise.resolve();
    expect(icon.parentElement.className).toBe("neuwo-btn__end");
    expect(el.children).toHaveLength(1);
  });

  it("labels a button created and connected by script before it had content", async () => {
    const el = attach(document.createElement("neuwo-button"));
    expect(control(el)).not.toBeNull();
    el.textContent = "Save";
    await Promise.resolve();
    expect(control(el).localName).toBe("button");
    expect(el.querySelector(".neuwo-btn__label").textContent).toBe("Save");
    expect(el.querySelectorAll(".neuwo-btn")).toHaveLength(1);
  });
});

describe("<neuwo-button> in a form", () => {
  function form(html) {
    const el = document.createElement("form");
    el.innerHTML = html;
    return attach(el);
  }

  it("renders a native button whose form is the enclosing form", () => {
    const f = form(`<neuwo-button type="submit">Send</neuwo-button>`);
    const btn = control(f);
    expect(btn.form).toBe(f);
    expect(btn.type).toBe("submit");
  });

  it("submits its form natively when a type=submit button is activated", () => {
    const f = form(`<neuwo-button type="submit">Send</neuwo-button>`);
    const submits = submitsOf(f);
    control(f).click();
    expect(submits).toHaveLength(1);
    expect(submits[0].submitter).toBe(control(f));
  });

  it("does not submit its form from a click on the host itself", () => {
    const f = form(`<neuwo-button type="submit">Send</neuwo-button>`);
    const submits = submitsOf(f);
    f.querySelector("neuwo-button").click();
    expect(submits).toHaveLength(0);
  });

  it("submits a form it names with form= from outside it, carrying its name and value", () => {
    const signup = form("");
    signup.id = "signup";
    const host = make(`<neuwo-button type="submit" form="signup" name="plan" value="pro">Choose</neuwo-button>`);
    const btn = control(host);
    expect(btn.form).toBe(signup);
    expect(btn.name).toBe("plan");
    expect(btn.value).toBe("pro");
    const submits = submitsOf(signup);
    btn.click();
    expect(submits).toHaveLength(1);
    host.setAttribute("value", "team");
    host.removeAttribute("name");
    expect(control(host)).toBe(btn);
    expect(btn.value).toBe("team");
    expect(btn.hasAttribute("name")).toBe(false);
  });

  it("resets its form natively when a type=reset button is activated", () => {
    const f = form(`<input name="q" value="x"><neuwo-button type="reset">Reset</neuwo-button>`);
    const input = f.querySelector("input");
    input.value = "changed";
    control(f).click();
    expect(input.value).toBe("x");
  });

  it("does not submit its form when disabled, loading or a link", () => {
    for (const attrs of ["disabled", "loading", 'href="https://neuwo.ai"']) {
      const f = form(`<neuwo-button type="submit" ${attrs}>Send</neuwo-button>`);
      const submits = submitsOf(f);
      control(f).click();
      expect(submits, attrs).toHaveLength(0);
    }
  });
});

describe("<neuwo-button> under React", () => {
  it("matches buttonTemplate through every re-render, with nothing for the element to patch and no React warning", () => {
    const error = vi.spyOn(console, "error");
    const warn = vi.spyOn(console, "warn");
    const container = attach(document.createElement("div"));
    const root = createRoot(container);
    cleanup.push(() => root.unmount());
    const observer = new MutationObserver(() => {});
    observer.observe(container, { subtree: true, childList: true, attributes: true, characterData: true });
    cleanup.push(() => observer.disconnect());

    const show = (props) => {
      observer.takeRecords();
      flushSync(() => root.render(jsx("neuwo-button", { ...props, children: "Save" })));
      const host = container.firstElementChild;
      expect(host).toBeInstanceOf(NeuwoButton);
      expect(normalise(container.innerHTML, false)).toBe(normalise(server(normalizeProps(props), "Save"), true));
      const records = observer.takeRecords();
      expect(records.length, `React wrote nothing for ${JSON.stringify(props)}`).toBeGreaterThan(0);
      const last = records.at(-1);
      const reactWroteLast = last.target === container || (last.target === host && last.type === "attributes");
      expect(reactWroteLast, `the element patched after React rendered ${JSON.stringify(props)}`).toBe(true);
      return control(host);
    };

    const base = { variant: "outline", type: "submit", name: "plan", value: "pro" };
    show(base);
    expect(show({ ...base, href: "https://neuwo.ai" }).localName).toBe("a");
    const btn = show(base);
    expect(btn.localName).toBe("button");
    expect(show({ ...base, loading: true })).toBe(btn);
    expect(btn.firstElementChild.className).toBe("neuwo-btn__spinner");
    expect(show(base)).toBe(btn);
    expect(btn.querySelector(".neuwo-btn__spinner")).toBeNull();

    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  function counterApp() {
    const error = vi.spyOn(console, "error");
    const warn = vi.spyOn(console, "warn");
    const container = attach(document.createElement("div"));
    const root = createRoot(container);
    cleanup.push(() => root.unmount());
    let increment = () => {};
    function Counter({ slot }) {
      const [count, setCount] = useState(0);
      increment = () => setCount((n) => n + 1);
      return jsx("span", { slot, className: "counter", children: count });
    }
    const show = (props, slot) => flushSync(() => root.render(jsxs("neuwo-button", { ...props, children: [jsx(Counter, { slot }), "Save"] })));
    const counter = () => container.querySelector(".counter");
    return { error, warn, container, show, counter, increment: () => flushSync(() => increment()) };
  }

  it.each([
    ["in the label", undefined, "neuwo-btn__label"],
    ['in slot="start"', "start", "neuwo-btn__start"],
  ])("keeps a stateful child %s, and its DOM node, while loading toggles on and off", (_, slot, wrapper) => {
    const { error, warn, container, show, counter, increment } = counterApp();
    show({}, slot);
    increment();
    const node = counter();
    expect(node.parentElement.className).toBe(wrapper);
    expect(node.textContent).toBe("1");

    show({ loading: true }, slot);
    expect(container.querySelector(".neuwo-btn").firstElementChild.className).toBe("neuwo-btn__spinner");
    expect(counter()).toBe(node);
    expect(node.parentElement.className).toBe(wrapper);
    expect(node.textContent).toBe("1");

    show({}, slot);
    expect(container.querySelector(".neuwo-btn__spinner")).toBeNull();
    expect(counter()).toBe(node);
    expect(node.parentElement.className).toBe(wrapper);
    expect(node.textContent).toBe("1");

    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("keeps a start child that does not forward its slot prop in place across a variant change, and removes it cleanly", () => {
    const error = vi.spyOn(console, "error");
    const warn = vi.spyOn(console, "warn");
    const container = attach(document.createElement("div"));
    const root = createRoot(container);
    cleanup.push(() => root.unmount());
    const Icon = () => jsx("svg", { className: "icon", children: jsx("path", { d: "M0 0" }) });
    const show = (variant, icon) =>
      flushSync(() => root.render(jsxs("neuwo-button", { variant, children: [icon && jsx(Icon, { slot: "start" }), "Label"] })));

    show("solid", true);
    const svg = container.querySelector("svg");
    expect(svg.parentElement.className).toBe("neuwo-btn__start");
    show("outline", true);
    expect(container.querySelector("svg")).toBe(svg);
    expect(svg.parentElement.className).toBe("neuwo-btn__start");
    expect(() => show("outline", false)).not.toThrow();
    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelector(".neuwo-btn__label").textContent).toBe("Label");

    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("hands the author's ref the host element, and marks the host as React's", () => {
    const container = attach(document.createElement("div"));
    const root = createRoot(container);
    cleanup.push(() => root.unmount());
    const ref = createRef();
    const calls = [];
    const callback = (el) => {
      calls.push(el);
    };

    flushSync(() => root.render(jsx("neuwo-button", { ref, children: "Save" })));
    const host = container.firstElementChild;
    expect(host).toBeInstanceOf(NeuwoButton);
    expect(ref.current).toBe(host);
    expect(host[Symbol.for("neuwo.react")]).toBe(true);
    expect(host.hasAttribute("ref")).toBe(false);

    flushSync(() => root.render(jsx("neuwo-button", { ref: callback, children: "Save" })));
    expect(ref.current).toBeNull();
    flushSync(() => root.render(jsx("neuwo-button", { ref: callback, variant: "outline", children: "Save" })));
    flushSync(() => root.render(null));
    expect(calls).toEqual([host, null]);
  });

  it("renders a stateful child inside the link when href is added, without asserting identity because the root tag changes", () => {
    const { error, warn, container, show, counter } = counterApp();
    show({});
    show({ href: "https://neuwo.ai" });
    expect(counter().closest(".neuwo-btn").localName).toBe("a");
    show({});
    expect(counter().closest(".neuwo-btn").localName).toBe("button");
    expect(container.querySelectorAll(".counter")).toHaveLength(1);
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("button.css", () => {
  it("draws a keyboard focus ring on .neuwo-btn::after from the shadow-focus-ring token", () => {
    expect(buttonCss).toContain(".neuwo-btn:focus-visible::after");
    expect(buttonCss).toContain("var(--neuwo-shadow-focus-ring)");
  });

  it("defines the hover-emphasis presets from tokens", () => {
    expect(buttonCss).toContain(".neuwo-btn--hover-s:hover");
    expect(buttonCss).toContain(".neuwo-btn--hover-l:hover");
    expect(buttonCss).toContain("var(--neuwo-shadow-glow)");
  });

  it("keeps a solid link button white on hover over typography's a:hover", () => {
    expect(buttonCss).toMatch(/\.neuwo-btn--solid:hover \{[^}]*color: var\(--neuwo-color-white\);/);
  });

  it("lays the control out with a gap token for icons", () => {
    expect(buttonCss).toContain("gap: var(--neuwo-space-2)");
  });

  it("keeps the region wrappers out of the flex layout", () => {
    expect(buttonCss).toMatch(/\.neuwo-btn__start,\s*\.neuwo-btn__label,\s*\.neuwo-btn__end\s*\{\s*display: contents;/);
  });

  it("styles the outer box on the element name and stretches block buttons", () => {
    expect(buttonCss).toMatch(/(^|\n)neuwo-button \{[^}]*display: inline-flex;/);
    expect(buttonCss).toMatch(/neuwo-button\[disabled\] \{[^}]*cursor: not-allowed;/);
    expect(buttonCss).toMatch(/neuwo-button\[block\]:not\(\[hidden\]\) \{[^}]*display: flex;[^}]*width: 100%;/);
    expect(buttonCss).not.toMatch(/neuwo-button\[block\] \{/);
    expect(buttonCss).toMatch(/\.neuwo-btn--block \{[^}]*width: 100%;/);
  });

  it("defines the spinner keyframe with a reduced-motion guard", () => {
    expect(buttonCss).toContain(".neuwo-btn__spinner");
    expect(buttonCss).toContain("@keyframes neuwo-button-spin");
    expect(buttonCss).toContain("animation: neuwo-button-spin");
    expect(buttonCss).toMatch(/prefers-reduced-motion: reduce/);
  });

  it("uses tokens, not raw colours, and no shadow-only selectors", () => {
    expect(buttonCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(buttonCss).not.toMatch(/:host|::part|::slotted/);
    expect(buttonCss).not.toMatch(/\.btn\b/);
  });
});
