import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import "../src/index.js";
import { jsx, jsxs } from "../src/react/jsx-runtime.js";
import { installPopovers } from "./fixtures/popover.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const cleanup = [];
beforeEach(() => {
  cleanup.push(installPopovers(document));
});
afterEach(() => {
  while (cleanup.length) cleanup.pop()();
  vi.restoreAllMocks();
});

function attach(node) {
  document.body.appendChild(node);
  cleanup.push(() => node.remove());
  return node;
}

/** @param {Node} target */
function watch(target) {
  const records = [];
  const observer = new MutationObserver((list) => records.push(...list));
  observer.observe(target, { subtree: true, childList: true, attributes: true, characterData: true });
  cleanup.push(() => observer.disconnect());
  return () => {
    records.push(...observer.takeRecords());
    return records.splice(0);
  };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

/** @param {unknown} element */
function render(element) {
  const trigger = attach(document.createElement("button"));
  trigger.setAttribute("popovertarget", "m-panel");
  trigger.textContent = "Open";
  const container = attach(document.createElement("div"));
  const root = createRoot(container);
  cleanup.push(() => act(() => root.unmount()));
  act(() => root.render(element));
  const menu = container.querySelector("neuwo-menu");
  return { trigger, container, menu, panel: menu.panel };
}

/**
 * @param {{ checked?: Record<string, boolean>, onselect?: (event: Event) => void, onopen?: (event: Event) => void, onSelect?: () => void }} [props]
 */
function tree({ checked = { live: true, draft: false }, onselect, onopen, onSelect } = {}) {
  const item = (value, label, more = {}) => jsx("neuwo-menu-item", { value, ...more, children: label }, value);
  return jsx("div", {
    onSelect,
    children: jsxs("neuwo-menu", {
      id: "m",
      onselect,
      onopen,
      children: [
        jsx("neuwo-menu-group", { children: item("rename", "Rename") }, "actions"),
        jsxs("neuwo-menu-group", { select: "many", children: [item("live", "Live", { checked: checked.live }), item("draft", "Draft", { checked: checked.draft })] }, "show"),
      ],
    }),
  });
}

const itemOf = (menu, value) => menu.querySelector(`neuwo-menu-item[value="${value}"]`);
const controlOf = (menu, value) => itemOf(menu, value).querySelector(".neuwo-menu-item__control");

describe("<neuwo-menu> under React", () => {
  it("only dispatches select for a checkable item React rendered", async () => {
    const errors = vi.spyOn(console, "error");
    const seen = [];
    const { trigger, menu, panel } = render(tree({ onselect: (event) => seen.push([event.detail.value, event.detail.checked]) }));
    trigger.click();
    await tick();
    const records = watch(menu);
    act(() => controlOf(menu, "draft").click());
    act(() => controlOf(menu, "live").click());
    expect(seen).toEqual([
      ["draft", true],
      ["live", false],
    ]);
    expect(records()).toEqual([]);
    expect([itemOf(menu, "draft").checked, itemOf(menu, "live").checked]).toEqual([false, true]);
    expect([controlOf(menu, "draft").getAttribute("aria-checked"), controlOf(menu, "live").getAttribute("aria-checked")]).toEqual(["false", "true"]);
    expect(panel.matches(":popover-open")).toBe(true);
    expect(errors).not.toHaveBeenCalled();
  });

  it("shows a pick the consumer accepts once React re-renders it, keeping the menu open and focus on the item", async () => {
    const errors = vi.spyOn(console, "error");
    function Menu() {
      const [checked, setChecked] = useState({ live: true, draft: false });
      return tree({ checked, onselect: (event) => setChecked((now) => ({ ...now, [event.detail.value]: event.detail.checked })) });
    }
    const { trigger, menu, panel } = render(jsx(Menu, {}));
    trigger.click();
    await tick();
    const draft = controlOf(menu, "draft");
    draft.focus();
    act(() => draft.click());
    expect(draft.getAttribute("aria-checked")).toBe("true");
    expect(itemOf(menu, "draft").checked).toBe(true);
    await tick();
    expect(panel.matches(":popover-open")).toBe(true);
    expect(document.activeElement).toBe(draft);
    expect(draft.isConnected).toBe(true);
    expect(errors).not.toHaveBeenCalled();
  });

  it("binds onopen and onselect, closes on an action's pick, and leaves React's own onSelect on an ancestor silent", async () => {
    const errors = vi.spyOn(console, "error");
    const opens = [];
    const picks = [];
    const onSelect = vi.fn();
    const { trigger, menu, panel } = render(
      tree({ onopen: (event) => opens.push(event.detail.trigger), onselect: (event) => picks.push(event.detail), onSelect }),
    );
    trigger.focus();
    trigger.click();
    expect(opens).toEqual([trigger]);
    await tick();
    expect(document.activeElement).toBe(controlOf(menu, "rename"));
    act(() => controlOf(menu, "rename").click());
    expect(picks).toEqual([{ value: "rename", item: itemOf(menu, "rename"), trigger }]);
    expect(panel.matches(":popover-open")).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(onSelect).not.toHaveBeenCalled();
    expect([menu.onselect, menu.hasAttribute("onselect"), menu.hasAttribute("onopen")]).toEqual([null, false, false]);
    expect(errors).not.toHaveBeenCalled();
  });

  it("stays closed when onopen cancels", async () => {
    const { trigger, panel } = render(tree({ onopen: (event) => event.preventDefault() }));
    trigger.click();
    await tick();
    expect(panel.matches(":popover-open")).toBe(false);
  });
});
