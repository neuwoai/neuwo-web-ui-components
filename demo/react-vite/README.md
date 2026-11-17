# Neuwo with React and Vite

A client-only React 19 app built with Vite that uses the Neuwo Web UI Library. The page holds two sign-up forms made
from the library's elements, one controlled by React state and one uncontrolled, each with a name, email, role, weekly
digest and consent field (`<neuwo-input>`, `<neuwo-combobox>`, `<neuwo-toggle>`, `<neuwo-checkbox>`,
`<neuwo-button>`, `<neuwo-notice>`), plus a `<neuwo-logo>`, the library's typography and the full-viewport background
wash.

## Run it

```bash
npm install
npm run dev
```

`npm run build` type-checks and writes the production build to `dist/`; `npm run preview` serves it.

## Try an unreleased library change

To try a library change before it is released, install the dependencies in the repository root and pack the library,
then install the tarball in the example:

```bash
npm install
npm pack
cd demo/react-vite
npm install --no-save ../../neuwo-web-ui-library--demo-0.3.0.tgz
```

`--no-save` leaves `package.json` and `package-lock.json` untouched, so the example keeps the published release;
`npm ci` puts it back in `node_modules`.

## The setup

These files carry the library's setup.

- [package.json](package.json) lists the library under `dependencies` at the released minor version:

  ```json
  "@neuwo/web-ui-library--demo": "^0.3.0"
  ```

- [tsconfig.json](tsconfig.json) points JSX at the library's runtime, which renders each `<neuwo-*>` element's markup as
  React markup and types every attribute and event:

  ```json
  "jsx": "react-jsx",
  "jsxImportSource": "@neuwo/web-ui-library--demo"
  ```

  [vite.config.ts](vite.config.ts) needs no `jsxImportSource` option: Vite reads the setting from
  `tsconfig.json`, so that one line is the only place it is written.

- [src/main.tsx](src/main.tsx) imports the stylesheet and the library once, at the entry:

  ```tsx
  import "@neuwo/web-ui-library--demo/neuwo.css";
  import "@neuwo/web-ui-library--demo";
  ```

- [index.html](index.html) puts `neuwo-body` on the `<body>`, which gives the page its ink and paper.
- [src/App.tsx](src/App.tsx) and [src/App.css](src/App.css) add the wash: a fixed frame at `--neuwo-z-background`
  holding a `.neuwo-background__gradient`, written with logical properties. The library supplies the gradient; the page
  supplies the frame.

## What to look at

- [src/ControlledSignUp.tsx](src/ControlledSignUp.tsx): `value` and `checked` held in state for every field. The input
  handlers are typed `NeuwoChangeEvent<NeuwoInput, HTMLInputElement>` and the combobox's `NeuwoChangeEvent<NeuwoCombobox>`,
  since the combobox dispatches from the element itself. The `<output>` echoes all the live values.
- [src/UncontrolledSignUp.tsx](src/UncontrolledSignUp.tsx): `defaultValue` and `defaultChecked`, read back with
  `new FormData(event.currentTarget)` on submit; the confirmation lists every entry.
- [src/App.css](src/App.css) lays the two forms side by side when they fit and stacks them when they do not, using
  the library's spacing tokens.
- Both forms set `loading` on the button from the start of the submit handler until the submission ends, so a submission
  the browser's validation blocks never shows it. [src/sign-up.ts](src/sign-up.ts) stands in for a backend.
- Misspell an attribute value, such as `variant="bg-darkk"` on the logo in [src/App.tsx](src/App.tsx), and
  `npm run build` fails with a type error that names the allowed values.

## Copying it

Take the whole folder, without `node_modules/` and `dist/`. Nothing in it points outside its own folder. The example
links `neuwo.css`, which holds the components, the typography and the page surface. On a page that keeps its own
typography, import `@neuwo/web-ui-library--demo/neuwo-components.css` instead, and drop `neuwo-body` from the `<body>`
if the page has its own background.
