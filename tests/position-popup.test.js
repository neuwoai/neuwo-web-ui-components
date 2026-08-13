import { beforeEach, describe, expect, it } from "vitest";
import { positionPopup } from "../src/core/position-popup.js";

function trigger(rect) {
  return { getBoundingClientRect: () => rect };
}

function popup(height = 100) {
  return { style: {}, offsetHeight: height };
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
