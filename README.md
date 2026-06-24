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
| Checkbox | `<neuwo-checkbox>` | Stable |
| Toggle / Switch | `<neuwo-toggle>` | Stable |
| Radio group | `<neuwo-radio-group>` / `<neuwo-radio>` | Stable |
| Segmented control | `<neuwo-segmented>` | Stable |
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

## Form errors

Every form control (fields and selection controls) shows an error from the consumer-set
`error` attribute: the message text, a red accent, and `aria-invalid` on the control. The
component owns no error text of its own, so the consumer decides when the error appears and
clears (`required` validity is reported natively and separately, not as this message).

Add `error-muted` alongside `error` to drop the heavy control chrome without losing the note: the
red border and box-shadow ring come off the instant the user acts, while the red message and the
invalid state (`aria-invalid`, `aria-describedby`) stay until you re-validate and remove `error`.
Use it for the "reward early, punish late" pattern, flag on commit, ease off the moment the user
acts, clear once the input validates:

```js
const group = document.querySelector("neuwo-radio-group");

// Punish late: assert the full error only on submit.
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (group.checkValidity()) {
    group.removeAttribute("error");
    group.removeAttribute("error-muted");
  } else {
    group.removeAttribute("error-muted");          // re-arm the red alarm
    group.setAttribute("error", "Please choose a tier");
  }
});

// Reward early: the instant the user acts, soften but keep the message.
group.addEventListener("change", () => {
  if (group.hasAttribute("error")) group.setAttribute("error-muted", "");
});
```

## Develop

```bash
npm install
npm start     # build + watch + serve the demo at http://localhost:8000/demo/
npm run build # produce dist/ (neuwo.js, neuwo.css, fonts/, foundation/*.css, components/**/*.css)
npm test      # Vitest + happy-dom
```

See CONTRIBUTING.md for how to add or change components and keep the Neuwo Design System in
sync.
