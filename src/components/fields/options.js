import { DEFAULT_REGION, has } from "../../core/template.js";

/** @typedef {import("../../core/template.js").ChildInfo} ChildInfo */
/** @typedef {{ value: string, label: string, disabled: boolean, selected: boolean, group: string, index: number }} ListOption */

/**
 * The options a widget lists, from its `<option>` children and those of its `<optgroup>` children, in order.
 * An option's value is its `value` attribute, else its trimmed text, which is also its label.
 * @param {ChildInfo[]} children
 * @returns {ListOption[]}
 */
export function readOptions(children) {
  /** @type {ListOption[]} */
  const options = [];
  /**
   * @param {ChildInfo[]} list
   * @param {string} group
   */
  const read = (list, group) => {
    for (const child of list) {
      if (child.tag === "option") {
        const label = child.text.trim();
        options.push({
          value: child.attrs.value ?? label,
          label,
          disabled: has(child.attrs, "disabled"),
          selected: has(child.attrs, "selected"),
          group,
          index: options.length,
        });
      } else if (child.tag === "optgroup") read(child.children ?? [], child.attrs.label ?? "");
    }
  };
  read(children.filter((child) => child.slot === DEFAULT_REGION), "");
  return options;
}

/**
 * The value a widget starts with: the `value` attribute when it names an enabled option, else the first enabled
 * option marked `selected`, else nothing.
 * @param {Record<string, string>} attrs
 * @param {ListOption[]} options
 * @returns {string}
 */
export function resolveValue(attrs, options) {
  const enabled = options.filter((option) => !option.disabled);
  if (has(attrs, "value") && enabled.some((option) => option.value === attrs.value)) return attrs.value;
  return enabled.find((option) => option.selected)?.value ?? "";
}
