import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { eleventyPlugin as neuwo } from "@neuwo/web-ui-library--demo/server";

const require = createRequire(import.meta.url);
const dist = join(dirname(require.resolve("@neuwo/web-ui-library--demo/package.json")), "dist");

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(neuwo);
  eleventyConfig.addPassthroughCopy({
    [relative(process.cwd(), join(dist, "neuwo.css"))]: "neuwo/neuwo.css",
    [relative(process.cwd(), join(dist, "neuwo.js"))]: "neuwo/neuwo.js",
    [relative(process.cwd(), join(dist, "fonts"))]: "neuwo/fonts",
  });
  eleventyConfig.addPassthroughCopy("src/sign-up.js");
  eleventyConfig.addPassthroughCopy("src/page.css");
  return { dir: { input: "src" } };
}
