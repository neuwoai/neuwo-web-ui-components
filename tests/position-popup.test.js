import { beforeEach, describe, expect, it } from "vitest";
import { positionBeside, positionOver, positionPopup, roomBeside } from "../src/core/position-popup.js";

function trigger(rect) {
  return { getBoundingClientRect: () => rect };
}

function popup(height = 100, width = 0) {
  return { style: {}, offsetHeight: height, offsetWidth: width };
}

describe("positionPopup", () => {
  beforeEach(() => {
    window.innerWidth = 1000;
    window.innerHeight = 800;
  });

  it("places the popup below the trigger, left edges aligned, matching its width", () => {
    const p = popup();
    positionPopup(trigger({ left: 120, right: 320, top: 200, bottom: 240, width: 200 }), p);
    expect(p.style.position).toBe("fixed");
    expect(p.style.minWidth).toBe("200px");
    expect(p.style.left).toBe("120px");
    expect(p.style.right).toBe("auto");
    expect(p.style.top).toBe("244px");
    expect(p.style.bottom).toBe("auto");
  });

  it("anchors the right edges when align is end", () => {
    const p = popup();
    positionPopup(trigger({ left: 120, right: 320, top: 200, bottom: 240, width: 200 }), p, {
      align: "end",
    });
    expect(p.style.right).toBe("680px"); // 1000 - 320
    expect(p.style.left).toBe("auto");
  });

  it("lines up with the trigger's inline start and end in a right-to-left trigger, its right and left edges", () => {
    const rtl = document.createElement("div");
    rtl.style.direction = "rtl";
    rtl.getBoundingClientRect = () => ({ left: 120, right: 320, top: 200, bottom: 240, width: 200 });
    document.body.append(rtl);
    const start = popup();
    positionPopup(rtl, start);
    expect(start.style.right).toBe("680px");
    expect(start.style.left).toBe("auto");
    const end = popup();
    positionPopup(rtl, end, { align: "end" });
    expect(end.style.left).toBe("120px");
    expect(end.style.right).toBe("auto");
    rtl.remove();
  });

  it("measures from the edge inside a classic scrollbar, where a fixed popup's right is measured", () => {
    Object.defineProperty(document.documentElement, "clientWidth", { value: 985, configurable: true });
    try {
      const p = popup();
      positionPopup(trigger({ left: 120, right: 320, top: 200, bottom: 240, width: 200 }), p, { align: "end" });
      expect(p.style.right).toBe("665px");
    } finally {
      delete document.documentElement.clientWidth;
    }
  });

  it("measures from the edge above a classic horizontal scrollbar when it opens above the trigger", () => {
    Object.defineProperty(document.documentElement, "clientHeight", { value: 785, configurable: true });
    try {
      const p = popup();
      positionPopup(trigger({ left: 0, right: 200, top: 400, bottom: 440, width: 200 }), p, { placement: "top" });
      expect(p.style.bottom).toBe("389px");
      const flipped = popup(200);
      positionPopup(trigger({ left: 0, right: 200, top: 600, bottom: 640, width: 200 }), flipped);
      expect(flipped.style.bottom).toBe("189px");
    } finally {
      delete document.documentElement.clientHeight;
    }
  });

  it("measures the viewport from the scrolling element, which is the body in a page without a doctype", () => {
    Object.defineProperty(document.documentElement, "clientHeight", { value: 3000, configurable: true });
    Object.defineProperty(document.documentElement, "clientWidth", { value: 1400, configurable: true });
    Object.defineProperty(document, "scrollingElement", { value: { clientHeight: 600, clientWidth: 900 }, configurable: true });
    try {
      const p = popup(170, 300);
      positionPopup(trigger({ left: 700, right: 800, top: 470, bottom: 510, width: 100 }), p);
      expect(p.style.top).toBe("auto");
      expect(p.style.bottom).toBe("134px");
      expect(p.style.maxWidth).toBe("884px");
      expect(p.style.left).toBe("592px");
    } finally {
      delete document.documentElement.clientHeight;
      delete document.documentElement.clientWidth;
      delete document.scrollingElement;
    }
  });

  it("returns the side it placed the popup on", () => {
    expect(positionPopup(trigger({ left: 0, right: 200, top: 200, bottom: 240, width: 200 }), popup())).toBe("bottom");
    expect(positionPopup(trigger({ left: 0, right: 200, top: 700, bottom: 740, width: 200 }), popup(200))).toBe("top");
    expect(positionPopup({}, popup())).toBeUndefined();
  });

  it("caps the popup to the viewport less a margin on each side, and its matched width with it", () => {
    const p = popup();
    positionPopup(trigger({ left: 0, right: 1000, top: 200, bottom: 240, width: 1000 }), p);
    expect(p.style.maxWidth).toBe("984px");
    expect(p.style.minWidth).toBe("984px");
  });

  it("keeps a narrower pixel max-width the popup's stylesheet gives it, inside the viewport less the margins", () => {
    const style = document.createElement("style");
    style.textContent = ".capped { max-width: 300px; } .relative { max-width: 50%; }";
    document.head.append(style);
    const capped = Object.assign(document.createElement("div"), { className: "capped" });
    const relative = Object.assign(document.createElement("div"), { className: "relative" });
    document.body.append(capped, relative);
    const below = trigger({ left: 0, right: 200, top: 200, bottom: 240, width: 200 });
    try {
      positionPopup(below, capped, { matchWidth: false });
      expect(capped.style.maxWidth).toBe("300px");
      positionPopup(below, capped, { matchWidth: false });
      expect(capped.style.maxWidth).toBe("300px");
      window.innerWidth = 250;
      positionPopup(below, capped, { matchWidth: false });
      expect(capped.style.maxWidth).toBe("234px");
      window.innerWidth = 1000;
      positionPopup(below, relative, { matchWidth: false });
      expect(relative.style.maxWidth).toBe("984px");
    } finally {
      style.remove();
      capped.remove();
      relative.remove();
    }
  });

  it("shifts a popup that would cross the far edge back toward the trigger's other edge, inside the margin", () => {
    const ltr = popup(100, 300);
    positionPopup(trigger({ left: 900, right: 980, top: 200, bottom: 240, width: 80 }), ltr);
    expect(ltr.style.left).toBe("692px");
    const end = popup(100, 300);
    positionPopup(trigger({ left: 20, right: 100, top: 200, bottom: 240, width: 80 }), end, { align: "end" });
    expect(end.style.right).toBe("692px");
  });

  it("keeps a popup that fits where its edge lines up, even flush with the viewport", () => {
    const p = popup(100, 300);
    positionPopup(trigger({ left: 0, right: 80, top: 200, bottom: 240, width: 80 }), p);
    expect(p.style.left).toBe("0px");
  });

  it("places the popup above the trigger when placement is top", () => {
    const p = popup();
    positionPopup(trigger({ left: 0, right: 200, top: 400, bottom: 440, width: 200 }), p, {
      placement: "top",
    });
    expect(p.style.bottom).toBe("404px"); // 800 - 400 + 4
    expect(p.style.top).toBe("auto");
  });

  it("flips above when there is not enough room below", () => {
    const p = popup(200);
    // 60px below, 700px above: prefers bottom, must flip.
    positionPopup(trigger({ left: 0, right: 200, top: 700, bottom: 740, width: 200 }), p);
    expect(p.style.bottom).toBe("104px"); // 800 - 700 + 4
    expect(p.style.top).toBe("auto");
  });

  it("caps the height to the room on the side it opens on, less the gap and the margin, with fitHeight", () => {
    const below = popup(1000);
    below.style.maxHeight = "300px";
    expect(positionPopup(trigger({ left: 0, right: 200, top: 200, bottom: 240, width: 200 }), below, { fitHeight: true })).toBe("bottom");
    expect(below.style.maxHeight).toBe("548px"); // 800 - 240 - 4 - 8
    const above = popup(1000);
    expect(positionPopup(trigger({ left: 0, right: 200, top: 600, bottom: 640, width: 200 }), above, { fitHeight: true })).toBe("top");
    expect(above.style.maxHeight).toBe("588px"); // 600 - 4 - 8
    const scrolledAway = popup(1000);
    positionPopup(trigger({ left: 0, right: 200, top: -90, bottom: -50, width: 200 }), scrolledAway, { fitHeight: true });
    expect(scrolledAway.style.maxHeight).toBe("784px"); // never taller than the viewport less a margin on each side
    const unfitted = popup(1000);
    positionPopup(trigger({ left: 0, right: 200, top: 200, bottom: 240, width: 200 }), unfitted);
    expect(unfitted.style.maxHeight).toBeUndefined();
  });

  it("measures a fitted popup's full content without lifting the cap it has, which would clamp its scroll position", () => {
    const writes = [];
    const style = new Proxy({ maxHeight: "250px" }, {
      set(target, name, value) {
        if (name === "maxHeight") writes.push(value);
        target[name] = value;
        return true;
      },
    });
    // Capped at 250px from before, it scrolls 600px of content: 260px below the trigger does not fit it, 500px above is roomier.
    const fitted = { style, offsetHeight: 250, clientHeight: 248, scrollHeight: 600, offsetWidth: 0 };
    expect(positionPopup(trigger({ left: 0, right: 200, top: 500, bottom: 540, width: 200 }), fitted, { fitHeight: true })).toBe("top");
    expect(writes).toEqual(["488px"]); // 500 - 4 - 8
  });

  it("flips below when placement is top but there is not enough room above", () => {
    const p = popup(200);
    // 20px above, 740px below: prefers top, must flip.
    positionPopup(trigger({ left: 0, right: 200, top: 20, bottom: 60, width: 200 }), p, {
      placement: "top",
    });
    expect(p.style.top).toBe("64px");
    expect(p.style.bottom).toBe("auto");
  });

  it("ignores a trigger that cannot be measured", () => {
    const p = popup();
    expect(() => positionPopup({}, p)).not.toThrow();
    expect(p.style.position).toBeUndefined();
  });

  it("sets minWidth to the trigger's width by default", () => {
    const p = popup();
    positionPopup(trigger({ left: 0, right: 200, top: 0, bottom: 40, width: 200 }), p);
    expect(p.style.minWidth).toBe("200px");
  });

  it("does not write minWidth when matchWidth is false", () => {
    const p = popup();
    positionPopup(trigger({ left: 0, right: 200, top: 0, bottom: 40, width: 200 }), p, {
      matchWidth: false,
    });
    expect(p.style.minWidth).toBeUndefined();
  });
});

