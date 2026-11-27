/** @typedef {import("../../scripts/colour-fallback.js").Rgba} Rgba */

/** @param {number} channel */
const linear = (channel) => {
  const c = Math.min(1, Math.max(0, channel));
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** @param {Rgba} colour */
const luminance = ({ r, g, b }) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

/**
 * @param {Rgba} a
 * @param {Rgba} b
 */
export function contrast(a, b) {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * @param {Rgba} top
 * @param {number} alpha
 * @param {Rgba} ground
 * @returns {Rgba}
 */
export function over(top, alpha, ground) {
  const mix = (/** @type {"r" | "g" | "b"} */ key) => top[key] * alpha + ground[key] * (1 - alpha);
  return { r: mix("r"), g: mix("g"), b: mix("b"), a: 1 };
}
