// Reads the component JS (and its JSDoc) and writes custom-elements.json to the
// repo root. The hand-authored .d.ts files are not components, so exclude them.
export default {
  globs: ["src/**/*.js"],
  exclude: ["src/**/*.d.ts"],
  outdir: ".",
  litelement: false,
};
