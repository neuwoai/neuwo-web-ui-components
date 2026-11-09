/**
 * @param {string} prefix
 * @returns {() => (suffix: string) => string}
 */
export function idScope(prefix) {
  let count = 0;
  return () => {
    const scope = `${prefix}${++count}-`;
    return (suffix) => scope + suffix;
  };
}
