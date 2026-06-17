import esbuild from "esbuild";
import { cp, mkdir, rm, readFile } from "node:fs/promises";
import path from "node:path";

const serve = process.argv.includes("--serve");

// Make `import x from "./y.css?raw"` return the file's text (matches Vite's ?raw).
const cssRaw = {
  name: "css-raw",
  setup(build) {
    build.onResolve({ filter: /\.css\?raw$/ }, (args) => ({
      path: path.resolve(args.resolveDir, args.path.replace(/\?raw$/, "")),
      namespace: "css-raw",
    }));
    build.onLoad({ filter: /.*/, namespace: "css-raw" }, async (args) => ({
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
  plugins: [cssRaw],
  logLevel: "info",
};

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await cp("src/foundation/fonts", "dist/fonts", { recursive: true });

if (serve) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: ".", port: 8000 });
  console.log(`Serving demo at http://localhost:${port}/demo/`);
} else {
  await esbuild.build(options);
  console.log("Built dist/neuwo.js");
}
