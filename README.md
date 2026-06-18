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

## Components

| Component | Tag | Status |
| --- | --- | --- |
| Button | `<neuwo-button>` | Stable |
| Modal | `<neuwo-modal>` | Planned |
| Inputs | `<neuwo-input>` | Planned |
| Card | `<neuwo-card>` | Planned |
| Badge | `<neuwo-badge>` | Planned |

Published styling files, for direct linking or non-web use:

| Artifact | Import path |
| --- | --- |
| Tokens | `@neuwo/web-ui-components/foundation/tokens.css` |
| Typography | `@neuwo/web-ui-components/foundation/typography.css` |
| Button recipe | `@neuwo/web-ui-components/components/button/button.css` |

## Develop

```bash
npm install
npm start     # build + watch + serve the demo at http://localhost:8000/demo/
npm run build # produce dist/ (neuwo.js, fonts/, foundation/*.css, components/**/*.css)
npm test      # Vitest + happy-dom
```

See CONTRIBUTING.md for how to add or change components and keep the Neuwo Design System in
sync.
