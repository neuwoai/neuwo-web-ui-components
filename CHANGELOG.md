# Changelog

## Unreleased

- Breaking: `neuwo.js` no longer carries fonts or tokens. Link `neuwo-components.css` (or `neuwo.css`) on
  the page, or import it where you import the library; `<style data-neuwo-fonts>` is no longer read.
- `neuwo-standalone.js` is for pages that can only add a script: it embeds `neuwo-components.css`, applies
  it only when the page has not linked it, and loads the fonts from beside itself.
- New entries: `./server` exports `expand(html)`, `renderElement` and the Eleventy plugin, with its HTML
  parser bundled; `./jsx-runtime` and `./jsx-dev-runtime` wrap React's runtime for `jsxImportSource`.
- `neuwo.js` can be imported on a server, where it registers nothing, and loading it twice no longer throws.
- `neuwo-components.css` and `foundation/fonts.css` are now published, and `neuwo.css` carries the font faces.
- Breaking: every custom property is now prefixed `--neuwo-` (tokens such as `--neuwo-color-blue`
  and component properties such as `--neuwo-copy-inset`), so the library cannot collide with a
  host page. Rename any overrides in your own CSS.
- Breaking: the foundation classes are now prefixed `neuwo-`: `.neuwo-body`, `.neuwo-background__gradient`,
  `.neuwo-nav-link`, `.neuwo-markdown`, `.neuwo-callout`, `.neuwo-link` and `.neuwo-eyebrow`, with their
  modifiers and elements. Update the class attributes in your markup.
- React JSX types, generated from the manifest: `import type {} from
  "@neuwo/web-ui-library--demo/react"` types every element's attributes and custom events.
- `copied` on `<neuwo-copy>` is typed `CustomEvent<{ text: string }>`.
- README: a React section covering setup, props and events in React 19, React 18's limits, and
  loading in Next.js.
- Brand fonts now load when the stylesheet is imported through a bundler, which copies the woff2 files
  its `url()`s name into the app's output; previously the faces 404'd into a system fallback unless
  `fonts/` was served beside the bundle.

## 0.1.0

First published release. Pre-1.0, so breaking changes ship in minor bumps until the API settles.

- Renamed to the Neuwo Web UI Library, published as `@neuwo/web-ui-library--demo`.
- Licensed MIT.
- Published artefacts: `dist/neuwo.js`, the combined `dist/neuwo.css`, each foundation sheet and
  component recipe as its own file, the three woff2 faces, the four wordmark SVGs, generated
  types, and `custom-elements.json`.
