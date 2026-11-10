import { control, h, has } from "../../../core/template.js";
import { controlAttrs, controlClass, fieldTemplate } from "../field.template.js";

const FORWARDED = ["name", "min", "max", "step", "value"];

/**
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
function numberOr(value, fallback) {
  if (value == null || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

/**
 * @param {unknown} min
 * @param {unknown} max
 * @returns {number}
 */
function midpoint(min, max) {
  const low = numberOr(min, 0);
  const high = numberOr(max, 100);
  return high < low ? low : low + (high - low) / 2;
}

/**
 * The share of a range's track that lies left of the thumb, as a percentage rounded to two decimals. A missing
 * value is the native default: the midpoint, or the minimum when the bounds are inverted.
 * @param {unknown} value
 * @param {unknown} min
 * @param {unknown} max
 * @returns {number}
 */
export function fillPercent(value, min, max) {
  const low = numberOr(min, 0);
  const high = numberOr(max, 100);
  const current = value == null || value === "" ? midpoint(low, high) : Number(value);
  if (!(high > low) || !Number.isFinite(current)) return 0;
  const percent = Math.min(100, Math.max(0, ((current - low) / (high - low)) * 100));
  return Math.round(percent * 100) / 100;
}

/**
 * @param {Record<string, string>} attrs
 * @param {import("../../../core/template.js").TemplateContext} ctx
 * @returns {import("../../../core/template.js").TemplateNode}
 */
export function rangeTemplate(attrs, ctx) {
  return fieldTemplate(
    attrs,
    ctx,
    control(
      h("input", {
        class: `${controlClass(attrs)} neuwo-range`,
        type: "range",
        ...controlAttrs(attrs, ctx, FORWARDED),
        value: has(attrs, "value") ? attrs.value : midpoint(attrs.min, attrs.max),
        style: `--neuwo-range-fill:${fillPercent(attrs.value, attrs.min, attrs.max)}%`,
      }),
    ),
  );
}
