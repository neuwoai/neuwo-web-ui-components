# Contributing

How to develop the Neuwo Web UI Library and keep the Neuwo Design System in sync. This covers
the **library side only**; the design system's own procedure lives in that repo.

## Principles

- One source of truth. Tokens live once in `src/foundation/tokens.css`; each component's CSS
  lives once in its own file. Never re-type a value elsewhere.
- Visually meaningful styling goes on the portable selector (`.neuwo-btn` and variants). Reserve
  the element-name rule (`neuwo-button { ... }`) for the outer box only, so the recipe the design
  system shows and non-web outputs copy is complete without it.
- Public selector and attribute names are API. Renaming one is a breaking change.

## Add a component

A component renders into its own light DOM from one pure template, which the HTML, DOM and React
adapters turn into the same markup. Follow `<neuwo-button>`.

1. Create `src/components/<name>/<name>.template.js`: a pure function from attributes to markup,
   built with `h()`, `region()` and `raw()` from `src/core/template.js`, with no DOM, browser
   globals or CSS imports. Keep to the contract in that file's `Template` typedef: every element
   carries the block class or a `<block>__*` class, and each `region()` is the only child of a
   wrapper rendered for every attribute combination. Register it in `src/templates.js`.
2. Create `src/components/<name>/neuwo-<name>.js`: a class extending `NeuwoElement` from
   `src/core/element.js`, with `static template`, `static observedAttributes`, property accessors
   that reflect the attributes, and the JSDoc block that generates the manifest and types
   (`@summary` naming the public classes, `@attr`, `@slot`, `@cssprop`). Register it with
   `define("neuwo-<name>", NeuwoX)`. Listeners and observers go in `connect()` and `disconnect()`,
   which never write to the DOM.
3. Create `src/components/<name>/<name>.css` with prefixed BEM classes (`.neuwo-<block>`,
   `.neuwo-<block>--<modifier>`, `.neuwo-<block>__<element>`), tokens only, and keyframes named
   `neuwo-<name>-*`. The outer box is an element-name rule
   (`neuwo-<name> { display: inline-block; }`) and nothing else.
4. Add the tag to every `:where(...)` list in `src/components/reset.css`, and the recipe to
   `LIGHT_COMPONENT_CSS` in `scripts/light-css.js`, which the build and the tests read.
5. Register the element in `src/index.js` (the side-effect import and the export) and in the
   `HTMLElementTagNameMap` in `src/types/elements.d.ts`.
6. Add representative attribute combinations to `tests/fixtures/template-cases.js`, which the
   parity, snapshot and contract tests read. Add `tests/<name>-template.test.js`,
   `tests/<name>.test.js` (behaviour, adopting server markup without a mutation, and React) and
   `tests/<name>-css.test.js`, and the tag to `EXPECTED_TAGS` in `tests/manifest.test.js`.
7. Add a demo section in `demo/index.html`.
8. `npm run build` and confirm `dist/components/<name>/<name>.css` is emitted; `npm test` green.
9. Add the component to the catalogue and restyling tables in `README.md`.
10. Hand off: cut a version (below). The design system adopts it by bumping the library version
    and following its own guide.

## Change a component

Edit the single source (the CSS file, the template and the element). The published CSS updates
with it. Do not edit the design system from this repo; it picks the change up on the next version
bump.

## Cut a version

1. Update the version in `package.json` (semver: a renamed public selector or attribute is a
   breaking change).
2. `npm run build` and `npm test` must pass.
3. Publish.
4. The design system bumps the library version and rebuilds. Always publish the library first.

## What the library must not do

- Never hand-duplicate a recipe into the design system.
- Never edit the design system's code-sample machinery or skill scripts from here.
- Never let a primitive that has a `<neuwo-*>` counterpart be the design system's source of
  truth as native HTML; the component is the source, the design system documents it.