/**
 * A real element measured at `rect`, `width` by `height`, inside `dir="rtl"` when asked.
 * @param {{ left: number, right: number, top: number, bottom: number }} rect
 */
function box(rect, { width = rect.right - rect.left, height = rect.bottom - rect.top, rtl = false, style = "" } = {}) {
  const holder = document.createElement("div");
  // happy-dom computes no direction from the dir attribute, so the inline style says it too.
  if (rtl) {
    holder.setAttribute("dir", "rtl");
    holder.style.direction = "rtl";
  }
  const el = document.createElement("div");
  el.setAttribute("style", style);
  el.getBoundingClientRect = () => ({ x: rect.left, y: rect.top, width: rect.right - rect.left, height: rect.bottom - rect.top, toJSON() {}, ...rect });
  Object.defineProperty(el, "offsetWidth", { configurable: true, get: () => width });
  Object.defineProperty(el, "offsetHeight", { configurable: true, get: () => height });
  holder.append(el);
  document.body.append(holder);
  return el;
}

describe("roomBeside", () => {
  beforeEach(() => {
    window.innerWidth = 1000;
    window.innerHeight = 800;
    document.body.replaceChildren();
  });

  it("prefers the inline end, then the start, overlapping the panel by 4px and keeping 8px from the viewport", () => {
    expect(roomBeside(box({ left: 100, right: 300, top: 0, bottom: 200 }), 200)).toBe("end");
    expect(roomBeside(box({ left: 300, right: 796, top: 0, bottom: 200 }), 200)).toBe("end"); // 796 - 4 + 200 = 1000 - 8
    expect(roomBeside(box({ left: 300, right: 797, top: 0, bottom: 200 }), 200)).toBe("start");
    expect(roomBeside(box({ left: 204, right: 900, top: 0, bottom: 200 }), 200)).toBe("start"); // 204 + 4 - 200 = 8
    expect(roomBeside(box({ left: 203, right: 900, top: 0, bottom: 200 }), 200)).toBeNull();
  });

  it("reads the inline end as the left side in a right-to-left panel", () => {
    expect(roomBeside(box({ left: 300, right: 500, top: 0, bottom: 200 }, { rtl: true }), 200)).toBe("end");
    expect(roomBeside(box({ left: 100, right: 300, top: 0, bottom: 200 }, { rtl: true }), 200)).toBe("start");
    expect(roomBeside(box({ left: 100, right: 900, top: 0, bottom: 200 }, { rtl: true }), 200)).toBeNull();
  });
});

