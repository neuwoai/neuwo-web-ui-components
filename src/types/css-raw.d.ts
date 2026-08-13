// The esbuild `raw-text` plugin turns `import x from "./y.css?raw"` into the
// file's text. tsc has no loader for this query, so declare it as a string
// module, otherwise checkJs fails on every component that imports its recipe.
declare module "*.css?raw" {
  const css: string;
  export default css;
}

// Same treatment for the logo SVGs, which the logo element inlines as markup.
declare module "*.svg?raw" {
  const svg: string;
  export default svg;
}
