import { h, region } from "../../core/template.js";

/**
 * @param {Record<string, string>} attrs
 * @param {import("../../core/template.js").TemplateContext} ctx
 * @returns {import("../../core/template.js").TemplateNode}
 */
export function ctaTemplate(attrs, ctx) {
  const level = parseInt(attrs["heading-level"] ?? "", 10);
  const state = attrs["status-state"];
  const filled = ctx.children.some((child) => child.slot === "field");

  const headline = h(level >= 1 && level <= 6 ? `h${level}` : "h2", { class: "neuwo-cta__headline" }, region());
  // Never a <p>: authors put paragraphs here, and a parser pushes those out of a <p>.
  const sub = h("div", { class: "neuwo-cta__sub" }, region("sub"));
  const field = h("div", { class: filled ? "neuwo-cta__field" : "neuwo-cta__field neuwo-cta__field--empty" }, region("field"));
  // Rendered even when empty: a live region inserted with its text already in place is not reliably announced.
  const status = h(
    "p",
    { class: state === "success" || state === "error" ? `neuwo-cta__status neuwo-cta__status--${state}` : "neuwo-cta__status", role: "status", "aria-live": "polite" },
    attrs.status,
  );
  const actions = h("div", { class: "neuwo-cta__actions" }, region("actions"));

  if (attrs.variant === "spotlight") {
    return h(
      "div",
      { class: "neuwo-cta neuwo-cta--spotlight" },
      h("div", { class: "neuwo-cta__glow", "aria-hidden": "true" }),
      h("div", { class: "neuwo-cta__inner" }, headline, sub, field, status, actions),
    );
  }
  return h("div", { class: "neuwo-cta neuwo-cta--banner" }, h("div", { class: "neuwo-cta__body" }, headline, sub, field, status), actions);
}
