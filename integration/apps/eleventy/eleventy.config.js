import { eleventyPlugin } from "@neuwo/web-ui-library--demo/server";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(eleventyPlugin);
  eleventyConfig.addPassthroughCopy({ "node_modules/@neuwo/web-ui-library--demo/dist": "neuwo" });
}
