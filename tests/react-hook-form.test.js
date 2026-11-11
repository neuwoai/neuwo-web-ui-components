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

describe("<neuwo-radio-group> with React Hook Form's register, in jsdom", () => {
  const radioOf = (group, value) => group.querySelector(`neuwo-radio[value="${value}"] > .neuwo-form-check > input`);
  const radios = () => [
    jsx("neuwo-radio", { value: "free", children: "Free" }, "free"),
    jsx("neuwo-radio", { value: "pro", children: "Pro" }, "pro"),
  ];

  it("registers the group as a plain field, checks its default, and reads each pick through the group's value", async () => {
    const errors = vi.spyOn(console, "error");
    const form = useForm({ plan: "pro" });
    const container = await render(jsx("form", { children: jsx("neuwo-radio-group", { ...form.register("plan"), children: radios() }) }));
    const group = container.querySelector("neuwo-radio-group");
    expect(form.fields.plan.ref).toBe(group);
    expect(form.fields.plan.refs).toBeUndefined();
    expect(radioOf(group, "pro").checked).toBe(true);
    expect(form.values.plan).toBe("pro");
    await act(async () => radioOf(group, "free").click());
    expect(form.values.plan).toBe("free");
    expect(group.hasAttribute("value")).toBe(false);
    expect(errors).not.toHaveBeenCalled();
  });

  it("reads an unpicked group as an empty value, and resets to the default value, checking its radio", async () => {
    const errors = vi.spyOn(console, "error");
    const blank = useForm();
    const first = await render(jsx("neuwo-radio-group", { ...blank.register("tier"), children: radios() }));
    expect(blank.values.tier).toBe("");
    expect(first.querySelector("neuwo-radio-group").value).toBe("");
    const form = useForm({ plan: "free" });
    const container = await render(jsx("form", { children: jsx("neuwo-radio-group", { ...form.register("plan"), children: radios() }) }));
    const group = container.querySelector("neuwo-radio-group");
    await act(async () => radioOf(group, "pro").click());
    expect(form.values.plan).toBe("pro");
    await act(async () => form.reset());
    expect(radioOf(group, "free").checked).toBe(true);
    expect(radioOf(group, "pro").checked).toBe(false);
    expect(form.values.plan).toBe("free");
    expect(errors).not.toHaveBeenCalled();
  });
});

describe("<neuwo-segmented> with React Hook Form's register, in jsdom", () => {
  const buttonOf = (host, value) => host.querySelector(`:scope > .neuwo-choice > .neuwo-segmented > .neuwo-segmented__option[data-value="${value}"]`);
  const checkedOf = (host) => Array.from(host.querySelectorAll('.neuwo-segmented__option[aria-checked="true"]'), (button) => button.dataset.value);
  const views = () => [jsx("option", { value: "visual", children: "Visual" }, "visual"), jsx("option", { value: "json", children: "JSON" }, "json")];

  it("registers the element as a plain field, shows its default, and reads each pick through its value", async () => {
    const errors = vi.spyOn(console, "error");
    const form = useForm({ view: "json" });
    const container = await render(jsx("form", { children: jsx("neuwo-segmented", { ...form.register("view"), children: views() }) }));
    const host = container.querySelector("neuwo-segmented");
    expect(form.fields.view.ref).toBe(host);
    expect(form.fields.view.refs).toBeUndefined();
    expect(checkedOf(host)).toEqual(["json"]);
    expect(form.values.view).toBe("json");
    await act(async () => buttonOf(host, "visual").click());
    expect(form.values.view).toBe("visual");
    expect(host.hasAttribute("value")).toBe(false);
    expect([...new FormData(container.querySelector("form"))]).toEqual([["view", "visual"]]);
    expect(errors).not.toHaveBeenCalled();
  });

  it("reads an unpicked one as an empty value, and resets to the default value", async () => {
    const errors = vi.spyOn(console, "error");
    const blank = useForm();
    const first = await render(jsx("neuwo-segmented", { ...blank.register("mode"), children: views() }));
    expect(blank.values.mode).toBe("");
    expect(first.querySelector("neuwo-segmented").value).toBe("");
    const form = useForm({ view: "visual" });
    const container = await render(jsx("form", { children: jsx("neuwo-segmented", { ...form.register("view"), children: views() }) }));
    const host = container.querySelector("neuwo-segmented");
    await act(async () => buttonOf(host, "json").click());
    expect(form.values.view).toBe("json");
    await act(async () => form.reset());
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(host.value).toBe("visual");
    expect(checkedOf(host)).toEqual(["visual"]);
    expect(form.values.view).toBe("visual");
    expect(errors).not.toHaveBeenCalled();
  });
});
