import { afterEach, describe, expect, it } from "vitest";
import { h, region } from "../src/core/template.js";
import { NeuwoElement, define } from "../src/core/element.js";

const template = (a) =>
  h(
    "span",
    { class: `neuwo-t neuwo-t--${a.tone ?? "a"}` },
    h("span", { class: "neuwo-t__start" }, region("start")),
    h("span", { class: "neuwo-t__body" }, region()),
  );

class TestLight extends NeuwoElement {
  static template = template;
  static observedAttributes = ["tone"];
  connected = 0;
  disconnected = 0;
  connect() {
    this.connected++;
  }
  disconnect() {
    this.disconnected++;
  }
}

const cleanup = [];
afterEach(() => {
  while (cleanup.length) cleanup.pop().remove();
});

function mount(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  cleanup.push(host);
  return host;
}

const server = (tone = "a") =>
  `<test-light${tone === "a" ? "" : ` tone="${tone}"`}><span class="neuwo-t neuwo-t--${tone}"><span class="neuwo-t__start"></span><span class="neuwo-t__body">hi</span></span></test-light>`;

describe("NeuwoElement (light DOM)", () => {
  it("define registers once and is idempotent", () => {
    define("test-light", TestLight);
    define("test-light", TestLight);
    expect(customElements.get("test-light")).toBe(TestLight);
  });

  it("renders once when created by script and connected", () => {
    const el = document.createElement("test-light");
    el.textContent = "hi";
    const host = mount("");
    host.appendChild(el);
    expect(el.shadowRoot).toBeNull();
    expect(el.querySelectorAll(".neuwo-t").length).toBe(1);
    expect(el.querySelector(".neuwo-t__body").textContent).toBe("hi");
    expect(el.connected).toBe(1);
  });

  it("adopts server markup without a single mutation", async () => {
    const host = document.createElement("div");
    host.innerHTML = server();
    const seen = [];
    const observer = new MutationObserver((records) => seen.push(...records));
    observer.observe(host, { subtree: true, childList: true, attributes: true, characterData: true });
    document.body.appendChild(host);
    cleanup.push(host);
    await Promise.resolve();
    seen.push(...observer.takeRecords());
    expect(seen.length).toBe(0);
    expect(host.firstElementChild.connected).toBe(1);
  });

  it("adopts server markup with attributes through the upgrade path without mutations", () => {
    const tag = "test-late";
    const host = document.createElement("div");
    host.innerHTML = `<${tag} tone="b"><span class="neuwo-t neuwo-t--b"><span class="neuwo-t__start"></span><span class="neuwo-t__body">hi</span></span></${tag}>`;
    document.body.appendChild(host);
    cleanup.push(host);
    const observer = new MutationObserver(() => {});
    observer.observe(host, { subtree: true, childList: true, attributes: true, characterData: true });
    class Late extends TestLight {}
    define(tag, Late);
    expect(observer.takeRecords().length).toBe(0);
    expect(host.firstElementChild.connected).toBe(1);
    expect(host.querySelectorAll(".neuwo-t").length).toBe(1);
  });

  it("does not render again when moved", () => {
    const a = mount("");
    const b = mount("");
    const el = document.createElement("test-light");
    a.appendChild(el);
    b.appendChild(el);
    expect(el.querySelectorAll(".neuwo-t").length).toBe(1);
    expect(el.disconnected).toBe(1);
    expect(el.connected).toBe(2);
  });

  it("does not nest when re-inserted through outerHTML", () => {
    const host = mount(server());
    const el = host.firstElementChild;
    const detached = document.createElement("div");
    detached.innerHTML = el.outerHTML;
    host.replaceChildren(...detached.childNodes);
    expect(host.querySelectorAll(".neuwo-t").length).toBe(1);
  });

  it("patches exactly one attribute on an attribute change", () => {
    const host = mount(server());
    const el = host.firstElementChild;
    const root = el.firstElementChild;
    const observer = new MutationObserver(() => {});
    observer.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
    el.setAttribute("tone", "b");
    const records = observer.takeRecords();
    expect(records.length).toBe(1);
    expect(records[0].attributeName).toBe("class");
    expect(el.firstElementChild).toBe(root);
    expect(root.className).toBe("neuwo-t neuwo-t--b");
  });
});
