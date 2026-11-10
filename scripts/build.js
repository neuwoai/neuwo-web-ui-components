import esbuild from "esbuild";
import { cp, mkdir, rm, readFile, writeFile } from "node:fs/promises";
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

// Publish the raw CSS so the design system can parse it and non-web outputs can copy it.
await mkdir("dist/foundation", { recursive: true });
await cp("src/foundation/tokens.css", "dist/foundation/tokens.css");
await cp("src/foundation/typography.css", "dist/foundation/typography.css");
await cp("src/foundation/background.css", "dist/foundation/background.css");
await cp("src/foundation/navigation.css", "dist/foundation/navigation.css");
await cp("src/foundation/markdown.css", "dist/foundation/markdown.css");

const read = (file) => readFile(file, "utf8");

const fontsCss = await read("src/foundation/fonts.css");
await writeFile("dist/foundation/fonts.css", fontsCss.replaceAll("url('fonts/", "url('../fonts/"));

const LIGHT_COMPONENT_CSS = [
  "src/components/reset.css",
  "src/components/badge/badge.css",
  "src/components/button/button.css",
  "src/components/deal-id/deal-id.css",
  "src/components/logo/logo.css",
  "src/components/status-dot/status-dot.css",
];

const composeComponentsCss = async () =>
  [
    ":root { --neuwo-components: 1; }",
    ...(await Promise.all(["src/foundation/fonts.css", "src/foundation/tokens.css", ...LIGHT_COMPONENT_CSS].map(read))),
  ].join("\n");

const componentsCss = await composeComponentsCss();
await writeFile("dist/neuwo-components.css", componentsCss);

const combinedCss = [
  componentsCss,
  await read("src/foundation/typography.css"),
  await read("src/foundation/background.css"),
  await read("src/foundation/navigation.css"),
  await read("src/foundation/markdown.css"),
].join("\n");
await writeFile("dist/neuwo.css", combinedCss);

// Component recipes only (the .js stays bundled into neuwo.js).
await cp("src/components", "dist/components", {
  recursive: true,
  filter: (src) => !src.endsWith(".js"),
});

// Ship the hand-authored declaration files (the ?raw ambient and the tag map).
await cp("src/types", "dist/types", { recursive: true });

const componentsCssModule = {
  name: "components-css",
  setup(build) {
    build.onResolve({ filter: /^neuwo:components-css$/ }, (args) => ({ path: args.path, namespace: "components-css" }));
    build.onLoad({ filter: /.*/, namespace: "components-css" }, async () => ({
      contents: await composeComponentsCss(),
      loader: "text",
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
];

if (serve) {
  const contexts = await Promise.all(builds.map((options) => esbuild.context(options)));
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  const { port } = await contexts[0].serve({ servedir: ".", port: 8000 });
  console.log(`Serving demo at http://localhost:${port}/demo/`);
} else {
  await Promise.all(builds.map((options) => esbuild.build(options)));
  console.log(`Built ${builds.map((options) => options.outfile).join(", ")}`);
}
