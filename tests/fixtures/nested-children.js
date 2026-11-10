/** @param {string} value */
export const described = (value) => ({ tag: null, attrs: {}, text: value, slot: "default" });

export const OPTGROUP = '<optgroup label="G"><option value="a">A</option>\n<option>B</option></optgroup>';

export const NESTED = {
  tag: "optgroup",
  attrs: { label: "G" },
  text: "A\nB",
  slot: "default",
  children: [
    { tag: "option", attrs: { value: "a" }, text: "A", slot: "default", children: [described("A")] },
    { tag: "option", attrs: {}, text: "B", slot: "default", children: [described("B")] },
  ],
};
