import { afterEach, describe, expect, it, vi } from "vitest";
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
  vi.unstubAllGlobals();
});

function mount(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  cleanup.push(host);
  return host;
}

// Microtasks only: happy-dom holds an observer's callback in a WeakRef, so a GC between tasks can silence it.
async function settled() {
  for (let turn = 0; turn < 3; turn++) await Promise.resolve();
}

function countObservers() {
  const counts = { created: 0, calls: 0 };
  const Native = globalThis.MutationObserver;
  vi.stubGlobal(
    "MutationObserver",
    class extends Native {
      constructor(callback) {
        super((records, observer) => {
          counts.calls++;
          callback(records, observer);
        });
        counts.created++;
      }
    },
  );
  return counts;
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

  it("adopts markup the host's attributes would not render, writing nothing, when an upgrade's attribute callbacks come first", () => {
    const tag = "test-order-mismatch";
    class Order extends TestLight {
      connectedCallback() {}
      run() {
        super.connectedCallback();
      }
    }
    define(tag, Order);
    const host = document.createElement("div");
    host.innerHTML = `<${tag} tone="b"><span class="neuwo-t neuwo-t--a"><span class="neuwo-t__start"></span><span class="neuwo-t__body">hi</span></span></${tag}>`;
    document.body.appendChild(host);
    cleanup.push(host);
    const el = host.firstElementChild;
    const observer = new MutationObserver(() => {});
    observer.observe(host, { subtree: true, childList: true, attributes: true, characterData: true });
    el.attributeChangedCallback("tone", null, "b");
    el.run();
    expect(observer.takeRecords()).toHaveLength(0);
    expect(el.querySelector(".neuwo-t").className).toBe("neuwo-t neuwo-t--a");
    el.setAttribute("tone", "c");
    expect(el.querySelector(".neuwo-t").className).toBe("neuwo-t neuwo-t--c");
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

    it("renders nothing from an upgrade's attribute callbacks, so server markup streamed in later is adopted once", async () => {
      class Upgrade extends TestLight {
        connectedCallback() {}
        run() {
          super.connectedCallback();
        }
      }
      define("test-upgrade", Upgrade);
      loading();
      const el = mount(`<test-upgrade tone="b"></test-upgrade>`).firstElementChild;
      el.attributeChangedCallback("tone", null, "b");
      el.run();
      expect(el.querySelector(".neuwo-t")).toBeNull();
      const detached = document.createElement("div");
      detached.innerHTML = server("b").replace(/^<test-light tone="b">|<\/test-light>$/g, "");
      el.append(...detached.childNodes);
      await settled();
      delete document.readyState;
      document.dispatchEvent(new Event("DOMContentLoaded"));
      await settled();
      expect(el.querySelectorAll(".neuwo-t")).toHaveLength(1);
      expect(el.querySelector(".neuwo-t__body").textContent).toBe("hi");
      expect(el.connected).toBe(1);
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

  describe("content a script sets after render", () => {
    it("reconciles each script change once, never in response to its own writes", async () => {
      const counts = countObservers();
      const el = document.createElement("test-light");
      mount("").appendChild(el);
      expect(counts.created).toBe(1);
      const icon = document.createElement("i");
      icon.slot = "start";
      el.append(icon);
      await settled();
      expect(counts.calls).toBe(1);
      expect(icon.parentElement.className).toBe("neuwo-t__start");
      el.textContent = "y";
      await settled();
      expect(counts.calls).toBe(2);
      expect(el.querySelector(".neuwo-t__body").textContent).toBe("y");
      expect(el.querySelectorAll(".neuwo-t")).toHaveLength(1);
    });

    it("leaves a connected host that has not started alone on an attribute change, and its first connect renders the attributes", () => {
      define("test-idle", class extends TestLight {
        connectedCallback() {}
        run() {
          super.connectedCallback();
        }
      });
      const el = mount(`<test-idle>hi</test-idle>`).firstElementChild;
      el.setAttribute("tone", "b");
      expect(el.querySelector(".neuwo-t")).toBeNull();
      el.run();
      expect(el.querySelector(".neuwo-t").className).toBe("neuwo-t neuwo-t--b");
      expect(el.querySelector(".neuwo-t__body").textContent).toBe("hi");
    });

    it("places a child a script appended just before an observed attribute changed", async () => {
      const el = mount(server()).firstElementChild;
      const icon = document.createElement("i");
      icon.slot = "start";
      el.append(icon);
      el.setAttribute("tone", "b");
      expect(icon.parentElement.className).toBe("neuwo-t__start");
      await settled();
      expect(el.innerHTML).toBe('<span class="neuwo-t neuwo-t--b"><span class="neuwo-t__start"><i slot="start"></i></span><span class="neuwo-t__body">hi</span></span>');
    });

    it("stops observing when disconnected and observes again, with one observer, when reconnected", async () => {
      const counts = countObservers();
      const el = mount(server()).firstElementChild;
      el.remove();
      el.textContent = "y";
      await settled();
      expect(el.innerHTML).toBe("y");
      expect(counts.calls).toBe(0);
      mount("").appendChild(el);
      expect(counts.created).toBe(2);
      el.textContent = "z";
      await settled();
      expect(counts.calls).toBe(1);
      expect(el.querySelector(".neuwo-t__body").textContent).toBe("z");
    });

    it("renders text a script set just before an observed attribute changed in the same task", async () => {
      const el = mount(server()).firstElementChild;
      el.textContent = "y";
      el.setAttribute("tone", "b");
      const rendered = '<span class="neuwo-t neuwo-t--b"><span class="neuwo-t__start"></span><span class="neuwo-t__body">y</span></span>';
      expect(el.innerHTML).toBe(rendered);
      await settled();
      expect(el.innerHTML).toBe(rendered);
    });

    it.each([
      ["the JSX runtime's marker", Symbol.for("neuwo.react")],
      ["React DOM's fiber property", "__reactFiber$test"],
    ])("gives a host React owns, known by %s, no observer, so its script writes stay as written", async (_, key) => {
      const counts = countObservers();
      const el = document.createElement("test-light");
      el[key] = true;
      mount("").appendChild(el);
      el.textContent = "y";
      await settled();
      expect(counts.created).toBe(0);
      expect(el.innerHTML).toBe("y");
    });

    it.each([
      ["the JSX runtime's marker", Symbol.for("neuwo.react")],
      ["React DOM's fiber property", "__reactFiber$test"],
    ])("stops reconciling a host React takes over after connect, known by %s", async (_, key) => {
      const counts = countObservers();
      const el = mount(server()).firstElementChild;
      el[key] = true;
      el.textContent = "y";
      await settled();
      expect(el.innerHTML).toBe("y");
      el.textContent = "z";
      await settled();
      expect(el.innerHTML).toBe("z");
      expect(counts.calls).toBe(1);
    });
  });
});

describe("updated() and refresh()", () => {
  class Updating extends TestLight {
    updates = 0;
    classes = [];
    connectedAtUpdate = [];
    updated() {
      this.updates++;
      this.classes.push(this.querySelector(".neuwo-t").className);
      this.connectedAtUpdate.push(this.connected);
    }
  }
  define("test-updated", Updating);
  const served = (tag = "test-updated") => server().replaceAll("test-light", tag);

  it("runs updated once after an observed attribute change, after the patch", () => {
    const el = mount(served()).firstElementChild;
    el.setAttribute("tone", "b");
    expect(el.updates).toBe(1);
    expect(el.classes).toEqual(["neuwo-t neuwo-t--b"]);
  });

  it("runs updated once after a child change the observer reconciles", async () => {
    const el = mount(served()).firstElementChild;
    const icon = document.createElement("i");
    icon.slot = "start";
    el.append(icon);
    await settled();
    expect(icon.parentElement.className).toBe("neuwo-t__start");
    expect(el.updates).toBe(1);
  });

  it("reconciles at once on refresh, then runs updated once", async () => {
    const el = mount(served()).firstElementChild;
    const icon = document.createElement("i");
    icon.slot = "start";
    el.append(icon);
    el.refresh();
    expect(icon.parentElement.className).toBe("neuwo-t__start");
    expect(el.updates).toBe(1);
    await settled();
    expect(el.updates).toBe(1);
  });

  it("runs updated once, after connect, following the reconcile a reconnect performs", () => {
    const el = mount(served()).firstElementChild;
    el.remove();
    el.setAttribute("tone", "b");
    expect(el.updates).toBe(0);
    mount("").appendChild(el);
    expect(el.querySelector(".neuwo-t").className).toBe("neuwo-t neuwo-t--b");
    expect(el.updates).toBe(1);
    expect(el.classes).toEqual(["neuwo-t neuwo-t--b"]);
    expect(el.connectedAtUpdate).toEqual([2]);
  });

  it("does not run updated on render or adopt", () => {
    const rendered = document.createElement("test-updated");
    mount("").appendChild(rendered);
    const adopted = mount(served()).firstElementChild;
    expect(rendered.querySelector(".neuwo-t")).not.toBeNull();
    expect(rendered.updates).toBe(0);
    expect(adopted.updates).toBe(0);
  });

  it("does not run updated when an attribute callback adopts before the connect logic, as an upgrade does", () => {
    class Upgrading extends Updating {
      connectedCallback() {}
      run() {
        super.connectedCallback();
      }
    }
    define("test-updated-upgrade", Upgrading);
    const el = mount(served("test-updated-upgrade")).firstElementChild;
    el.attributeChangedCallback("tone", null, "a");
    el.run();
    expect(el.updates).toBe(0);
  });

  it.each([
    ["the JSX runtime's marker", Symbol.for("neuwo.react")],
    ["React DOM's fiber property", "__reactFiber$test"],
  ])("neither reconciles nor runs updated on a host React owns, known by %s", (_, key) => {
    const el = mount(served()).firstElementChild;
    el[key] = true;
    el.setAttribute("tone", "b");
    el.refresh();
    expect(el.querySelector(".neuwo-t").className).toBe("neuwo-t neuwo-t--a");
    expect(el.updates).toBe(0);
  });

  it("leaves a disconnected host, and a connected one that has not rendered, alone on refresh", () => {
    const gone = mount(served()).firstElementChild;
    gone.remove();
    gone.textContent = "y";
    gone.refresh();
    expect(gone.innerHTML).toBe("y");
    define("test-updated-idle", class extends Updating {
      connectedCallback() {}
    });
    const idle = mount(`<test-updated-idle>hi</test-updated-idle>`).firstElementChild;
    idle.refresh();
    expect(idle.innerHTML).toBe("hi");
    expect(gone.updates + idle.updates).toBe(0);
  });

  describe("while the document is still parsing", () => {
    afterEach(() => delete document.readyState);

    it("neither reconciles nor runs updated until DOMContentLoaded, and not on the render that follows", () => {
      Object.defineProperty(document, "readyState", { configurable: true, get: () => "loading" });
      const el = document.createElement("test-updated");
      mount("").appendChild(el);
      el.append("hi");
      el.setAttribute("tone", "b");
      el.refresh();
      expect(el.querySelector(".neuwo-t")).toBeNull();
      delete document.readyState;
      document.dispatchEvent(new Event("DOMContentLoaded"));
      expect(el.querySelector(".neuwo-t").className).toBe("neuwo-t neuwo-t--b");
      expect(el.updates).toBe(0);
    });
  });
});
