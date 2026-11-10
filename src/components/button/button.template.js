import { h, has, region } from "../../core/template.js";

/**
 * @param {Record<string, string>} attrs
 * @returns {import("../../core/template.js").TemplateNode}
 */
export function buttonTemplate(attrs) {
  const disabled = has(attrs, "disabled");
  const loading = has(attrs, "loading");
  const link = Boolean(attrs.href) && !disabled;

  const classes = ["neuwo-btn", `neuwo-btn--${attrs.variant || "solid"}`];
  if (attrs.size) classes.push(`neuwo-btn--${attrs.size}`);
  if (attrs.hover === "s" || attrs.hover === "l") classes.push(`neuwo-btn--hover-${attrs.hover}`);
  for (const modifier of ["wide", "xwide", "loading", "block"]) {
    if (has(attrs, modifier)) classes.push(`neuwo-btn--${modifier}`);
  }

  /** @type {Record<string, string | boolean>} */
  const props = { class: classes.join(" ") };
  if (link) {
    props.href = attrs.href;
    for (const name of ["target", "rel", "download"]) if (has(attrs, name)) props[name] = attrs[name];
  } else {
    props.type = attrs.type || "button";
    props.disabled = disabled || loading;
    for (const name of ["form", "name", "value"]) if (has(attrs, name)) props[name] = attrs[name];
  }
  for (const [name, value] of Object.entries(attrs)) {
    if (name === "title" || name.startsWith("aria-")) props[name] = value;
  }
  if (loading) props["aria-busy"] = "true";

  return h(
    link ? "a" : "button",
    props,
    loading && h("span", { class: "neuwo-btn__spinner", "aria-hidden": "true" }),
    h("span", { class: "neuwo-btn__start" }, region("start")),
    h("span", { class: "neuwo-btn__label" }, region()),
    h("span", { class: "neuwo-btn__end" }, region("end")),
  );
}
