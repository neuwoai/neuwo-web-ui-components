import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const served = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures/server-component-fields.html"), "utf8");

const seen = [];
// Module scope keeps it alive: happy-dom holds an observer's callback in a WeakRef.
const collect = (records) => void seen.push(...records);

// happy-dom upgrades without the attribute callbacks a browser runs before connectedCallback, so they are replayed here.
function upgradeAsBrowsersDo() {
  const define = customElements.define.bind(customElements);
  vi.spyOn(customElements, "define").mockImplementation((name, ctor, options) => {
    const connected = ctor.prototype.connectedCallback;
    const upgraded = new WeakSet();
    ctor.prototype.connectedCallback = function () {
      if (!upgraded.has(this)) {
        upgraded.add(this);
        for (const { name: attr, value } of Array.from(this.attributes)) {
          if (ctor.observedAttributes.includes(attr)) this.attributeChangedCallback(attr, null, value);
        }
      }
      connected.call(this);
    };
    define(name, ctor, options);
  });
}

/** @param {MutationRecord} record */
function describeRecord(record) {
  const target = record.target.nodeType === 1 ? `${record.target.localName}.${record.target.className}` : `text in ${record.target.parentElement?.className}`;
  if (record.type === "attributes") return `${target} ${record.attributeName}: ${record.oldValue} -> ${record.target.getAttribute(record.attributeName)}`;
  if (record.type === "characterData") return `${target} text: ${record.oldValue}`;
  return `${target} children: +${record.addedNodes.length} -${record.removedNodes.length}`;
}

describe("server-rendered fields whose hosts carry no value, upgraded when the elements are defined", () => {
  const container = document.createElement("div");
  const state = () => {
    const range = container.querySelector("#s-volume .neuwo-range");
    return {
      formData: [...new FormData(container.querySelector("form"))],
      fill: range.style.getPropertyValue("--neuwo-range-fill"),
      shown: container.querySelector("#s-region .neuwo-combobox__value").textContent,
      placeholder: container.querySelector("#s-region .neuwo-combobox__trigger").hasAttribute("data-placeholder"),
    };
  };
  let before;

  beforeAll(async () => {
    container.innerHTML = served;
    document.body.append(container);
    for (const tag of ["neuwo-input", "neuwo-textarea", "neuwo-range", "neuwo-combobox"]) expect(customElements.get(tag)).toBeUndefined();
    before = state();
    const observer = new MutationObserver(collect);
    observer.observe(container, { subtree: true, childList: true, attributes: true, attributeOldValue: true, characterData: true, characterDataOldValue: true });
    upgradeAsBrowsersDo();
    await import("../src/components/fields/input/neuwo-input.js");
    await import("../src/components/fields/textarea/neuwo-textarea.js");
    await import("../src/components/fields/range/neuwo-range.js");
    await import("../src/components/fields/combobox/neuwo-combobox.js");
    collect(observer.takeRecords());
    observer.disconnect();
  });

  afterAll(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  it("upgrades all four", () => {
    for (const tag of ["neuwo-input", "neuwo-textarea", "neuwo-range", "neuwo-combobox"]) {
      expect(container.querySelector(tag)).toBeInstanceOf(customElements.get(tag));
    }
  });

  it("writes nothing inside the hosts", () => {
    expect(seen.map(describeRecord)).toEqual([]);
  });

  it("keeps the form data, the range fill and the combobox display as served", () => {
    expect(before.formData.map(([name]) => name)).toEqual(["email", "bio", "volume", "region"]);
    expect(before.formData[0][1]).toBe("ada@example.com");
    expect(state()).toEqual(before);
    expect(state()).toMatchObject({ fill: "30%", shown: "EU", placeholder: false });
  });
});
