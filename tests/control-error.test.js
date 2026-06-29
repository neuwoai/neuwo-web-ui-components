import { describe, expect, it } from "vitest";
import { syncError } from "../src/core/control-error.js";

function harness() {
  const container = document.createElement("div");
  const accentEl = document.createElement("span");
  const announce = document.createElement("input");
  container.append(accentEl, announce);
  const refs = {
    announce, accentEl, accentClass: "x--error",
    container, lineClass: "x-error", lineId: "x-1",
  };
  return { container, accentEl, announce, refs };
}

describe("syncError", () => {
  it("reserves an empty line and sets no aria when the host has no error", () => {
    const host = document.createElement("div");
    const { container, accentEl, announce, refs } = harness();
    syncError(host, refs);
    const line = container.querySelector(".x-error");
    expect(line).toBeTruthy();
    expect(line.getAttribute("part")).toBe("error");
    expect(line.textContent).toBe("");
    expect(accentEl.classList.contains("x--error")).toBe(false);
    expect(announce.hasAttribute("aria-invalid")).toBe(false);
    expect(announce.hasAttribute("aria-describedby")).toBe(false);
  });

  it("shows the message, accent and aria wiring when the host has an error", () => {
    const host = document.createElement("div");
    host.setAttribute("error", "Nope");
    const { container, accentEl, announce, refs } = harness();
    syncError(host, refs);
    const line = container.querySelector(".x-error");
    expect(line.textContent).toBe("Nope");
    expect(accentEl.classList.contains("x--error")).toBe(true);
    expect(announce.getAttribute("aria-invalid")).toBe("true");
    expect(announce.getAttribute("aria-describedby")).toBe("x-1");
  });

  it("sets aria-invalid but not describedby for a bare error attribute", () => {
    const host = document.createElement("div");
    host.setAttribute("error", "");
    const { announce, refs } = harness();
    syncError(host, refs);
    expect(announce.getAttribute("aria-invalid")).toBe("true");
    expect(announce.hasAttribute("aria-describedby")).toBe(false);
  });

  it("drops only the accent when error-muted is set; message and invalid state stay", () => {
    const host = document.createElement("div");
    host.setAttribute("error", "Nope");
    host.setAttribute("error-muted", "");
    const { container, accentEl, announce, refs } = harness();
    syncError(host, refs);
    const line = container.querySelector(".x-error");
    expect(line.textContent).toBe("Nope"); // red message stays
    expect(accentEl.classList.contains("x--error")).toBe(false); // chrome accent dropped
    expect(announce.getAttribute("aria-invalid")).toBe("true"); // still invalid until re-validated
    expect(announce.getAttribute("aria-describedby")).toBe("x-1"); // message still announced
  });

  it("ignores error-muted when there is no error", () => {
    const host = document.createElement("div");
    host.setAttribute("error-muted", "");
    const { container, accentEl, announce, refs } = harness();
    syncError(host, refs);
    const line = container.querySelector(".x-error");
    expect(line.textContent).toBe("");
    expect(accentEl.classList.contains("x--error")).toBe(false);
    expect(announce.hasAttribute("aria-invalid")).toBe(false);
    expect(announce.hasAttribute("aria-describedby")).toBe(false);
  });

  it("re-arms the accent when error-muted is removed", () => {
    const host = document.createElement("div");
    host.setAttribute("error", "Nope");
    host.setAttribute("error-muted", "");
    const { accentEl, announce, refs } = harness();
    syncError(host, refs);
    expect(accentEl.classList.contains("x--error")).toBe(false);
    host.removeAttribute("error-muted");
    syncError(host, refs);
    expect(accentEl.classList.contains("x--error")).toBe(true);
    expect(announce.getAttribute("aria-invalid")).toBe("true");
  });

  it("does not create a second line on repeat calls", () => {
    const host = document.createElement("div");
    const { container, refs } = harness();
    syncError(host, refs);
    host.setAttribute("error", "Later");
    syncError(host, refs);
    expect(container.querySelectorAll(".x-error").length).toBe(1);
  });

  it("reserves no line and clears all aria when no-error-line is set", () => {
    const host = document.createElement("div");
    host.setAttribute("no-error-line", "");
    const { container, accentEl, announce, refs } = harness();
    expect(syncError(host, refs)).toBe(null);
    expect(container.querySelector(".x-error")).toBe(null);
    expect(accentEl.classList.contains("x--error")).toBe(false);
    expect(announce.hasAttribute("aria-invalid")).toBe(false);
    expect(announce.hasAttribute("aria-describedby")).toBe(false);
  });

  it("removes an existing line and accent when no-error-line is added later", () => {
    const host = document.createElement("div");
    host.setAttribute("error", "Nope");
    const { container, accentEl, announce, refs } = harness();
    syncError(host, refs);
    expect(container.querySelector(".x-error")).toBeTruthy();
    expect(accentEl.classList.contains("x--error")).toBe(true);
    host.setAttribute("no-error-line", "");
    expect(syncError(host, refs)).toBe(null);
    expect(container.querySelector(".x-error")).toBe(null);
    expect(accentEl.classList.contains("x--error")).toBe(false);
    expect(announce.hasAttribute("aria-invalid")).toBe(false);
    expect(announce.hasAttribute("aria-describedby")).toBe(false);
  });
});
