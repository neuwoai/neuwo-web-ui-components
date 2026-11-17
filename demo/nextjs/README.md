# Neuwo with React and Next.js

A Next.js 16 App Router app (React 19, TypeScript) that uses the Neuwo Web UI Library. The page is a Server
Component holding two sign-up forms made from the library's elements, one controlled by React state and one
uncontrolled, each with a name, email, role, weekly digest and consent field (`<neuwo-input>`, `<neuwo-combobox>`,
`<neuwo-toggle>`, `<neuwo-checkbox>`, `<neuwo-button>`, `<neuwo-notice>`), plus a `<neuwo-logo>`, the library's
typography and the full-viewport background wash.

## Run it

```bash
npm install
npm run dev
```

`npm run build` type-checks and writes the production build to `.next/`; `npm start` serves it.

## Try an unreleased library change

To try a library change before it is released, install the dependencies in the repository root and pack the library,
then install the tarball in the example:

```bash
npm install
npm pack
cd demo/nextjs
npm install --no-save ../../neuwo-web-ui-library--demo-0.4.0.tgz
```

`--no-save` leaves `package.json` and `package-lock.json` untouched, so the example keeps the published release;
`npm ci` puts it back in `node_modules`.

## The setup

These files carry the library's setup.

- [package.json](package.json) lists the library under `dependencies` at the released minor version:

  ```json
  "@neuwo/web-ui-library--demo": "^0.4.0"
  ```

- [tsconfig.json](tsconfig.json) points JSX at the library's runtime, which renders each `<neuwo-*>` element's markup as
  React markup, on the server too, and types every attribute and event:

  ```json
  "jsx": "react-jsx",
  "jsxImportSource": "@neuwo/web-ui-library--demo"
  ```

- [app/layout.tsx](app/layout.tsx) imports the stylesheet, preloads the two variable fonts and renders `<Neuwo />` once.
  It also puts `neuwo-body` on the `<body>`, which gives the page its ink and paper:

  ```tsx
  import "@neuwo/web-ui-library--demo/neuwo.css";
  import notoSans from "@neuwo/web-ui-library--demo/fonts/noto-sans-variable.woff2";
  import outfit from "@neuwo/web-ui-library--demo/fonts/outfit-variable.woff2";

  preload(notoSans, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  preload(outfit, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });

  <body className="neuwo-body">
    <Neuwo />
    {children}
  </body>
  ```

- [app/neuwo.tsx](app/neuwo.tsx) is a client component that imports the library, so the elements register in the
  browser, and renders nothing:

  ```tsx
  "use client";
  import "@neuwo/web-ui-library--demo";

  export function Neuwo() {
    return null;
  }
  ```

- [app/fonts.d.ts](app/fonts.d.ts) types a `.woff2` import as its URL, which TypeScript needs for the preload.
- [app/page.tsx](app/page.tsx) and [app/app.css](app/app.css) add the wash: a fixed frame at `--neuwo-z-background`
  holding a `.neuwo-background__gradient`, written with logical properties. The library supplies the gradient; the page
  supplies the frame.

## What to look at

- View the page source: every component is already drawn in the HTML, before any script runs. The server renders the
  elements' markup through the JSX runtime, so the page paints on-brand from the first frame.
- [app/page.tsx](app/page.tsx) is a Server Component with no `"use client"`; it renders the `<neuwo-logo>` and the
  two forms.
- [app/controlled-sign-up.tsx](app/controlled-sign-up.tsx): `value` and `checked` held in state for every field. The
  input handlers are typed `NeuwoChangeEvent<NeuwoInput, HTMLInputElement>` and the combobox's
  `NeuwoChangeEvent<NeuwoCombobox>`, since the combobox dispatches from the element itself. The `<output>` echoes all
  the live values.
- [app/uncontrolled-sign-up.tsx](app/uncontrolled-sign-up.tsx): `defaultValue` and `defaultChecked`, read back with
  `new FormData(event.currentTarget)` on submit; the confirmation lists every entry.
- [app/app.css](app/app.css) lays the two forms side by side when they fit and stacks them when they do not, using
  the library's spacing tokens.
- Both forms set `loading` on the button from the start of the submit handler until the submission ends, so a submission
  the browser's validation blocks never shows it. [app/sign-up.ts](app/sign-up.ts) stands in for a backend.
- Misspell an attribute value, such as `variant="bg-darkk"` on the logo in [app/page.tsx](app/page.tsx), and
  `npm run build` fails with a type error that names the allowed values.

## Copying it

Take the whole folder, without `node_modules/` and `.next/`. Nothing in it points outside its own folder. The example
links `neuwo.css`, which holds the components, the typography and the page surface. On a page that keeps its own
typography, import `@neuwo/web-ui-library--demo/neuwo-components.css` instead, and drop `neuwo-body` from the `<body>`
if the page has its own background.
