import { control, h, has, region } from "../../../core/template.js";
import { ariaAttrs } from "../../fields/field.template.js";
import { readOptions, resolveValue } from "../../fields/options.js";
import { choiceTemplate, errorAccent } from "../choice.template.js";

/** @typedef {import("../../fields/options.js").ListOption} ListOption */

/**
 * The segmented control: a horizontal radiogroup holding the sliding pill, one button per option, the hidden
 * `<select>` that keeps the author's options and the hidden form value, then the error line. The button of the
 * starting value is checked, which gives it the selected look from CSS, so the first paint shows it with no
 * script; the element places the pill only once the user picks.
 * @param {Record<string, string>} attrs
 * @param {import("../../../core/template.js").TemplateContext} ctx
 * @returns {import("../../../core/template.js").TemplateNode}
 */
export function segmentedTemplate(attrs, ctx) {
  const options = readOptions(ctx.children);
  const value = resolveValue(attrs, options);
  const disabled = has(attrs, "disabled");
  const chosen = options.find((option) => !option.disabled && option.value === value);
  /** @param {ListOption} option */
  const live = (option) => !disabled && !option.disabled;
  const stop = chosen && live(chosen) ? chosen : options.find(live);
  return choiceTemplate(
    attrs,
    ctx,
    h(
      "div",
      {
        class: errorAccent(attrs) ? "neuwo-segmented neuwo-segmented--error" : "neuwo-segmented",
        role: "radiogroup",
        "aria-orientation": "horizontal",
        "aria-label": attrs.label || null,
        "aria-required": has(attrs, "required") && "true",
        ...ariaAttrs(attrs, ctx),
      },
      h("span", { class: "neuwo-segmented__indicator", "aria-hidden": "true" }),
      options.map((option) =>
        h(
          "button",
          {
            class: "neuwo-segmented__option",
            type: "button",
            role: "radio",
            "data-value": option.value,
            "aria-checked": String(option === chosen),
            tabindex: option === stop ? "0" : "-1",
            disabled: !live(option),
          },
          option.label,
        ),
      ),
      h("select", { class: "neuwo-segmented__options", hidden: true, tabindex: "-1", "aria-hidden": "true" }, region()),
      control(
        h("input", {
          class: "neuwo-segmented__form-value",
          type: "text",
          tabindex: "-1",
          "aria-hidden": "true",
          autocomplete: "off",
          name: attrs.name,
          value,
          required: has(attrs, "required"),
          disabled,
          form: attrs.form,
        }),
      ),
    ),
  );
}
