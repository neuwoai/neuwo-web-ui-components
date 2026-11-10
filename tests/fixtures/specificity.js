/**
 * @param {string} list
 * @returns {string[]}
 */
export function splitTopLevel(list) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    if (list[i] === "(" || list[i] === "[") depth++;
    else if (list[i] === ")" || list[i] === "]") depth--;
    else if (list[i] === "," && depth === 0) {
      parts.push(list.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(list.slice(start).trim());
  return parts.filter(Boolean);
}

/**
 * @param {string} text
 * @param {number} from
 * @param {string} open
 * @param {string} close
 * @returns {number}
 */
export function closing(text, from, open, close) {
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    if (text[i] === open) depth++;
    else if (text[i] === close && --depth === 0) return i;
  }
  throw new Error(`unbalanced ${open} in ${text}`);
}

/**
 * @param {number[]} left
 * @param {number[]} right
 * @returns {number}
 */
export function compare(left, right) {
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] - right[i];
  return 0;
}

/**
 * @param {string} selector
 * @returns {number[]}
 */
export function weight(selector) {
  const total = [0, 0, 0];
  const add = ([a, b, c]) => {
    total[0] += a;
    total[1] += b;
    total[2] += c;
  };
  let i = 0;
  while (i < selector.length) {
    const char = selector[i];
    if (char === "[") {
      i = closing(selector, i, "[", "]") + 1;
      add([0, 1, 0]);
    } else if (char === "#" || char === ".") {
      i = selector.slice(i + 1).search(/[^\w-]|$/) + i + 1;
      add(char === "#" ? [1, 0, 0] : [0, 1, 0]);
    } else if (char === ":") {
      const element = selector[i + 1] === ":";
      const name = /^:{1,2}([\w-]+)/.exec(selector.slice(i))[1];
      i += (element ? 2 : 1) + name.length;
      let args = null;
      if (selector[i] === "(") {
        const end = closing(selector, i, "(", ")");
        args = selector.slice(i + 1, end);
        i = end + 1;
      }
      if (element || name === "where") continue;
      if (["is", "not", "has"].includes(name) && args !== null) {
        add(
          splitTopLevel(args)
            .map(weight)
            .reduce((max, next) => (compare(next, max) > 0 ? next : max), [0, 0, 0]),
        );
      } else add([0, 1, 0]);
    } else if (/[a-zA-Z]/.test(char)) {
      i = selector.slice(i).search(/[^\w-]|$/) + i;
      add([0, 0, 1]);
    } else i++;
  }
  return total;
}
