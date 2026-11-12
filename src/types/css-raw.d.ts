// Imports the esbuild plugins in scripts/build.js resolve, which tsc cannot.
declare module "*.css?raw" {
  const css: string;
  export default css;
}

declare module "*.svg?raw" {
  const svg: string;
  export default svg;
}

declare module "neuwo:components-css" {
  const css: string;
  export default css;
}
