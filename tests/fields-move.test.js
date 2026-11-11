import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import "../src/index.js";

const served = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures/server-component-fields.html"), "utf8");

const seen = [];
// Module scope keeps it alive: happy-dom holds an observer's callback in a WeakRef.
const collect = (records) => void seen.push(...records);

const cleanup = [];
afterEach(() => {
  while (cleanup.length) cleanup.pop()();
  seen.length = 0;
});

/** @param {MutationRecord} record */
function describeRecord(record) {
  const target = record.target.nodeType === 1 ? `${record.target.localName}.${record.target.className}` : `text in ${record.target.parentElement?.className}`;
  if (record.type === "attributes") return `${target} ${record.attributeName}: ${record.oldValue} -> ${record.target.getAttribute(record.attributeName)}`;
  if (record.type === "characterData") return `${target} text: ${record.oldValue}`;
  return `${target} children: +${record.addedNodes.length} -${record.removedNodes.length}`;
}

describe("server-rendered fields whose hosts carry no value, moved after adoption as React reveals a Suspense boundary", () => {
  it("writes nothing inside the hosts and keeps the form data, the range fill and the combobox display", () => {
    const hidden = document.createElement("div");
    hidden.hidden = true;
    const parsed = document.createElement("div");
    parsed.innerHTML = served;
    hidden.append(...parsed.childNodes);
    const slot = document.body.appendChild(document.createElement("main"));
    document.body.append(hidden);
    cleanup.push(() => slot.remove(), () => hidden.remove());
    const form = hidden.querySelector("form");
    const state = () => ({
      formData: [...new FormData(form)],
      fill: form.querySelector("#s-volume .neuwo-range").style.getPropertyValue("--neuwo-range-fill"),
      shown: form.querySelector("#s-region .neuwo-combobox__value").textContent,
    });
    const before = state();
    const observer = new MutationObserver(collect);
    observer.observe(form, { subtree: true, childList: true, attributes: true, attributeOldValue: true, characterData: true, characterDataOldValue: true });
    slot.insertBefore(form, null);
    collect(observer.takeRecords());
    observer.disconnect();
    expect(form.parentElement).toBe(slot);
    expect(seen.map(describeRecord)).toEqual([]);
    expect(state()).toEqual(before);
    expect(state()).toMatchObject({ fill: "30%", shown: "EU" });
    expect(before.formData).toEqual([
      ["email", "ada@example.com"],
      ["bio", "\n\nFirst line\nSecond & <third>"],
      ["volume", "30"],
      ["region", "eu"],
    ]);
  });
});
