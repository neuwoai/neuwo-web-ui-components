/**
 * @param {Function} klass
 * @returns {string[]}
 */
export function ancestry(klass) {
  const names = [];
  for (let each = Object.getPrototypeOf(klass); each && each !== HTMLElement; each = Object.getPrototypeOf(each)) names.push(each.name);
  return names;
}
