import { describe, expect, it } from "vitest";
import { toHTML } from "../src/core/adapters/html.js";
import { copyTemplate } from "../src/components/copy/copy.template.js";
import { templates } from "../src/templates.js";

const render = (attrs = {}) => copyTemplate(attrs, { id: (suffix) => suffix, children: [] });
const button = (label) => `<button class="neuwo-copy__button" type="button" aria-label="${label}"></button>`;
const status = '<span class="neuwo-copy__status" role="status" aria-live="polite"></span>';

describe("copyTemplate()", () => {
  it("is registered for neuwo-copy", () => {
    expect(templates["neuwo-copy"]).toBe(copyTemplate);
  });

  it("renders the content wrapper, then the control, then the live region, inside one root", () => {
    expect(toHTML(render())).toBe(`<div class="neuwo-copy"><div class="neuwo-copy__content"></div>${button("Copy")}${status}</div>`);
  });

  it("puts the author's content in the content wrapper and the announcement in the status wrapper", () => {
    expect(toHTML(render(), { default: "<pre>npm install</pre>", status: "Copied" })).toBe(
      `<div class="neuwo-copy"><div class="neuwo-copy__content"><pre>npm install</pre></div>${button("Copy")}<span class="neuwo-copy__status" role="status" aria-live="polite">Copied</span></div>`,
    );
  });

  it("names the control Copy by default, and by the label when one is set", () => {
    expect(render().children[1].props["aria-label"]).toBe("Copy");
    expect(render({ label: "" }).children[1].props["aria-label"]).toBe("Copy");
    expect(render({ label: "Kopioi" }).children[1].props["aria-label"]).toBe("Kopioi");
  });

  it("always renders the control, since the markup cannot know whether the clipboard exists", () => {
    for (const attrs of [{}, { label: "Kopioi" }, { "copied-label": "Kopioitu", "failed-label": "Ei onnistunut" }]) {
      expect(render(attrs).children.map((child) => child.props.class)).toEqual([
        "neuwo-copy__content",
        "neuwo-copy__button",
        "neuwo-copy__status",
      ]);
    }
  });

  it("keeps each region the only child of a wrapper with its own class, and leaves the other attributes on the host", () => {
    const [content, control, live] = render({ title: "t", "aria-describedby": "d", "data-x": "y", "copied-label": "c" }).children;
    expect(content.children).toEqual([{ region: "default" }]);
    expect(live.children).toEqual([{ region: "status" }]);
    expect(control.children).toEqual([]);
    expect(control.props).toEqual({ class: "neuwo-copy__button", type: "button", "aria-label": "Copy" });
  });
});
