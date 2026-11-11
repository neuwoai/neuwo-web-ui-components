// Mirrors react-hook-form 7.92.0: register's ref, onChange, getFieldValue, getCheckboxValue and setFieldValue.

const isCheckBoxInput = (element) => element.type === "checkbox";
const isRadioOrCheckbox = (element) => element.type === "radio" || isCheckBoxInput(element);

function getCheckboxValue(options) {
  const option = options[0];
  if (!option || !option.checked || option.disabled) return false;
  if (!option.attributes || !("value" in option.attributes)) return true;
  return option.value === undefined || option.value === "" ? true : option.value;
}

const getFieldValue = (field) => (isCheckBoxInput(field.ref) ? getCheckboxValue(field.refs) : field.ref.value);

/**
 * A form with React Hook Form's handling of one registered field per name.
 * @param {Record<string, unknown>} [defaultValues]
 */
export function useForm(defaultValues = {}) {
  /** @type {Record<string, { element: Element, ref: { type?: string, value?: unknown }, refs?: Element[] }>} */
  const fields = {};
  /** @type {Record<string, unknown>} */
  const values = {};

  function setFieldValue(name, value) {
    const field = fields[name];
    values[name] = value;
    if (field.refs) {
      for (const ref of field.refs) if (!ref.defaultChecked || !ref.disabled) ref.checked = value === ref.value || !!value;
    } else field.ref.value = value;
  }

  function settle(name) {
    if (defaultValues[name] === undefined || fields[name].element.defaultChecked) values[name] = getFieldValue(fields[name]);
    else setFieldValue(name, defaultValues[name]);
  }

  /** @param {string} name */
  function register(name) {
    return {
      name,
      onChange(/** @type {Event} */ event) {
        const target = /** @type {HTMLInputElement} */ (event.target);
        values[target.name] = target.type ? getFieldValue(fields[target.name]) : target.value;
      },
      ref(/** @type {Element | null} */ ref) {
        if (!ref) return;
        const fieldRef = ref.value === undefined ? ref.querySelectorAll("input,select,textarea")[0] || ref : ref;
        fields[name] = isRadioOrCheckbox(fieldRef) ? { element: fieldRef, ref: { type: fieldRef.type }, refs: [fieldRef] } : { element: fieldRef, ref: fieldRef };
        settle(name);
      },
    };
  }

  // React Hook Form's reset() resets the first form a field is in, then registers every field again.
  function reset() {
    Object.values(fields).find((field) => field.element.closest("form"))?.element.closest("form").reset();
    for (const name of Object.keys(fields)) settle(name);
  }

  return { register, reset, values, fields };
}
