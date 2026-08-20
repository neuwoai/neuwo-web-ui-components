# Contributing

How to develop the Neuwo Web UI Library and keep the Neuwo Design System in sync. This covers
the **library side only**; the design system's own procedure lives in that repo.

## Principles

- One source of truth. Tokens live once in `src/foundation/tokens.css`; each component's CSS
  lives once in its own file. Never re-type a value elsewhere.
- Visually meaningful styling goes on the portable selector (`.btn` and variants). Reserve
  `:host` for wrapper and layout concerns only, so the recipe the design system shows and
  non-web outputs copy is complete without the shadow rules.
- Public selector and attribute names are API. Renaming one is a breaking change.

## Add a component

1. Create `src/components/<name>/<name>.css` (the recipe; clean BEM selectors).
2. Create `src/components/<name>/neuwo-<name>.js` extending `NeuwoElement` (`static styles`,
   `static observedAttributes`, a `render()` writing to `this.shadowRoot`).
3. Register it in `src/index.js`.
4. Add a demo section in `demo/index.html`.
5. Add Vitest specs in `tests/<name>.test.js`.
6. `npm run build` and confirm `dist/components/<name>/<name>.css` is emitted; `npm test` green.
7. Add the component to the catalogue table in `README.md`.
8. Hand off: cut a version (below). The design system adopts it by bumping the library version
   and following its own guide.

## Change a component

Edit the single source (the CSS file and the JS). The published CSS updates with it. Do not
edit the design system from this repo; it picks the change up on the next version bump.

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
