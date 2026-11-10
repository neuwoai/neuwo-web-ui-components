import { describe, expect, it } from "vitest";
import { renderElement, toHTML } from "../src/core/adapters/html.js";
import { idScope } from "../src/core/ids.js";
import { noticeTemplate } from "../src/components/notice/notice.template.js";
import { templates } from "../src/templates.js";

const render = (attrs = {}, children = []) => noticeTemplate(attrs, { id: (suffix) => suffix, children });
const child = (slot, tag = "span") => ({ tag, attrs: slot === "default" ? {} : { slot }, text: "x", slot });
const text = (value) => ({ tag: null, attrs: {}, text: value, slot: "default" });
const classesOf = (node) => node.props.class.split(" ");

function find(node, name) {
  if (classesOf(node)[0] === name) return node;
  for (const item of node.children) {
    if (typeof item === "object" && "tag" in item) {
      const hit = find(item, name);
      if (hit) return hit;
    }
  }
  return null;
}

const wrapperClasses = (node) => ["title", "message", "actions"].map((name) => find(node, `neuwo-notice__${name}`).props.class);

describe("noticeTemplate()", () => {
  it("is registered for neuwo-notice", () => {
    expect(templates["neuwo-notice"]).toBe(noticeTemplate);
  });

  it("renders the card, its text column, the actions row and no close button by default", () => {
    expect(toHTML(render())).toBe(
      '<div class="neuwo-notice neuwo-notice--fixed neuwo-notice--bottom neuwo-notice--end" role="status">' +
        '<div class="neuwo-notice__content">' +
        '<p class="neuwo-notice__title neuwo-notice__title--empty"></p>' +
        '<div class="neuwo-notice__message neuwo-notice__message--empty"></div>' +
        "</div>" +
        '<div class="neuwo-notice__actions neuwo-notice__actions--empty"></div>' +
        "</div>",
    );
  });

  it("puts each region's content in its own wrapper", () => {
    const node = render({}, [child("title"), text("Hint"), child("actions", "button")]);
    expect(toHTML(node, { title: "<span>T</span>", default: "Hint", actions: "<button>Go</button>" })).toBe(
      '<div class="neuwo-notice neuwo-notice--fixed neuwo-notice--bottom neuwo-notice--end" role="status">' +
        '<div class="neuwo-notice__content">' +
        '<p class="neuwo-notice__title"><span>T</span></p>' +
        '<div class="neuwo-notice__message">Hint</div>' +
        "</div>" +
        '<div class="neuwo-notice__actions"><button>Go</button></div>' +
        "</div>",
    );
  });

  it.each([
    ["bottom-end", ["neuwo-notice--fixed", "neuwo-notice--bottom", "neuwo-notice--end"]],
    ["bottom-start", ["neuwo-notice--fixed", "neuwo-notice--bottom", "neuwo-notice--start"]],
    ["bottom-center", ["neuwo-notice--fixed", "neuwo-notice--bottom", "neuwo-notice--center"]],
    ["top-end", ["neuwo-notice--fixed", "neuwo-notice--top", "neuwo-notice--end"]],
    ["top-start", ["neuwo-notice--fixed", "neuwo-notice--top", "neuwo-notice--start"]],
    ["top-center", ["neuwo-notice--fixed", "neuwo-notice--top", "neuwo-notice--center"]],
    ["static", []],
  ])("composes position=%s from independent edge modifiers", (position, modifiers) => {
    expect(classesOf(render({ position }))).toEqual(["neuwo-notice", ...modifiers]);
  });

  it.each([
    ["missing", {}],
    ["empty", { position: "" }],
    ["unknown", { position: "sideways" }],
    ["an inherited object key", { position: "toString" }],
  ])("falls back to the bottom-end corner when the position is %s", (_, attrs) => {
    expect(classesOf(render(attrs))).toEqual(["neuwo-notice", "neuwo-notice--fixed", "neuwo-notice--bottom", "neuwo-notice--end"]);
  });

  it("carries the row layout as its own modifier, and only for row", () => {
    expect(classesOf(render({ layout: "row", position: "static" }))).toEqual(["neuwo-notice", "neuwo-notice--row"]);
    for (const layout of ["stack", "", "grid"]) expect(classesOf(render({ layout, position: "static" }))).toEqual(["neuwo-notice"]);
  });

  it("renders the close button last, and the dismissible modifier, only when dismissible", () => {
    const node = render({ dismissible: "", position: "static" });
    expect(classesOf(node)).toEqual(["neuwo-notice", "neuwo-notice--dismissible"]);
    expect(node.children.map((item) => classesOf(item)[0])).toEqual(["neuwo-notice__content", "neuwo-notice__actions", "neuwo-notice__dismiss"]);
    expect(node.children[2]).toEqual({
      tag: "button",
      props: { class: "neuwo-notice__dismiss", type: "button", "aria-label": "Dismiss" },
      children: [],
    });
    expect(find(render(), "neuwo-notice__dismiss")).toBeNull();
  });

  it("names the close button by dismiss-label, falling back to Dismiss when it is empty", () => {
    expect(find(render({ dismissible: "", "dismiss-label": "Zamknij" }), "neuwo-notice__dismiss").props["aria-label"]).toBe("Zamknij");
    expect(find(render({ dismissible: "", "dismiss-label": "" }), "neuwo-notice__dismiss").props["aria-label"]).toBe("Dismiss");
  });

  it("puts role=status on the card unless the host declares a role, and never copies the host's role", () => {
    expect(render().props.role).toBe("status");
    expect(render({ role: "dialog", "aria-label": "Cookies" }).props).toEqual({
      class: "neuwo-notice neuwo-notice--fixed neuwo-notice--bottom neuwo-notice--end",
    });
    expect(Object.hasOwn(render({ role: "" }).props, "role")).toBe(false);
  });

  it("marks each wrapper empty until a child with its slot arrives", () => {
    expect(wrapperClasses(render({}, [child("title")]))).toEqual([
      "neuwo-notice__title",
      "neuwo-notice__message neuwo-notice__message--empty",
      "neuwo-notice__actions neuwo-notice__actions--empty",
    ]);
    expect(wrapperClasses(render({}, [text("Read this page in Polish")]))).toEqual([
      "neuwo-notice__title neuwo-notice__title--empty",
      "neuwo-notice__message",
      "neuwo-notice__actions neuwo-notice__actions--empty",
    ]);
    expect(wrapperClasses(render({}, [child("default", "p"), child("actions", "button")]))).toEqual([
      "neuwo-notice__title neuwo-notice__title--empty",
      "neuwo-notice__message",
      "neuwo-notice__actions",
    ]);
  });

  it("leaves a child with a slot the notice does not have out of every wrapper", () => {
    expect(wrapperClasses(render({}, [child("start")]))).toEqual([
      "neuwo-notice__title neuwo-notice__title--empty",
      "neuwo-notice__message neuwo-notice__message--empty",
      "neuwo-notice__actions neuwo-notice__actions--empty",
    ]);
  });

  // The React adapter describes a component child it cannot see into with no tag and no text.
  it("counts a child with no tag and no text as content, as the React adapter describes a component", () => {
    expect(wrapperClasses(render({}, [{ tag: null, attrs: {}, text: "", slot: "title" }]))[0]).toBe("neuwo-notice__title");
  });

  it("keeps the wrappers' first class fixed, so every case renders the same wrappers", () => {
    for (const children of [[], [child("title"), text("x"), child("actions")]]) {
      expect(wrapperClasses(render({}, children)).map((classes) => classes.split(" ")[0])).toEqual([
        "neuwo-notice__title",
        "neuwo-notice__message",
        "neuwo-notice__actions",
      ]);
    }
  });

  it("counts indented markup's whitespace as empty through the server adapter, and keeps it in the message wrapper", () => {
    const whitespace = (value) => ({ ...text(value), html: value });
    const title = { tag: "span", attrs: { slot: "title" }, text: "Cookies", slot: "title", html: '<span slot="title">Cookies</span>' };
    const html = renderElement("neuwo-notice", {}, [whitespace("\n  "), title, whitespace("\n")], noticeTemplate, idScope("neuwo-s"));
    expect(html).toBe(
      "<neuwo-notice>" +
        '<div class="neuwo-notice neuwo-notice--fixed neuwo-notice--bottom neuwo-notice--end" role="status">' +
        '<div class="neuwo-notice__content">' +
        '<p class="neuwo-notice__title"><span slot="title">Cookies</span></p>' +
        '<div class="neuwo-notice__message neuwo-notice__message--empty">\n  \n</div>' +
        "</div>" +
        '<div class="neuwo-notice__actions neuwo-notice__actions--empty"></div>' +
        "</div>" +
        "</neuwo-notice>",
    );
  });

  it("keeps every region the only child of its wrapper", () => {
    const node = render({ dismissible: "" }, [child("title"), text("x"), child("actions")]);
    expect(find(node, "neuwo-notice__title").children).toEqual([{ region: "title" }]);
    expect(find(node, "neuwo-notice__message").children).toEqual([{ region: "default" }]);
    expect(find(node, "neuwo-notice__actions").children).toEqual([{ region: "actions" }]);
    expect(find(node, "neuwo-notice__content").children.map((item) => item.tag)).toEqual(["p", "div"]);
  });
});
