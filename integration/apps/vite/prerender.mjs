import { readFile, rm, writeFile } from "node:fs/promises";
import { build } from "vite";

const root = import.meta.dirname;
const MARKER = "<!--app-->";

await build({ root });
await build({ root, build: { ssr: "src/entry-server.jsx", outDir: "dist-server" } });
const { render } = await import(new URL("./dist-server/entry-server.js", import.meta.url).href);
const page = new URL("./dist/index.html", import.meta.url);
const template = await readFile(page, "utf8");
if (!template.includes(MARKER)) throw new Error(`dist/index.html has no ${MARKER} marker`);
await writeFile(page, template.replace(MARKER, () => render()));
await rm(new URL("./dist-server", import.meta.url), { recursive: true, force: true });
