import { control, h, has, live } from "../../../core/template.js";
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

/** @param {unknown} value */
const isNumber = (value) => value != null && value !== "" && Number.isFinite(Number(value));

/**
 * The value a browser gives a range input with these attributes: the default (the midpoint) for a missing or
 * invalid value, clamped into the bounds, then rounded to the nearest step, a tie going up. The step base is `min`,
 * else the authored `value` (so that value is on-step by definition), else 0.
 * @param {Record<string, string>} attrs
 * @returns {number}
 */
export function rangeValue(attrs) {
  const min = numberOr(attrs.min, 0);
  const max = Math.max(min, numberOr(attrs.max, 100));
  const given = attrs.value == null || attrs.value === "" ? NaN : Number(attrs.value);
  const value = Math.min(max, Math.max(min, Number.isFinite(given) ? given : min + (max - min) / 2));
  const step = attrs.step === "any" ? 0 : numberOr(attrs.step, 1);
  if (!(step > 0)) return value;
  const authored = Number(attrs.value);
  const base = isNumber(attrs.min) ? min : isNumber(attrs.value) ? authored : 0;
  const at = (/** @type {number} */ count) => Number((base + count * step).toPrecision(12));
  let count = Math.floor(Number(((value - base) / step).toPrecision(12)) + 0.5);
  if (at(count) > max) count -= 1;
  else if (at(count) < min) count += 1;
  return at(count);
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
  const current = value == null || value === "" ? (high < low ? low : low + (high - low) / 2) : Number(value);
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
    live(
      control(
        h("input", {
          class: `${controlClass(attrs)} neuwo-range`,
          type: "range",
          ...controlAttrs(attrs, ctx, FORWARDED),
          value: has(attrs, "value") ? attrs.value : String(rangeValue(attrs)),
          style: `--neuwo-range-fill:${fillPercent(rangeValue(attrs), attrs.min, attrs.max)}%`,
        }),
      ),
    ),
  );
}
