# Neuwo with React and Vite

A client-only React 19 app built with Vite that uses the Neuwo Web UI Library. The page holds two sign-up forms made
from the library's elements (`<neuwo-input>`, `<neuwo-checkbox>`, `<neuwo-button>`, `<neuwo-notice>`), one controlled
by React state and one uncontrolled, plus a `<neuwo-logo>` and the library's typography and page surface.

## Run it

```bash
npm install
npm run dev
```

While 0.2.0 is not on npm, `npm install` finds no such version; install the packed library as described in the next section instead, then run `npm run dev`.

`npm run build` type-checks and writes the production build to `dist/`; `npm run preview` serves it.

## Try an unreleased library change

Until 0.2.0 is on npm, this is also the way to run the example at all, in place of `npm install`. In the repository root, pack the library, then
install the tarball in the example:

```bash
npm pack
cd demo/react-vite
npm install --no-save ../../neuwo-web-ui-library--demo-<version>.tgz
```

`--no-save` leaves `package.json` untouched, so the dependency stays the published range.

## The setup

Four places carry the library's setup.

- [package.json](package.json) lists the library under `dependencies` at the released minor version:

  ```json
  "@neuwo/web-ui-library--demo": "^0.2.0"
  ```

- [tsconfig.json](tsconfig.json) points JSX at the library's runtime, which renders each `<neuwo-*>` element's markup as
  React markup and types every attribute and event:

  ```json
  "jsx": "react-jsx",
  "jsxImportSource": "@neuwo/web-ui-library--demo"
  ```

  [vite.config.ts](vite.config.ts) needs no `jsxImportSource` option: `@vitejs/plugin-react` reads the setting from
  `tsconfig.json`, so that one line is the only place it is written.

- [src/main.tsx](src/main.tsx) imports the stylesheet and the library once, at the entry:

  ```tsx
  import "@neuwo/web-ui-library--demo/neuwo.css";
  import "@neuwo/web-ui-library--demo";
  ```

- [index.html](index.html) puts `neuwo-body` on the `<body>`, which gives the page its surface.

## What to look at

- [src/ControlledSignUp.tsx](src/ControlledSignUp.tsx): `value` and `checked` held in state, with the email handler typed
  `NeuwoChangeEvent<NeuwoInput, HTMLInputElement>`. The `<output>` echoes the live values.
- [src/UncontrolledSignUp.tsx](src/UncontrolledSignUp.tsx): `defaultValue` and `defaultChecked`, read back with
  `new FormData(event.currentTarget)` on submit.
- Both forms set `loading` on the button from the start of the submit handler until the submission ends, so a submission
  the browser's validation blocks never shows it. [src/sign-up.ts](src/sign-up.ts) stands in for a backend.
- Misspell an attribute value, such as `variant="bg-darkk"` on the logo in [src/App.tsx](src/App.tsx), and
  `npm run build` fails with a type error that names the allowed values.

## Copying it

Take the whole folder, without `node_modules/` and `dist/`. Nothing in it points outside its own folder. The example
links `neuwo.css`, which holds the components, the typography and the page surface. On a page that keeps its own
typography, import `@neuwo/web-ui-library--demo/neuwo-components.css` instead, and drop `neuwo-body` from the `<body>`
if the page has its own background.
