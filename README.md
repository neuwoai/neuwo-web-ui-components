# @neuwo/web-ui-components

Neuwo design-system web components — vanilla custom elements, Shadow DOM, zero runtime deps.

## Consume

```html
<script type="module" src="https://cdn.neuwo.ai/neuwo.js"></script>
<neuwo-button variant="solid">Get started</neuwo-button>
```

Design tokens inherit through the shadow boundary — re-theme by setting them on `:root`:

```css
:root { --color-blue: oklch(77% 0.18 132); }
```

## Develop

```bash
npm install
npm start     # build + watch + serve the demo at http://localhost:8000/demo/
npm run build # produce dist/neuwo.js
npm test      # Vitest + happy-dom
```

`.reference/` is a frozen, gitignored snapshot of the Neuwo design-system site, kept only to
copy CSS recipes and token values from while building. It is deleted before release.
