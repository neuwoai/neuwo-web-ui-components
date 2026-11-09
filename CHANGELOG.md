# Changelog

## Unreleased

- Brand fonts now load when `neuwo.js` is imported through a bundler. Vite, webpack and
  Turbopack copy the woff2 files into the app's output and rewrite their URLs; previously the
  faces 404'd into a system fallback unless `fonts/` was served beside the bundle.

## 0.1.0

First published release. Pre-1.0, so breaking changes ship in minor bumps until the API settles.

- Renamed to the Neuwo Web UI Library, published as `@neuwo/web-ui-library--demo`.
- Licensed MIT.
- Published artefacts: `dist/neuwo.js`, the combined `dist/neuwo.css`, each foundation sheet and
  component recipe as its own file, the three woff2 faces, the four wordmark SVGs, generated
  types, and `custom-elements.json`.
