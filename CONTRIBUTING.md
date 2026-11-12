# Contributing

How to develop the Neuwo Web UI Library and keep the Neuwo Design System in sync. This covers
the **library side only**; the design system's own procedure lives in that repo.

Develop on a Node version that `devEngines.runtime` in `package.json` accepts, which jsdom sets;
npm warns on any other.

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
   wrapper rendered for every attribute combination. `tests/templates-contract.test.js` checks
   those rules on every case in `tests/fixtures/template-cases.js`, one rule per test title.
   Register it in `src/templates.js`.
2. Create `src/components/<name>/neuwo-<name>.js`: a class extending `NeuwoElement` from
   `src/core/element.js`, with `static template`, `static observedAttributes`, property accessors
   that reflect the attributes, and the JSDoc block that generates the manifest and types
   (`@summary` naming the public classes, `@attr`, `@slot`, `@cssprop`). Register it with
   `define("neuwo-<name>", NeuwoX)`. Listeners and observers go in `connect()` and `disconnect()`,
   which write nothing to adopted markup. A property a script set before the element was defined is
   assigned again through its setter just before `connect()`, so a setter writes only what differs.
3. For a form control, extend `NeuwoControlElement` from `src/components/control-element.js`, or
   the field base (`fields/field-element.js`) or the checkable base
   (`selection/checkable-element.js`), instead of `NeuwoElement`. Mark the native control in the
   template with `control()` from `src/core/template.js`, so the React adapter maps `value`,
   `defaultValue`, `checked` and `defaultChecked` onto it, and return it from the `control` getter.
   To read an enclosing element's attributes, as a radio reads its group's, set the template's
   `within` to that tag and read `ctx.within`. Through React it reaches only an element written in
   place inside that tag: inside a component of the app's own, a portal or another React root it is
   null, so the template must also render the element on its own. A control that renders its own
   error line extends `NeuwoErrorMixin(...)` from `src/components/error-mixin.js`, which documents
   `error`, `error-muted` and `no-error-line` and adds `noErrorLine`, and lists the three in its
   `observedAttributes`; one whose native control takes its `value` attribute as its default
   applies `NeuwoDefaultValueMixin` from `src/components/default-value-mixin.js` too. Follow the
   React-owned rules: write nothing to a host `ownedByReact()` reports, and drop a value written
   while the host carries the `CONTROLLED` mark from `src/core/marks.js`, since React holds it.
   `connect()` may re-apply a property set before the control rendered, as the field base puts a
   pending `value` on its control, but not on a host React rendered.
4. Create `src/components/<name>/<name>.css` with prefixed BEM classes (`.neuwo-<block>`,
   `.neuwo-<block>--<modifier>`, `.neuwo-<block>__<element>`), tokens only, and keyframes named
   `neuwo-<name>-*`. The outer box is an element-name rule
   (`neuwo-<name> { display: inline-block; }`) and nothing else.
5. Add the tag to the `:where(...)` list in `src/components/reset.css`, each new block to its
   `:is(...)` list as `.neuwo-<block>, [class*="neuwo-<block>__"], [class*="neuwo-<block>--"]`, and the
   recipe to `LIGHT_COMPONENT_CSS` in `scripts/light-css.js`, which the build and the tests read.
6. Register the element in `src/index.js` (the side-effect import and the export) and in the
   `HTMLElementTagNameMap` in `src/types/elements.d.ts`.
7. Add representative attribute combinations to `tests/fixtures/template-cases.js`, which the
   parity, snapshot and contract tests read. Add `tests/<name>-template.test.js`,
   `tests/<name>.test.js` (behaviour, adopting server markup without a mutation, and React) and
   `tests/<name>-css.test.js`, and the tag to `EXPECTED_TAGS` in `tests/manifest.test.js`.
8. Add a demo section in `demo/index.html`.
9. `npm run build` and confirm `dist/components/<name>/<name>.css` is emitted; `npm test` green.
10. Add the component to the catalogue and restyling tables in `README.md`.
11. Hand off: cut a version (below). The design system adopts it by bumping the library version
    and following its own guide.

