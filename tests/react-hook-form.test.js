// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import "../src/index.js";
import { jsx } from "../src/react/jsx-runtime.js";
import { useForm } from "./fixtures/react-hook-form.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const cleanup = [];
afterEach(() => {
  while (cleanup.length) cleanup.pop()();
  vi.restoreAllMocks();
});

/** @param {unknown} element */
async function render(element) {
  const container = document.body.appendChild(document.createElement("div"));
  cleanup.push(() => container.remove());
  const root = createRoot(container);
  cleanup.unshift(() => act(() => root.unmount()));
  await act(async () => root.render(element));
  return container;
}

const inputOf = (el) => el.querySelector(":scope > .neuwo-choice > label > input");
const labelOf = (el) => el.querySelector(":scope > .neuwo-choice > label");

// jsdom, since React Hook Form asks `"value" in element.attributes`, which happy-dom answers false.
describe("<neuwo-checkbox> and <neuwo-toggle> with React Hook Form's register, in jsdom", () => {
  it("registers the element as a checkbox and reads a checked one's value, then false once it is unchecked", async () => {
    const errors = vi.spyOn(console, "error");
    const form = useForm();
    const container = await render(jsx("form", { children: jsx("neuwo-checkbox", { ...form.register("terms"), value: "yes", defaultChecked: true, children: "Accept" }) }));
    const host = container.querySelector("neuwo-checkbox");
    expect(form.fields.terms.refs).toEqual([host]);
    expect(form.values.terms).toBe("yes");
    await act(async () => inputOf(host).click());
    expect(form.values.terms).toBe(false);
    await act(async () => inputOf(host).click());
    expect(form.values.terms).toBe("yes");
    expect(errors).not.toHaveBeenCalled();
  });

  it("reads an unchecked one as false, and a checked one with no value as true, as a native checkbox", async () => {
    const errors = vi.spyOn(console, "error");
    const form = useForm();
    const container = await render(jsx("neuwo-toggle", { ...form.register("notify"), children: "Notify" }));
    const host = container.querySelector("neuwo-toggle");
    expect(form.fields.notify.refs).toEqual([host]);
    expect(form.values.notify).toBe(false);
    await act(async () => labelOf(host).click());
    expect(form.values.notify).toBe(true);
    expect(errors).not.toHaveBeenCalled();
  });

  it("resets to the default values, restoring checkedness without writing a value attribute on the element", async () => {
    const errors = vi.spyOn(console, "error");
    const form = useForm({ terms: true, news: false });
    const container = await render(
      jsx("form", {
        children: [
          jsx("neuwo-checkbox", { ...form.register("terms"), value: "yes", children: "Accept" }, "terms"),
          jsx("neuwo-checkbox", { ...form.register("news"), defaultChecked: true, children: "News" }, "news"),
        ],
      }),
    );
    const [terms, news] = container.querySelectorAll("neuwo-checkbox");
    expect([inputOf(terms).checked, inputOf(news).checked]).toEqual([true, true]);
    expect(form.values).toEqual({ terms: true, news: true });
    await act(async () => inputOf(terms).click());
    await act(async () => inputOf(news).click());
    expect(form.values).toEqual({ terms: false, news: false });
    await act(async () => form.reset());
    expect([inputOf(terms).checked, inputOf(news).checked]).toEqual([true, true]);
    expect(form.values).toEqual({ terms: true, news: true });
    expect(terms.getAttribute("value")).toBe("yes");
    expect(news.hasAttribute("value")).toBe(false);
    await act(async () => inputOf(terms).click());
    await act(async () => inputOf(terms).click());
    expect(form.values.terms).toBe("yes");
    expect(errors).not.toHaveBeenCalled();
  });
});