describe("positionBeside", () => {
  beforeEach(() => {
    window.innerWidth = 1000;
    window.innerHeight = 800;
    document.body.replaceChildren();
  });

  const parent = (rtl = false) => box({ left: 100, right: 300, top: 50, bottom: 450 }, { rtl, style: "border-top: 1px solid; padding-top: 8px" });
  const item = () => box({ left: 109, right: 291, top: 200, bottom: 236 });

  it("puts the popup at the panel's inline end or start, overlapping it by 4px, its first row level with the item", () => {
    const popup = box({ left: 0, right: 0, top: 0, bottom: 0 }, { width: 240, height: 120 });
    popup.style.minWidth = "200px";
    positionBeside(parent(), item(), popup, "end");
    expect([popup.style.position, popup.style.left, popup.style.right, popup.style.top, popup.style.bottom]).toEqual(["fixed", "296px", "auto", "191px", "auto"]);
    expect(popup.style.minWidth).toBe("");
    positionBeside(parent(), item(), popup, "start");
    expect([popup.style.left, popup.style.right]).toEqual(["auto", "896px"]); // 1000 - (100 + 4)
  });

  it("mirrors the sides in a right-to-left panel", () => {
    const popup = box({ left: 0, right: 0, top: 0, bottom: 0 }, { width: 240, height: 120 });
    positionBeside(parent(true), item(), popup, "end");
    expect([popup.style.left, popup.style.right]).toEqual(["auto", "896px"]);
    positionBeside(parent(true), item(), popup, "start");
    expect([popup.style.left, popup.style.right]).toEqual(["296px", "auto"]);
  });

  it("sits at the viewport's inline end less 8px, over the panel, with no room on either side", () => {
    const popup = box({ left: 0, right: 0, top: 0, bottom: 0 }, { width: 240, height: 120 });
    positionBeside(parent(), item(), popup, null);
    expect([popup.style.left, popup.style.right]).toEqual(["auto", "8px"]);
    positionBeside(parent(true), item(), popup, null);
    expect([popup.style.left, popup.style.right]).toEqual(["8px", "auto"]);
  });

  it("moves the popup up to stay in the viewport, never above its top margin", () => {
    const tall = box({ left: 0, right: 0, top: 0, bottom: 0 }, { width: 240, height: 300 });
    positionBeside(parent(), box({ left: 109, right: 291, top: 700, bottom: 736 }), tall, "end");
    expect(tall.style.top).toBe("492px"); // 800 - 8 - 300
    positionBeside(parent(), box({ left: 109, right: 291, top: -40, bottom: -4 }), tall, "end");
    expect(tall.style.top).toBe("8px");
  });
});

describe("positionOver", () => {
  beforeEach(() => {
    window.innerWidth = 1000;
    window.innerHeight = 800;
    document.body.replaceChildren();
  });

  it("puts the popup on the panel's top and inline-start edges, at least as wide as the panel", () => {
    const popup = box({ left: 0, right: 0, top: 0, bottom: 0 }, { width: 240, height: 120 });
    positionOver(box({ left: 100, right: 324, top: 50, bottom: 450 }), popup);
    expect([popup.style.position, popup.style.left, popup.style.right, popup.style.top, popup.style.bottom, popup.style.minWidth]).toEqual(["fixed", "100px", "auto", "50px", "auto", "224px"]);
    positionOver(box({ left: 100, right: 324, top: 50, bottom: 450 }, { rtl: true }), popup);
    expect([popup.style.left, popup.style.right]).toEqual(["auto", "676px"]); // 1000 - 324
  });

  it("moves a popup taller than the room below the panel's top up into the viewport", () => {
    const popup = box({ left: 0, right: 0, top: 0, bottom: 0 }, { width: 240, height: 400 });
    positionOver(box({ left: 100, right: 324, top: 600, bottom: 700 }), popup);
    expect(popup.style.top).toBe("392px"); // 800 - 8 - 400
  });
});
