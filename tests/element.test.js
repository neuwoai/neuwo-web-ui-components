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

  it("adopts markup for an element defined after it was inserted, without mutations", () => {
    const tag = "test-late";
    const host = document.createElement("div");
    host.innerHTML = `<${tag} tone="b"><span class="neuwo-t neuwo-t--b"><span class="neuwo-t__start"></span><span class="neuwo-t__body">hi</span></span></${tag}>`;
    document.body.appendChild(host);
    cleanup.push(host);
    const observer = new MutationObserver(() => {});
    observer.observe(host, { subtree: true, childList: true, attributes: true, characterData: true });
    define(tag, class extends TestLight {});
    expect(observer.takeRecords().length).toBe(0);
    expect(host.firstElementChild.connected).toBe(1);
    expect(host.querySelectorAll(".neuwo-t").length).toBe(1);
  });

  it("adopts when attributeChangedCallback runs before connect logic, as the browser upgrade does", () => {
    const tag = "test-order";
    class Order extends TestLight {
      connectedCallback() {}
      run() {
        super.connectedCallback();
      }
    }
    define(tag, Order);
    const host = document.createElement("div");
    host.innerHTML = `<${tag} tone="b"><span class="neuwo-t neuwo-t--b"><span class="neuwo-t__start"></span><span class="neuwo-t__body">hi</span></span></${tag}>`;
    document.body.appendChild(host);
    cleanup.push(host);
    const el = host.firstElementChild;
    const observer = new MutationObserver(() => {});
    observer.observe(host, { subtree: true, childList: true, attributes: true, characterData: true });
    el.attributeChangedCallback("tone", null, "b");
    el.run();
    expect(observer.takeRecords().length).toBe(0);
    expect(el.connected).toBe(1);
    expect(host.querySelectorAll(".neuwo-t").length).toBe(1);
  });

  describe("while the document is still parsing", () => {
    const loading = () => Object.defineProperty(document, "readyState", { configurable: true, get: () => "loading" });
    afterEach(() => delete document.readyState);

    const parse = () => {
      loading();
      const host = mount("");
      const el = document.createElement("test-light");
      host.appendChild(el);
      const observer = new MutationObserver(() => {});
      observer.observe(host, { subtree: true, childList: true, attributes: true, characterData: true });
      return { host, el, observer };
    };

    it("adopts server markup appended after connect, exactly once", () => {
      const { host, el, observer } = parse();
      expect(el.querySelectorAll(".neuwo-t").length).toBe(0);
      const detached = document.createElement("div");
      detached.innerHTML = server().replace(/^<test-light>|<\/test-light>$/g, "");
      el.append(...detached.childNodes);
      observer.takeRecords();
      delete document.readyState;
      document.dispatchEvent(new Event("DOMContentLoaded"));
      expect(observer.takeRecords().length).toBe(0);
      expect(host.querySelectorAll(".neuwo-t").length).toBe(1);
      expect(el.connected).toBe(1);
    });

    it("renders an unexpanded element at DOMContentLoaded", () => {
      const { el } = parse();
      el.append("plain");
      delete document.readyState;
      document.dispatchEvent(new Event("DOMContentLoaded"));
      expect(el.querySelectorAll(".neuwo-t").length).toBe(1);
      expect(el.querySelector(".neuwo-t__body").textContent).toBe("plain");
      expect(el.connected).toBe(1);
    });

    it("does nothing when disconnected before DOMContentLoaded", () => {
      const { el } = parse();
      el.remove();
      delete document.readyState;
      document.dispatchEvent(new Event("DOMContentLoaded"));
      expect(el.querySelector(".neuwo-t")).toBeNull();
      expect(el.connected).toBe(0);
      expect(el.disconnected).toBe(0);
    });
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

  it.each([
    ["the JSX runtime's marker", Symbol.for("neuwo.react")],
    ["React DOM's fiber property", "__reactFiber$test"],
  ])("writes nothing into a host React owns, known by %s, through attribute changes and moves, and still connects", (_, key) => {
    const a = mount(server());
    const b = mount("");
    const el = a.firstElementChild;
    el[key] = true;
    const observer = new MutationObserver(() => {});
    observer.observe(el, { subtree: true, childList: true, attributes: true, characterData: true });
    el.setAttribute("tone", "b");
    b.appendChild(el);
    const records = observer.takeRecords().filter((record) => record.target !== el || record.attributeName !== "tone");
    expect(records.length).toBe(0);
    expect(el.querySelector(".neuwo-t").className).toBe("neuwo-t neuwo-t--a");
    expect(el.connected).toBe(2);
    expect(el.disconnected).toBe(1);
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
