import { describe, expect, it } from "vitest";
import "../src/components/notice/neuwo-notice.js";

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild;
}

const cardOf = (el) => el.shadowRoot.querySelector(".notice");
const classesOf = (el) => [...cardOf(el).classList];

describe("<neuwo-notice>", () => {
  it("registers and renders the card on the portable class", () => {
    const el = make(`<neuwo-notice></neuwo-notice>`);
    expect(customElements.get("neuwo-notice")).toBeTruthy();
    expect(cardOf(el)).not.toBeNull();
    expect(cardOf(el).getAttribute("part")).toBe("notice");
  });

  it("exposes every internal as a part", () => {
    const el = make(`<neuwo-notice dismissible></neuwo-notice>`);
    const parts = [...el.shadowRoot.querySelectorAll("[part]")].map((n) => n.getAttribute("part"));
    for (const part of ["notice", "content", "title", "message", "actions", "dismiss"])
      expect(parts).toContain(part);
  });

  it("projects the title, message and action slots", () => {
    const el = make(`
      <neuwo-notice>
        <span slot="title">Cookies</span>
        We use them.
        <button slot="actions">Accept</button>
      </neuwo-notice>
    `);
    const names = [...el.shadowRoot.querySelectorAll("slot")].map((s) => s.getAttribute("name"));
    expect(names).toEqual(["title", null, "actions"]);
  });

  it("docks to the bottom corner by default", () => {
    const el = make(`<neuwo-notice></neuwo-notice>`);
    expect(classesOf(el)).toEqual(["notice", "notice--fixed", "notice--bottom", "notice--end"]);
  });

  it("composes each placement from independent edge modifiers", () => {
    const el = make(`<neuwo-notice position="top-center"></neuwo-notice>`);
    expect(classesOf(el)).toContain("notice--top");
    expect(classesOf(el)).toContain("notice--center");
    expect(classesOf(el)).toContain("notice--fixed");
  });

  it("drops the fixed placement entirely for an in-flow notice", () => {
    const el = make(`<neuwo-notice position="static"></neuwo-notice>`);
    expect(classesOf(el)).toEqual(["notice"]);
  });

  it("falls back to the default corner for an unknown position", () => {
    const el = make(`<neuwo-notice position="sideways"></neuwo-notice>`);
    expect(classesOf(el)).toContain("notice--bottom");
    expect(classesOf(el)).toContain("notice--end");
  });

  it("carries the row layout as its own modifier", () => {
    const el = make(`<neuwo-notice layout="row"></neuwo-notice>`);
    expect(classesOf(el)).toContain("notice--row");
    el.layout = "stack";
    expect(classesOf(el)).not.toContain("notice--row");
  });

  it("renders the close button only when dismissible", () => {
    const el = make(`<neuwo-notice></neuwo-notice>`);
    expect(el.shadowRoot.querySelector(".notice__dismiss")).toBeNull();
    el.dismissible = true;
    expect(el.shadowRoot.querySelector(".notice__dismiss")).not.toBeNull();
    expect(classesOf(el)).toContain("notice--dismissible");
    el.dismissible = false;
    expect(el.shadowRoot.querySelector(".notice__dismiss")).toBeNull();
  });

  it("names the close button, and re-labels it for a translated page", () => {
    const el = make(`<neuwo-notice dismissible></neuwo-notice>`);
    const button = el.shadowRoot.querySelector(".notice__dismiss");
    expect(button.getAttribute("aria-label")).toBe("Dismiss");
    el.dismissLabel = "Zamknij";
    expect(button.getAttribute("aria-label")).toBe("Zamknij");
  });

  it("hides the card and fires dismiss when the button is pressed", () => {
    const el = make(`<neuwo-notice dismissible>Hint</neuwo-notice>`);
    let fired = 0;
    el.addEventListener("dismiss", () => fired++);
    el.shadowRoot.querySelector(".notice__dismiss").click();
    expect(fired).toBe(1);
    expect(el.hidden).toBe(true);
  });

  it("stays open when a listener cancels the dismissal", () => {
    const el = make(`<neuwo-notice dismissible>Hint</neuwo-notice>`);
    el.addEventListener("dismiss", (e) => e.preventDefault());
    expect(el.dismiss()).toBe(false);
    expect(el.hidden).toBe(false);
  });

  it("lets the dismissal escape the shadow boundary", () => {
    const el = make(`<neuwo-notice dismissible>Hint</neuwo-notice>`);
    let seen = false;
    document.addEventListener("dismiss", () => (seen = true), { once: true });
    el.shadowRoot.querySelector(".notice__dismiss").click();
    expect(seen).toBe(true);
  });

  it("takes an unfilled slot out of the flow, so the gaps do not open around it", () => {
    const el = make(`<neuwo-notice><span slot="title">Only a headline</span></neuwo-notice>`);
    expect(el.shadowRoot.querySelector(".notice__title").classList).not.toContain("notice__title--empty");
    expect(el.shadowRoot.querySelector(".notice__message").classList).toContain("notice__message--empty");
    expect(el.shadowRoot.querySelector(".notice__actions").classList).toContain("notice__actions--empty");
  });

  it("keeps the message when only the headline is missing", () => {
    const el = make(`<neuwo-notice>Read this page in Polish</neuwo-notice>`);
    expect(el.shadowRoot.querySelector(".notice__title").classList).toContain("notice__title--empty");
    expect(el.shadowRoot.querySelector(".notice__message").classList).not.toContain("notice__message--empty");
  });

  it("announces politely, unless the consumer declared something stronger", () => {
    expect(make(`<neuwo-notice></neuwo-notice>`).getAttribute("role")).toBe("status");
    expect(make(`<neuwo-notice role="dialog"></neuwo-notice>`).getAttribute("role")).toBe("dialog");
  });

  it("reflects every axis between property and attribute", () => {
    const el = make(`<neuwo-notice></neuwo-notice>`);
    expect(el.position).toBe("bottom-end");
    expect(el.layout).toBe("stack");
    expect(el.dismissible).toBe(false);
    el.position = "top-start";
    el.layout = "row";
    el.dismissible = true;
    expect(el.getAttribute("position")).toBe("top-start");
    expect(el.getAttribute("layout")).toBe("row");
    expect(el.hasAttribute("dismissible")).toBe(true);
    el.position = "";
    expect(el.hasAttribute("position")).toBe(false);
  });

  it("keeps the card it built, so an attribute change never replays the entrance", () => {
    const el = make(`<neuwo-notice>Hint</neuwo-notice>`);
    const card = cardOf(el);
    el.position = "top-center";
    el.dismissible = true;
    expect(cardOf(el)).toBe(card);
  });
});
