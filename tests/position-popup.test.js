import { beforeEach, describe, expect, it } from "vitest";
import { positionPopup } from "../src/core/position-popup.js";

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

  it("caps the popup to the viewport less a margin on each side, and its matched width with it", () => {
    const p = popup();
    positionPopup(trigger({ left: 0, right: 1000, top: 200, bottom: 240, width: 1000 }), p);
    expect(p.style.maxWidth).toBe("984px");
    expect(p.style.minWidth).toBe("984px");
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
