import { h, has, region } from "../../../core/template.js";
import { ariaAttrs } from "../../fields/field.template.js";
import { choiceTemplate, errorAccent } from "../choice.template.js";

/**
 * The radio group's shell: the radiogroup with its legend and the region its radios sit in, then the error line.
 * It renders no form control; each radio reads the group's attributes and renders its own.
 * @param {Record<string, string>} attrs
 * @param {import("../../../core/template.js").TemplateContext} ctx
 * @returns {import("../../../core/template.js").TemplateNode}
 */
export function radioGroupTemplate(attrs, ctx) {
  const classes = ["neuwo-radio-group"];
  if (attrs.orientation === "horizontal") classes.push("neuwo-radio-group--horizontal");
  if (errorAccent(attrs)) classes.push("neuwo-radio-group--error");
  return choiceTemplate(
    attrs,
    ctx,
    h(
      "div",
      {
        class: classes.join(" "),
        role: "radiogroup",
        "aria-required": has(attrs, "required") && "true",
        "aria-labelledby": attrs.label ? ctx.id("legend") : null,
        ...ariaAttrs(attrs, ctx),
      },
      h("span", { class: "neuwo-radio-group__legend", id: ctx.id("legend"), hidden: !attrs.label }, attrs.label),
      h("div", { class: "neuwo-radio-group__options" }, region()),
    ),
  );
}
