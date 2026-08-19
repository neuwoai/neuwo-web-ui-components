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

const options = {
  entryPoints: ["src/index.js"],
  bundle: true,
  format: "esm",
  outfile: "dist/neuwo.js",
  plugins: [rawText],
  logLevel: "info",
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

// One combined foundation stylesheet so a consumer can link a single file:
// tokens first, then the sheets that depend on them.
const combinedCss = [
  await readFile("src/foundation/tokens.css", "utf8"),
  await readFile("src/foundation/typography.css", "utf8"),
  await readFile("src/foundation/background.css", "utf8"),
  await readFile("src/foundation/navigation.css", "utf8"),
  await readFile("src/foundation/markdown.css", "utf8"),
].join("\n");
await writeFile(
  "dist/neuwo.css",
  `/* @neuwo/web-ui-components foundation: design tokens, typography, page surface, navigation, Markdown. */\n${combinedCss}`
);

// Component recipes only (the .js stays bundled into neuwo.js).
await cp("src/components", "dist/components", {
  recursive: true,
  filter: (src) => !src.endsWith(".js"),
});

// Ship the hand-authored declaration files (the ?raw ambient and the tag map).
await cp("src/types", "dist/types", { recursive: true });

if (serve) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: ".", port: 8000 });
  console.log(`Serving demo at http://localhost:${port}/demo/`);
} else {
  await esbuild.build(options);
  console.log("Built dist/neuwo.js");
}