## Change a component

Edit the single source (the CSS file, the template and the element). The published CSS updates
with it. Do not edit the design system from this repo; it picks the change up on the next version
bump.

## Integration check

`integration/` checks the packed library in real sites and browsers, apart from `npm test`. It packs
the library, installs the tarball into each app under `integration/apps/`, builds and serves the app,
and loads its pages in Chromium and Firefox through puppeteer-core. Install its dependencies once:

```bash
npm install --prefix integration
```

It finds a browser through `NEUWO_CHROMIUM` or `NEUWO_FIREFOX`, each the path to the executable, or
else on `PATH`: `chromium`, `chromium-browser`, `google-chrome` or `google-chrome-stable`, and
`firefox`. Firefox is driven over WebDriver BiDi. Run every target in both browsers:

```bash
npm run integration
```

Name targets to run only those (`npm run integration -- eleventy`), choose a browser with
`--browser=chromium`, `firefox` or `all`, and keep the work folder in the system temporary folder
with `--keep`. Each result is one line: target, browser, page, check, status and detail. The run
exits 1 on any `fail` or on a browser it cannot launch.

- `console`: no page error, console error or hydration warning.
- `layoutShift`: the page does not shift at 1280 by 800. Only Chromium reports layout shifts, so it
  is `n/a` in Firefox.
- `noScript`: with JavaScript off, the first `.neuwo-btn` has the background it has with JavaScript
  on, not the browser default. Puppeteer cannot turn JavaScript off in Firefox, so it is `n/a` there.
- `adoption`: each `neuwo-*` element still holds the markup served for it, and nothing rewrote it
  after parsing: no node inside it was added, removed or given new text, even with the same
  content, and no attribute changed its value. An attribute set again to the value it holds is not
  a write, since React's hydration does that to every `<input>`.

The `demo` target serves the repository root, so it checks the demo page against the `dist/` that
`npm run build` made, not the tarball. It runs `console`, then asserts that the page's `.btn` and
`button` rules reach plain buttons and no component, that a host rule restyles a component, and
that the range readout never shows `NaN`, with `neuwo.js` held back for 500 ms and again after
definition. The target's server delays the bundle, so both browsers run the held reading.

The `next-dev` and `next-prod` targets run the app in `integration/apps/next` under `next dev`, and
under `next build` then `next start`. Besides the four checks they run `forms` on the `Forms`
component in `integration/apps/shared/`, once React has hydrated it. In its controlled form, typing,
a combobox pick, a checkbox tick and a range move must each reach React's state; its uncontrolled
form must submit its defaults, then the values the user changed, then its defaults again after a
reset. The runner copies `apps/shared/` into each app as `shared/`, so its imports resolve from that
app's own `node_modules`. Next.js runs with telemetry off and behind a proxy that refuses every
connection, because `next dev` asks the npm registry for its latest version; the run logs each
request it refused.

After changing a check, run `npm run integration -- --self-test`. It serves the pages in
`integration/self-test/`, expanded with `expand`. `good.html` must pass every check that runs, each
other page must fail only its own check, and every check must fail on its own page in at least one
browser. So the self-test fails in Firefox alone, where two checks are `n/a`.

The apps are installed with `npm install`. To install only from the npm cache, here and in the
one-time install above, set `npm_config_offline=true`:

```bash
npm_config_offline=true npm run integration
```

## Cut a version

1. Update the version in `package.json` (semver: a renamed public selector or attribute is a
   breaking change).
2. Before 1.0, class names and markup change only in a minor release. A snapshot change in a patch
   release fails review.
3. `npm run build` and `npm test` must pass.
4. Publish.
5. The design system bumps the library version and rebuilds. Always publish the library first.

## What the library must not do

- Never hand-duplicate a recipe into the design system.
- Never edit the design system's code-sample machinery or skill scripts from here.
- Never let a primitive that has a `<neuwo-*>` counterpart be the design system's source of
  truth as native HTML; the component is the source, the design system documents it.
