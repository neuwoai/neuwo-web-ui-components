import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import "../src/index.js";
import { expand } from "../src/server/index.js";
import { jsx } from "../src/react/jsx-runtime.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const REFERENCES = ["for", "aria-describedby", "aria-controls", "aria-labelledby", "aria-activedescendant"];
const FIELDS =
  `<neuwo-input name="email" label="Email" error="Bad"></neuwo-input>` +
  `<neuwo-combobox name="plan" label="Plan" error="Pick one"><option>A</option><optgroup label="Paid"><option>B</option></optgroup></neuwo-combobox>`;

const cleanup = [];
afterEach(() => {
  while (cleanup.length) cleanup.pop()();
  vi.restoreAllMocks();
});

function form(html) {
  const holder = document.createElement("form");
  holder.innerHTML = html;
  document.body.append(holder);
  cleanup.push(() => holder.remove());
  return holder;
}

/** @param {Element} host */
const referencesOf = (host) =>
  Array.from(host.querySelectorAll("*")).flatMap((el) => REFERENCES.flatMap((name) => el.getAttribute(name)?.split(/\s+/).filter(Boolean) ?? []));

/** @param {Element} host */
const controlOf = (host) => host.querySelector(host.localName === "neuwo-combobox" ? ".neuwo-combobox__trigger" : ".neuwo-input");

function expectOwnIds(hosts) {
  const ids = Array.from(document.querySelectorAll("[id]"), (el) => el.id);
  expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
  for (const host of hosts) {
    expect(referencesOf(host).length).toBeGreaterThan(0);
    for (const id of referencesOf(host)) expect(host.contains(document.getElementById(id)), `${host.localName} ${id}`).toBe(true);
  }
}

describe("fields copied with cloneNode(true)", () => {
  for (const [source, html] of [
    ["rendered by the elements", FIELDS],
    ["served", expand(FIELDS)],
  ]) {
    for (const where of ["after", "before"]) {
      it(`give a copy of fields ${source} its own ids when it goes ${where} the originals`, () => {
        const holder = form(html);
        const originals = Array.from(holder.children);
        const copies = originals.map((host) => /** @type {Element} */ (host.cloneNode(true)));
        if (where === "after") holder.append(...copies);
        else holder.prepend(...copies);
        const hosts = [...originals, ...copies];
        expectOwnIds(hosts);
        const clicked = [];
        for (const host of hosts) controlOf(host).addEventListener("click", () => clicked.push(host));
        for (const host of hosts) {
          const label = host.querySelector("label");
          expect(label.control).toBe(controlOf(host));
          label.click();
          expect(clicked.splice(0)).toEqual([host]);
          host.close?.();
        }
      });
    }
  }

  for (const [source, html] of [
    ["rendered by the elements", FIELDS],
    ["served", expand(FIELDS)],
  ]) {
    for (const [when, wait] of [
      ["in the same task", () => undefined],
      ["in a later task", () => new Promise((resolve) => setTimeout(resolve, 0))],
    ]) {
      it(`apply attributes set on a copy of fields ${source} ${when}, before it is inserted`, async () => {
        const holder = form(html);
        const originals = Array.from(holder.children);
        const copies = originals.map((host) => /** @type {Element} */ (host.cloneNode(true)));
        await wait();
        for (const [index, copy] of copies.entries()) {
          copy.setAttribute("name", `copy-${index}`);
          copy.removeAttribute("error");
        }
        holder.append(...copies);
        for (const [index, copy] of copies.entries()) {
          expect(copy.control.name, copy.localName).toBe(`copy-${index}`);
          expect(copy.querySelector(".neuwo-field__error").textContent, copy.localName).toBe("");
          expect(controlOf(copy).hasAttribute("aria-invalid"), copy.localName).toBe(false);
        }
        expect(originals.map((host) => host.control.name)).toEqual(["email", "plan"]);
        expect(originals.map((host) => host.querySelector(".neuwo-field__error").textContent)).toEqual(["Bad", "Pick one"]);
        expect(originals.map((host) => controlOf(host).getAttribute("aria-invalid"))).toEqual(["true", "true"]);
        expectOwnIds([...originals, ...copies]);
      });
    }
  }

  it("keeps the copy's ids through a later change", async () => {
    const holder = form(FIELDS);
    const copies = Array.from(holder.children, (host) => /** @type {Element} */ (host.cloneNode(true)));
    holder.append(...copies);
    for (const copy of copies) copy.setAttribute("error", "Still bad");
    await Promise.resolve();
    expectOwnIds(Array.from(holder.children));
  });
});

describe("React roots served without identifierPrefix", () => {
  it("keep React's ids when the elements adopt them before hydration, with no console.error", async () => {
    const errors = vi.spyOn(console, "error");
    const tree = () => jsx("neuwo-input", { name: "email", label: "Email", error: "Bad", defaultValue: "a" });
    const containers = [0, 1].map(() => {
      const container = document.createElement("div");
      container.innerHTML = renderToString(tree());
      document.body.append(container);
      cleanup.push(() => container.remove());
      return container;
    });
    const ids = () => containers.map((container) => Array.from(container.querySelectorAll("[id]"), (el) => el.id));
    const served = ids();
    expect(served[0]).toEqual(served[1]);
    expect(served[0][0]).toMatch(/^neuwo_R_/);
    for (const container of containers) expect(container.firstElementChild).toBeInstanceOf(customElements.get("neuwo-input"));
    const roots = [];
    for (const container of containers) {
      await act(async () => {
        roots.push(hydrateRoot(container, tree()));
      });
    }
    cleanup.push(() => roots.forEach((root) => act(() => root.unmount())));
    expect(ids()).toEqual(served);
    expect(errors).not.toHaveBeenCalled();
  });
});
