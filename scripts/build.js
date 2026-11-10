import esbuild from "esbuild";
import { cp, mkdir, rm, readFile, writeFile } from "node:fs/promises";
import { watch } from "node:fs";
import path from "node:path";

const serve = process.argv.includes("--serve");

// Make `import x from "./y.css?raw"` return the file's text (matches Vite's ?raw).
// Also covers .svg, which the logo inlines. Vitest resolves ?raw itself, but only
// honours it for the SVG: a CSS import there yields an empty string, which is why
// the CSS specs read their file off disk.
const rawText = {
  name: "raw-text",
  setup(build) {
    build.onResolve({ filter: /\.(css|svg)\?raw$/ }, (args) => ({
      path: path.resolve(args.resolveDir, args.path.replace(/\?raw$/, "")),
      namespace: "raw-text",
    }));
    build.onLoad({ filter: /.*/, namespace: "raw-text" }, async (args) => ({
      contents: await readFile(args.path, "utf8"),
      loader: "text",
    }));
  },
};

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await cp("src/foundation/fonts", "dist/fonts", { recursive: true });

// The logo element inlines these, but they are published too: an <img> is the
// better choice wherever the logo is the LCP element, and the design system
// hands the files out.
await cp("src/foundation/logos", "dist/logos", { recursive: true });

const read = (file) => readFile(file, "utf8");

const FOUNDATION_CSS = ["typography", "background", "navigation", "markdown"].map((name) => `src/foundation/${name}.css`);
const PUBLISHED_FOUNDATION_CSS = ["src/foundation/tokens.css", ...FOUNDATION_CSS];

const LIGHT_COMPONENT_CSS = [
  "src/components/reset.css",
  "src/components/badge/badge.css",
  "src/components/button/button.css",
  "src/components/copy/copy.css",
  "src/components/deal-id/deal-id.css",
  "src/components/logo/logo.css",
  "src/components/notice/notice.css",
  "src/components/status-dot/status-dot.css",
];

const COMPONENTS_CSS_SOURCES = ["src/foundation/fonts.css", "src/foundation/tokens.css", ...LIGHT_COMPONENT_CSS];

const composeComponentsCss = async () =>
  [":root { --neuwo-components: 1; }", ...(await Promise.all(COMPONENTS_CSS_SOURCES.map(read)))].join("\n");

const writeStylesheets = async () => {
  await mkdir("dist/foundation", { recursive: true });
  await Promise.all(PUBLISHED_FOUNDATION_CSS.map((file) => cp(file, path.join("dist/foundation", path.basename(file)))));

  const fontsCss = await read("src/foundation/fonts.css");
  await writeFile("dist/foundation/fonts.css", fontsCss.replaceAll("url('fonts/", "url('../fonts/"));

  const componentsCss = await composeComponentsCss();
  await writeFile("dist/neuwo-components.css", componentsCss);
  await writeFile("dist/neuwo.css", [componentsCss, ...(await Promise.all(FOUNDATION_CSS.map(read)))].join("\n"));

  await cp("src/components", "dist/components", {
    recursive: true,
    filter: (src) => !src.endsWith(".js"),
  });
};

await writeStylesheets();

// Ship the hand-authored declaration files (the ?raw ambient and the tag map).
await cp("src/types", "dist/types", { recursive: true });

const componentsCssModule = {
  name: "components-css",
  setup(build) {
    build.onResolve({ filter: /^neuwo:components-css$/ }, (args) => ({ path: args.path, namespace: "components-css" }));
    build.onLoad({ filter: /.*/, namespace: "components-css" }, async () => ({
      contents: await composeComponentsCss(),
      loader: "text",
      watchFiles: COMPONENTS_CSS_SOURCES.map((file) => path.resolve(file)),
    }));
  },
};

const shared = {
  bundle: true,
  format: "esm",
  // Parse and compile cost scales with raw bytes, not compressed ones, so this
  // buys more than the transfer saving suggests.
  minify: true,
  plugins: [rawText],
  logLevel: "info",
};

const builds = [
  { ...shared, entryPoints: ["src/index.js"], outfile: "dist/neuwo.js" },
  {
    ...shared,
    entryPoints: ["src/standalone.js"],
    outfile: "dist/neuwo-standalone.js",
    plugins: [rawText, componentsCssModule],
  },
  { ...shared, entryPoints: ["src/server/index.js"], outfile: "dist/server.js", platform: "node" },
  { ...shared, entryPoints: ["src/react/jsx-runtime.js"], outfile: "dist/jsx-runtime.js", external: ["react"] },
  { ...shared, entryPoints: ["src/react/jsx-dev-runtime.js"], outfile: "dist/jsx-dev-runtime.js", external: ["react"] },
  { ...shared, entryPoints: ["src/react/jsx-runtime.react-server.js"], outfile: "dist/jsx-runtime.react-server.js", external: ["react"] },
  { ...shared, entryPoints: ["src/react/jsx-dev-runtime.react-server.js"], outfile: "dist/jsx-dev-runtime.react-server.js", external: ["react"] },
];

if (serve) {
  const contexts = await Promise.all(builds.map((options) => esbuild.context(options)));
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  const { port } = await contexts[0].serve({ servedir: ".", port: 8000 });

  let timer;
  const rewriteStylesheets = (_event, file) => {
    if (!file?.endsWith(".css")) return;
    clearTimeout(timer);
    timer = setTimeout(() => writeStylesheets().catch((error) => console.error(error)), 50);
  };
  watch("src/foundation", { recursive: true }, rewriteStylesheets);
  watch("src/components", { recursive: true }, rewriteStylesheets);
  console.log(`Serving demo at http://localhost:${port}/demo/`);
} else {
  await Promise.all(builds.map((options) => esbuild.build(options)));
  console.log(`Built ${builds.map((options) => options.outfile).join(", ")}`);
}
