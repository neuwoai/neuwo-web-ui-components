# @neuwo/web-ui-components

Neuwo design-language web components: vanilla custom elements, Shadow DOM, zero runtime deps.
The single source for reusable Neuwo UI and its styling (tokens, component recipes, typography).

## Consume

Load one script; components self-register.

```html
<script type="module" src="https://cdn.neuwo.ai/neuwo.js"></script>
<neuwo-button variant="solid">Get started</neuwo-button>
```

Design tokens are adopted onto the document and inherit through every shadow boundary, so you
re-theme by setting tokens on `:root`:

```css
:root { --color-blue: oklch(77% 0.18 132); }
```

Opt into Neuwo typography for native headings and text by linking the stylesheet:

```html
<link rel="stylesheet" href="https://cdn.neuwo.ai/foundation/typography.css" />
```

or, in a bundler, `import "@neuwo/web-ui-components/foundation/typography.css"`.

To link tokens and typography as a single file (handy for CSS-only or no-bundler
consumers), use the combined stylesheet instead:

```html
<link rel="stylesheet" href="https://cdn.neuwo.ai/neuwo.css" />
```

## Components

| Component | Tag | Status |
| --- | --- | --- |
| Button | `<neuwo-button>` | Stable |
| Text input | `<neuwo-input>` | Stable |
| Textarea | `<neuwo-textarea>` | Stable |
| Select | `<neuwo-select>` | Stable |
| Combobox | `<neuwo-combobox>` | Stable |
| Modal | `<neuwo-modal>` | Planned |
| Card | `<neuwo-card>` | Planned |
| Badge | `<neuwo-badge>` | Planned |

Published styling files, for direct linking or non-web use:

| Artifact | Import path |
| --- | --- |
| Tokens | `@neuwo/web-ui-components/foundation/tokens.css` |
| Typography | `@neuwo/web-ui-components/foundation/typography.css` |
| Tokens + typography (one file) | `@neuwo/web-ui-components/neuwo.css` |
| Button recipe | `@neuwo/web-ui-components/components/button/button.css` |
| Field chrome | `@neuwo/web-ui-components/components/fields/field.css` |

## Develop

```bash
npm install
npm start     # build + watch + serve the demo at http://localhost:8000/demo/
npm run build # produce dist/ (neuwo.js, neuwo.css, fonts/, foundation/*.css, components/**/*.css)
npm test      # Vitest + happy-dom
```

See CONTRIBUTING.md for how to add or change components and keep the Neuwo Design System in
sync.
