# Neuwo with Eleventy

An Eleventy 3 site that uses the Neuwo Web UI Library. The page is written in Markdown and holds one sign-up form with
a name, email, role, weekly digest and consent field (`<neuwo-input>`, `<neuwo-combobox>`, `<neuwo-toggle>`,
`<neuwo-checkbox>`, `<neuwo-button>`, `<neuwo-notice>`), plus a `<neuwo-logo>`, the library's typography and the
full-viewport background wash. The library's plugin writes every component out as full markup at build time.

## Run it

```bash
npm install
npm run dev
```

While 0.2.0 is not on npm, `npm install` finds no such version; install the packed library as described in the next section instead, then run `npm run dev`.

`npm run build` writes the site to `_site/`.

## Try an unreleased library change

Until 0.2.0 is on npm, this is also the way to run the example at all, in place of `npm install`. In the repository root, pack the library, then
install the tarball in the example:

```bash
npm pack
cd demo/eleventy
npm install --no-save ../../neuwo-web-ui-library--demo-<version>.tgz
```

`--no-save` leaves `package.json` untouched, so the dependency stays the published range.

## The setup

Four places carry the library's setup.

- [package.json](package.json) lists the library under `dependencies` at the released minor version, because the
  plugin and the copied files are read at build time:

  ```json
  "@neuwo/web-ui-library--demo": "^0.2.0"
  ```

- [eleventy.config.js](eleventy.config.js) adds the plugin, which runs `expand` on every `.html` output:

  ```js
  import { eleventyPlugin as neuwo } from "@neuwo/web-ui-library--demo/server";

  eleventyConfig.addPlugin(neuwo);
  ```

  It also copies `neuwo.css`, `neuwo.js` and `fonts/` out of the package to `/neuwo/`, finding the package through
  module resolution. The files are copied rather than linked from a CDN so every runtime request stays on the site's own
  origin; `neuwo.css` refers to its fonts by relative URL, which is why they keep their folder.
- [src/_includes/base.njk](src/_includes/base.njk) links `/neuwo/neuwo.css`, preloads the two variable fonts, loads
  `/neuwo/neuwo.js` as a module and puts `neuwo-body` on the `<body>`, which gives the page its ink and paper.
- [src/_includes/base.njk](src/_includes/base.njk) and [src/page.css](src/page.css) add the wash: a fixed frame at
  `--neuwo-z-background` holding a `.neuwo-background__gradient`, written with logical properties. The library supplies
  the gradient; the page supplies the frame.

## What to look at

- View the page source: every component is already drawn in the HTML, before any script runs. The build writes the
  elements' markup, so the page paints on-brand from the first frame.
- [src/index.md](src/index.md) is plain Markdown with the components on their own lines, outside paragraphs of text,
  which keeps the Markdown renderer from wrapping a block component in a `<p>`.
- [src/sign-up.js](src/sign-up.js) is plain JavaScript. It sets `loading` on the button from the start of the submit
  handler until the submission ends, so a submission the browser's validation blocks never shows it, then reveals the
  confirmation with every `FormData` entry. It stands in for a backend.
- [src/page.css](src/page.css) lays the form out using the library's spacing tokens.

## Copying it

Take the whole folder, without `node_modules/` and `_site/`. Nothing in it points outside its own folder. The example
links `neuwo.css`, which holds the components, the typography and the page surface. On a page that keeps its own
typography, copy and link `neuwo-components.css` instead, and drop `neuwo-body` from the `<body>` if the page has its
own background.
