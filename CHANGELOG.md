# Changelog

## Unreleased

- Fixed: `<neuwo-input>` and `<neuwo-textarea>` give their native control `required` and `readonly` as present attributes with no value, whatever value the element's own carry, as the JSX runtime already rendered them, so served and React markup now match for a field written `required="required"`.
- Changed: `connect()`, `disconnect()`, `updated()` and `formReset()` are protected in the `.d.ts` types and the manifest, as hooks a subclass overrides, so calling one from outside an element is a type error. The manifest names `HTMLElement`, a global, as the superclass of `NeuwoElement`, and no longer lists an attribute a class documents itself as inherited: the radio's `name`, `checked`, `disabled`, `form` and `required`, the radio group's `name`, `disabled`, `error` and `no-error-line`, the segmented control's `name`, `disabled` and `no-error-line`, and the field base's `error-muted`, which the input, textarea, combobox and range now list as inherited from the field base. The JSX types are unchanged.
- Fixed: `neuwo-standalone.js` adopts its stylesheet before it defines the elements, so an element is styled as it first connects, and a script that measures one then gets its styled size. The sheet used to arrive only after every element on the page had upgraded and rendered.
- Internal: the package no longer ships `dist/types/css-raw.d.ts`, which declared the build's own raw imports and which no published declaration referenced.
- Changed: the label of each `<neuwo-combobox>` row sits in a `.neuwo-combobox__option-label` span, and the label of each `<neuwo-segmented>` option in a `.neuwo-segmented__option-label` span. Both look as before. Under React's hydration the row and the option keep the state the element writes into them, and the label, which only the template writes, is still checked, so a label the server drew differently from the client fails hydration instead of staying silently.
- Fixed: a `<neuwo-range>` moved, and a form reset, in part of a React page that React has not hydrated yet, such as a `Suspense` boundary whose code is still loading, update the range's fill at once and keep it once hydrated. React stops the `input` and `reset` events there before they reach the element; the range and every form field now hear them first, on the window and, inside a shadow root, on that root, until React owns them. Rendered through the JSX runtime, an uncontrolled field also takes the live value of its native control when React hydrates it, so React draws what the control holds while keeping the starting value as the default a form reset returns to.
- Fixed: the font swap shifts the layout less. The fallback faces that draw text until the fonts arrive take their size, ascent, descent and line gap from the fonts' own metrics, by Capsize's method against Arial. `Outfit Fallback` and `Noto Sans Fallback` each have a face for every weight token, 400, 500, 600, 700 and 800, sized to the font at that weight and meeting the next at the midpoint between them: Arial, or Liberation Sans or Arimo, up to 500 and Arial Bold, or Liberation Sans Bold or Arimo Bold, from 600. `Noto Sans Fallback` also has italic faces at 400 and 700, split at 550, from Arial Italic and Arial Bold Italic. Text in the fallback is now within 0.6% of the font's width at every token weight in Chromium and Firefox; bold text was synthesised from Arial, which Chromium drew up to 7% narrower than the font and Firefox wider, and italic text was 6.7% wider. On a Next.js test page in Chromium the swap scored 1.7e-3 and 2.5e-3 at 900 and 1280 px, and now 0 and 1.9e-3, where a line in a paragraph still breaks one word differently. The README shows how to preload a font with a bundler.
- Fixed: under React's hydration, as in Next.js, a value the browser restores on a back navigation, one the user enters before the page hydrates, or one a script sets before then is kept, with no hydration error. A `<neuwo-combobox>` value set before hydration failed it with a text mismatch, in production too, so React rendered the page again on the client and dropped every value already entered; the `<neuwo-range>` fill, the `<neuwo-segmented>` options and a combobox list opened by focus logged attribute mismatches in development. The JSX runtime gives the nodes an element writes such state into `suppressHydrationWarning`: the range's input, the combobox's trigger, shown label, list and options, and the segmented control's options.
- Fixed: in a page without a doctype, the `<neuwo-combobox>` list measures the viewport instead of the whole document, so near the bottom of a long page it opens above its trigger, where it opened below and was cut off. A list keeps the side it opened on while typing into a `searchable` one changes it, or its options change while it is open, as in an async search, and moves to the other side only once it no longer fits there, where it jumped between the sides as the filter narrowed and widened it.
- Fixed: under forced colours, such as a high contrast theme, every control shows its keyboard focus, which the colour scheme's dropped box-shadow ring hid: the focused element takes a transparent outline in the ring's place, `--neuwo-outline-focus` (2px) at `--neuwo-outline-focus-offset` (2px), which the theme paints and which draws nothing otherwise. The selected `<neuwo-segmented>` option and its pill, the `<neuwo-range>` track and fill, the `<neuwo-combobox>` selected and active options and its chevron, the `<neuwo-copy>` and `<neuwo-notice>` glyphs and the `<neuwo-status-dot>` are drawn in the theme's colours, where they vanished. The combobox's selected option also carries an inset ring in the theme's text colour, so it stays distinct from the active one where a theme gives both the same colour, and its list follows the theme's light or dark palette.
- Fixed: the `<neuwo-combobox>` list stays inside the viewport. It is never wider than the viewport less an 8px margin on each side, a list that would cross the viewport edge moves back towards its trigger's other edge, an option label too long for it wraps, in a right-to-left page with a classic scrollbar it lines up with its trigger instead of the scrollbar's width to the left of it, one opened above its trigger on a page with a horizontal scrollbar keeps its gap, and a list that moved to fit the viewport goes back against its trigger as typing into a `searchable` one narrows it.
- Fixed: components mirror in right-to-left containers, and so does the Markdown surface: list indents, the quote and callout bars, and table cell alignment sit on the right in a right-to-left page. Inside a `dir="rtl"` element the combobox's chevron, its value and its list sit on the right-to-left sides, the required marker keeps its gap from the label, the toggle's thumb starts on the right and slides left, and the range's fill grows from the right with its thumb in Chromium, as Firefox already drew it. The recipes use logical properties for inline sides; the toggle thumb, which moves by `transform`, and the range fill mirror by the `dir` attribute, so set it rather than only the CSS `direction` property. In left-to-right pages nothing changes.
- Fixed: `reportValidity()`, or a submit that fails validation, focuses a required `searchable` `<neuwo-combobox>` without opening its list, as it does a native `<input list>` or `<select>`; it used to open the list. Tab and a click still open it.
- Fixed: in Firefox the `<neuwo-range>` thumb is the size `--neuwo-range-thumb-size` sets, border included, as in Chromium, where it was drawn 4px wider and taller.
- Fixed: the tick and dash of `<neuwo-checkbox>` and the dot of a checked `<neuwo-radio>` are drawn in `--neuwo-color-white`, so they follow that token, instead of a pure white fixed in the recipe. Under forced colours, such as a high contrast theme, they and the `<neuwo-toggle>` thumb are drawn in the theme's text colour, where the theme's background colour hid them, so a checked, mixed and unchecked box and an on and off switch tell apart. Each mark is a mask on the native input's `::before` now, where it was a background image on the input, so restyle it through `.neuwo-form-check__input:checked::before` or `.neuwo-form-check__input:indeterminate::before`.
- Fixed: `<neuwo-copy>` copies `aria-*` and `title` from the element onto its control, as the other elements do, so an `aria-label` on the element names the control when `label` is not set. `label` still wins, over `aria-labelledby` too. `slot="status"` is documented as reserved for the outcome announcement.
- Fixed: a failed `<neuwo-copy>` draws a cross in the error colour, where a successful one draws the tick, instead of nothing; only a screen reader learned of the failure before.
- Fixed: `<neuwo-cta>` checks a band from the page's markup or the server when it starts, so an empty `<neuwo-cta></neuwo-cta>` now warns about its missing headline and action. A band a script fills after inserting it is checked once a change adds to its children, so one that gets its buttons after an `await` no longer draws a false warning. A band a script builds and inserts already complete is not checked.
- Internal: `<neuwo-cta>` no longer registers `--neuwo-cta-angle` from script as well; the `@property` rule in `cta.css` registers it.
- Internal: `error`, `error-muted`, `no-error-line` and `noErrorLine` are documented once, on `NeuwoErrorMixin`, which the field base, the checkbox and toggle base, the radio group and the segmented control apply, and the `defaultValue` of the fields and the segmented control once, on `NeuwoDefaultValueMixin`; the radio group keeps its own, which reads its radios. The manifest records both mixins and lists those attributes and properties as inherited from them, or as a control's own where it words one itself, and the generated `.d.ts` types each base as extending them. No attribute, property or JSX type changed.
- Fixed: an errored `<neuwo-radio-group>` rings only its own radios, at any depth of nesting: each radio's label takes `.neuwo-form-check--error` from its nearest group, the checkbox's error rule paints it at the same two-class weight, and the group's recipe no longer reaches any `.neuwo-form-check__input`. A `<neuwo-checkbox>` placed among the radios, and the radios of a nested group with no error of its own, keep their own colour. The error rules of the checkbox and the toggle reach only their own box and track.
- Fixed: `<neuwo-radio-group>` warns about a missing `name` only when one of its radios has no `name` either, since radios that each carry one are grouped by the browser.
- Fixed: `<neuwo-segmented>` keeps each option's label on one line, as `<neuwo-button>` does, so an option no longer wraps in a narrow or `white-space: nowrap` container.
- Fixed: a `variant` change on `<neuwo-cta>` under React no longer remounts the children you pass, so their state and effects survive it. Both variants render the same wrappers now: `.neuwo-cta__inner` holds `.neuwo-cta__body`, around the headline, sub, field and status, and then `.neuwo-cta__actions`, and the spotlight adds `.neuwo-cta__glow` before it. Both variants look as before. The banner's grid sits on its `.neuwo-cta__inner` instead of `.neuwo-cta--banner`, so restyle its columns or gap there.
- Fixed: markup React renders once and never hydrates, such as an Astro component with no client directive, keeps the starting value or state that `defaultValue` or `defaultChecked` gave a field, a segmented control, a checkbox, a toggle or a radio when a script changes an attribute later. React leaves those off the element and puts them on its native control only, and the element used to render again without them, so a later `form.reset()`, and a control the user had not touched, lost them. The element now takes them as if its `value` or `checked` attribute were there, until that attribute itself is set or removed.
- Fixed: a click on a label of a `<neuwo-combobox>`, its own, one wrapping it or one whose `for` names its trigger, focuses its trigger without opening the list, as a click on the label of a native `<select>` does, and a pick in the list of a combobox inside a wrapping label no longer opens the list again. A `searchable` combobox focuses without opening too; Tab still opens it.
- Fixed: a click or tap on the text field of a `searchable` `<neuwo-combobox>` opens the list and leaves it open. The popover's light dismiss hid it again when the button was released, so a click on a field without focus, and a click or tap into a field whose list was open, left the list closed. A pick from the list no longer opens it again either, which the focus returned to the field used to do. A click elsewhere that closes the list updates `isOpen` and `aria-expanded` as it hides, where they lagged a frame behind, and so does a right-press on the trigger, and a later Escape or other light dismiss after a press on the trigger that was dragged off it or a right-click on it.
- Fixed: `expand` leaves a `<neuwo-*>` tag that a browser parses as SVG or MathML as it is, where it used to write the component's markup into the foreign content, which a browser moves out of the drawing. Where the browser parses HTML again it still expands: inside an SVG `<foreignObject>`, `<desc>` or `<title>`, a MathML `<mi>`, `<mo>`, `<mn>`, `<ms>`, `<mtext>` or HTML `<annotation-xml>`, and after an HTML tag that ends the drawing.
- Fixed: a range whose value is its maximum, on a fractional step such as `max="0.3" step="0.1"`, no longer resolves to the step below in the template, so served markup paints a full fill instead of two thirds.
- Fixed: the JSX types give `onChange` the target the browser dispatches from, with `currentTarget` as the element: the inner `HTMLInputElement` or `HTMLTextAreaElement` for the input, textarea, range, checkbox, toggle, radio and radio group, and the element itself for the combobox and segmented control. `event.target.value` and `event.target.checked` type as before; a property only the element has, such as `noErrorLine`, now needs `event.currentTarget`. A handler defined apart from the element annotates its event with `NeuwoChangeEvent<NeuwoInput, HTMLInputElement>`, exported from `@neuwo/web-ui-library--demo/jsx-runtime`, instead of `React.ChangeEvent<NeuwoInput>`.
- Fixed: under React, `options` on `<neuwo-combobox>` and `<neuwo-segmented>` reports `selected` for an option React marked selected, and the hidden `<select>` that keeps the options is now `multiple`, so the browser no longer selects its first option by itself. Forms submit and validate as before, as that select has no name.
- Internal: the Shadow DOM base (`NeuwoShadowElement`), its shared reset and its error helper are gone, as every component renders in light DOM.
- Breaking: `<neuwo-segmented>` renders into its own light DOM from one template, so a server-rendered
  segmented control is styled from the first paint, and its recipe,
  `components/selection/segmented/segmented.css`, joins `neuwo-components.css`. It renders the
  `.neuwo-choice` root around the pill and the error line, as the checkbox does. The classes are
  prefixed: `.segmented` is now `.neuwo-segmented` (with `.neuwo-segmented--error`),
  `.segmented__indicator` and `.segmented__option` are now `.neuwo-segmented__indicator` and
  `.neuwo-segmented__option`, and the error line's `.control-error` is now `.neuwo-choice__error`. The
  indicator's `.segmented__indicator--animated` class and `data-active` attribute are gone: a placed
  pill carries `data-neuwo-placed`. The hidden `<select>` that keeps the options is
  `.neuwo-segmented__options` and the form value is `.neuwo-segmented__form-value`.
- Breaking: `::part(group)`, `::part(indicator)`, `::part(option)` and `::part(error)` on
  `<neuwo-segmented>` are gone, so no element has parts any more. Restyle through the classes, with the
  element name in front for weight: `neuwo-segmented .neuwo-segmented__option { font-weight: 500; }`.
- Breaking: `<neuwo-segmented>` is no longer form-associated. Its form control is a visually hidden
  native input that carries `name`, the starting value, `required`, `disabled` and `form`, so the control
  submits, resets and validates natively, in server-rendered markup before the script has loaded too,
  and `form="id"` now ties one outside its form to that form. A required control left unpicked reports
  the browser's own message instead of "Please select an option.". `form`, `validity`,
  `validationMessage`, `checkValidity()`, `reportValidity()` and `setCustomValidity()` act on that
  input, and `focus()` moves to the selected option, else the first enabled one.
- Breaking: the segmented control's `value` attribute is the starting value, as on the combobox: the
  option it names starts selected when it is enabled, else the first enabled option marked `selected`,
  else none, so a `value` that names a disabled or missing option no longer stands. The element no
  longer writes `value` onto itself. The `value` property reads the live value and setting it selects
  the option of that value, only an enabled one, without touching any attribute; `defaultValue` reads
  the starting value and sets the attribute. Changing the attribute moves a control the user has not
  picked in yet. A form reset returns to the starting value and no longer clears `error`.
- The segmented control's selected option is marked in the first paint: its button carries
  `aria-checked="true"`, which gives it the blue background and white text from CSS, readable with no
  script. The sliding pill is placed only once the user picks, slides to each later pick, and follows a
  resize from then on; the element no longer measures the buttons when it connects, so nothing shifts
  when the script loads. While the pill is shown, the selected option's own background gives way to it.
  In a disabled control the selected option dims with the others, as a checked disabled checkbox does,
  where the old pill stayed at full strength. The options keep a button's own text defaults, so a page's
  `text-transform` or `letter-spacing` still does not reach them, and its `font-style`, `line-height` or
  `white-space` no longer does: in a shadow root those reached the options, so a container with a tall line
  height made the pill taller.
- `<neuwo-segmented>` now dispatches `input` just before `change`, once each per pick, with the
  element as `event.target`; setting `value` still fires nothing, and the new `commit(value)` picks as
  the user does. Home and End now move to the first and last enabled option, beside the arrow keys
  and Space, and in a right-to-left context ArrowLeft and ArrowRight now move to the next and the
  previous option, read from the element's `direction` when the key is pressed.
- Breaking: the segmented control is always horizontal. Its radiogroup always carries
  `aria-orientation="horizontal"`, where it said `vertical` unless `orientation="horizontal"` was set,
  and the `orientation` attribute is gone from its docs and types; one left on the element is ignored.
- `aria-*` and `title` on `<neuwo-segmented>` are now copied onto its radiogroup, a later change too.
  `data-*` stays on the element only, so a query such as `[data-testid="view"]` matches one node.
- Through the JSX runtime, `<neuwo-segmented>` behaves like the combobox: `value` makes it controlled,
  so a pick the `onChange` handler ignores is never shown, `defaultValue` starts an uncontrolled one,
  and `onInput` and `onChange` fire once per pick with the element as `event.target`. React Hook Form's
  `register` reads it through `value` and resets it by setting `value`, and while an option loses
  focus the option's `name` reads as the element's, as the combobox's trigger does, so `register`'s
  `onBlur` finds the field and marks it touched. The JSX types gain `form` and lose `orientation`.
- Breaking: `<neuwo-radio>` and `<neuwo-radio-group>` render into their own light DOM from one template
  each, so a server-rendered radio group is styled from the first paint, and the group's recipe,
  `components/selection/radio/radio-group.css`, joins `neuwo-components.css`. The group renders the
  `.neuwo-choice` root around the radiogroup and the error line, as the checkbox does, with
  `.neuwo-choice--flush`, which keeps the error line right under the full-width radiogroup as before.
  The classes are prefixed: `.radio-group` is now `.neuwo-radio-group`, `.radio-group__legend` and
  `.radio-group__options` are now `.neuwo-radio-group__legend` and `.neuwo-radio-group__options`, a
  radio's `.form-check`, `.form-check__input` and `.form-check__label` are now `.neuwo-form-check`,
  `.neuwo-form-check__input` and `.neuwo-form-check__label`, and the error line's `.control-error` is
  now `.neuwo-choice__error`. `orientation="horizontal"` adds `.neuwo-radio-group--horizontal`, and an
  error adds `.neuwo-radio-group--error` to the radiogroup and `.neuwo-form-check--error` to the label of
  each of its own radios, which rings that radio's box.
- Breaking: `::part(group)`, `::part(legend)`, `::part(options)` and `::part(error)` on
  `<neuwo-radio-group>`, and `::part(field)`, `::part(input)` and `::part(label)` on `<neuwo-radio>`, are
  gone. Restyle through the classes, with the element name in front for weight:
  `neuwo-radio-group .neuwo-radio-group__legend { font-weight: 600; }`.
- Breaking: `<neuwo-radio-group>` is no longer form-associated and has no form control of its own. Each
  `<neuwo-radio>` renders a native radio that takes the group's `name`, `required`, `form` and
  `disabled`, so the browser groups the radios: one checked at a time, Tab to the checked radio and the
  arrow keys to move the choice, `required` validated natively, and the checked radio submitted under
  the group's `name`, in server-rendered markup before the script has loaded too. `form="id"` now ties a
  group outside its form to that form. The group needs a `name` to group its radios, as native radios
  do: without one, each radio stands alone unless it carries a `name` of its own, and the group warns in
  the console once. A required group left unpicked reports the browser's own message instead of
  "Please select an option.".
- Breaking: the group's `value` attribute is the starting value: the radio of that value starts
  checked, whatever its own `checked` says, and without a group `value` a radio's `checked` attribute
  decides. The group no longer writes `value` onto itself or `checked` onto its radios. Changing the
  attribute moves the `checked` attribute to the radio of the new value, which then becomes checked, as
  a native radio does, unless a click or a script has already checked or unchecked that radio itself; a
  pick changes the picked radio and the one it unchecked. A form reset returns to the starting value and
  no longer clears `error`. The `value` property reads the checked radio's value and setting it checks the radio
  of that value, or none, without touching any attribute; `defaultValue` reads the starting value and
  sets the attribute. `form`, `validity`, `validationMessage`, `checkValidity()` and `reportValidity()`
  act on the first enabled radio, `setCustomValidity()` sets its message on every radio, and `focus()`
  moves to the checked radio, else the first enabled one.
- Breaking: `<neuwo-radio-group>` no longer dispatches its own `change`. The picked radio's own `change`
  bubbles through the group, once per pick, and its `input` now does too, so listeners on the group get
  the radio's inner `<input>` as `event.target`, not the group; its `value` is the picked value and its
  `name` the group's. Setting `value` from a script fires nothing, as before.
- `<neuwo-radio>` elements no longer need to be direct children of their group: a radio inside other
  markup in the group, such as a `<div>` or a `<label>`, takes the group's `name` and starting value and
  joins its selection. A radio inside a nested group belongs to that group.
- `aria-*` and `title` on `<neuwo-radio>` are now copied onto its input, a later change too, and on
  `<neuwo-radio-group>` onto the radiogroup, which needs them for its accessible name. `data-*` stays on
  each element only, so a query such as `[data-testid="plan"]` matches one node.
- A `<neuwo-radio>` outside any group is a radio of its own, with its own `name`, `value`, `checked`,
  `required`, `disabled` and `form`; inside a group, the group's `required` and `form` apply instead,
  and its `name` when it has one. Its `checked` property is live on the input, `defaultChecked` reads the starting state, and
  `type` reads `"radio"`.
- Through the JSX runtime, `<neuwo-radio-group>` behaves like a group of React's own radios: `value`
  makes every radio controlled, so a pick the `onChange` handler ignores is undone, `defaultValue` starts
  an uncontrolled group, and `onChange` fires once per pick with the radio's input as `event.target`.
  The radios get the group's attributes inside elements, fragments, context providers, `Suspense` and
  its fallback, `StrictMode`, `Profiler`, `Activity` and other Neuwo elements, but not inside a
  component of your own, through a portal or in another React root, which client development builds
  warn about. Radios a Server Component passes to a Client Component that renders the group arrive already
  rendered, outside the group, so they get none of its attributes; client development builds warn about it.
  React Hook Form's `register` goes on the group, which it reads through `value` and resets by setting
  it. The JSX types give `<neuwo-radio>` `name`, `value`, `checked`, `defaultChecked`, `disabled`,
  `form`, `required` and an `onChange`, and refuse `defaultValue` and the error attributes on it.
- Breaking: `<neuwo-checkbox>` and `<neuwo-toggle>` render into their own light DOM from one template
  each, so a server-rendered checkbox or toggle is styled from the first paint, and their recipes,
  `components/selection/controls.css`, `components/selection/form-check.css` and
  `components/selection/toggle/toggle.css`, join `neuwo-components.css`. Both render a new root,
  `.neuwo-choice`, around their row and the error line. Their classes are prefixed: `.form-check` is now
  `.neuwo-form-check` (with `.neuwo-form-check--error`), `.form-check__input` and `.form-check__label` are
  now `.neuwo-form-check__input` and `.neuwo-form-check__label`, `.form-toggle` is now `.neuwo-form-toggle`
  (with `.neuwo-form-toggle--pulse` and `.neuwo-form-toggle--error`), `.form-toggle__input`,
  `.form-toggle__track` and `.form-toggle__label` are now `.neuwo-form-toggle__input`,
  `.neuwo-form-toggle__track` and `.neuwo-form-toggle__label`, and the error line's `.control-error` is now
  `.neuwo-choice__error`. The `toggle-pulse` keyframes are now `neuwo-toggle-pulse`.
- Breaking: `::part(field)`, `::part(input)`, `::part(label)` and `::part(error)` on `<neuwo-checkbox>`
  and `<neuwo-toggle>`, and `::part(track)` on the toggle, are gone. Restyle through the classes, with the
  element name in front for weight: `neuwo-checkbox .neuwo-form-check__label { font-weight: 500; }`.
- Breaking: `<neuwo-checkbox>` and `<neuwo-toggle>` are no longer form-associated. Their native checkbox
  sits inside your form and carries `name`, `value`, `checked`, `required`, `disabled` and `form`, so they
  submit, reset and validate natively, in server-rendered markup before the script has loaded too, and
  `form="id"` now ties one outside its form to that form. The `checked` attribute is the starting state,
  as on a native checkbox: it no longer follows a click or the `checked` property, changing it moves only
  a checkbox the user has not clicked, and a form reset returns to it and no longer clears `error`. A
  required one left unchecked reports the browser's own message instead of "Please tick this box.".
  `form`, `validity`, `validationMessage`, `checkValidity()`, `reportValidity()`, `setCustomValidity()`,
  `focus()` and `blur()` act on the inner checkbox, and `name`, `form` and `defaultChecked` are now
  properties too.
- Breaking: `<neuwo-checkbox>` and `<neuwo-toggle>` no longer dispatch their own `change`. The inner
  checkbox's own `change` bubbles through the element, once, and its `input` now does too, so listeners
  get the inner `<input>` as `event.target`, not the element; use `event.currentTarget` for the element.
- Breaking: an indeterminate `<neuwo-checkbox>` no longer writes `aria-checked="mixed"` onto its checkbox,
  since the native indeterminate state is already announced as mixed. `indeterminate` is the inner
  checkbox's own property, which a click clears.
- Breaking: `data-*` on `<neuwo-checkbox>` and `<neuwo-toggle>` stays on the element and is no longer
  copied onto the inner checkbox, so a query such as `[data-testid="terms"]` matches one node. `aria-*`
  and `title` are still copied, and a later change or removal now reaches the inner checkbox too.
- The transition on the box of `<neuwo-checkbox>` now stops under `prefers-reduced-motion: reduce`, as
  the toggle's already did.
- Through the JSX runtime, `<neuwo-checkbox>` and `<neuwo-toggle>` behave like React's own checkbox:
  `checked` makes one controlled, `defaultChecked` starts an uncontrolled one, and `onChange` fires on
  every click with the inner checkbox as `event.target`. The JSX types give an element with a `checked`
  attribute `checked` and `defaultChecked` as booleans, `value` as a string or a number and an `onChange`
  whose `event.target` is typed as the inner checkbox and `event.currentTarget` as the element, and refuse
  `defaultValue` on it.
- `<neuwo-checkbox>` and `<neuwo-toggle>` have a read-only `type` of `"checkbox"`, and `defaultChecked`
  reads the starting state the JSX runtime rendered from `defaultChecked`, so React Hook Form's `register`
  reads and resets them as a native checkbox: a checked one gives its `value`, or `true` without one, and
  an unchecked one `false`. It used to read `"on"` whatever the state, and its reset wrote the default
  into a `value` attribute on the element.
- Breaking: `<neuwo-input>` renders into its own light DOM from one template, so a server-rendered
  input is styled from the first paint, and its recipe, `components/fields/field.css`, joins
  `neuwo-components.css`. Its classes are prefixed: `.field` is now `.neuwo-field` (with
  `.neuwo-field--sm`), `.field__label`, `.field__label--empty`, `.field__required` and `.field__error`
  are now `.neuwo-field__label`, `.neuwo-field__label--empty`, `.neuwo-field__required` and
  `.neuwo-field__error`, and `.input`, `.input--sm` and `.input--error` are now `.neuwo-input`,
  `.neuwo-input--sm` and `.neuwo-input--error`. The label holds two new spans: `.neuwo-field__label-content`
  around the `slot="label"` children, `display: contents`, and `.neuwo-field__label-text` around the
  `label` text.
- A native control that a light DOM component renders for the user to type into or pick from, such as the
  `<input>` in `<neuwo-input>`, the trigger of `<neuwo-combobox>` or an option of `<neuwo-segmented>`, keeps
  its own text defaults (alignment, casing, spacing, weight, style, line height and white space) instead of
  taking them from the host, so a centred or uppercase container does not restyle what the user types or
  picks. In a shadow root the combobox trigger took its weight, style, line height and white space from the
  page, so a container with a tall line height made it taller than the input beside it; it no longer does.
  The `<button>` that `<neuwo-button>` renders is the exception: its label is your content, so it takes its
  line height, style, casing and spacing from the host, as the link it renders for `href` does.
- Breaking: `::part(field)`, `::part(label)`, `::part(input)` and `::part(error)` on `<neuwo-input>` are
  gone. Restyle through the classes, with the element name in front for weight:
  `neuwo-input .neuwo-input { border-radius: 0; }`.
- Breaking: `<neuwo-input>` is no longer form-associated. Its native `<input>` sits inside your form and
  carries `name`, `value`, `required`, `disabled`, `form` and the constraint attributes, so it submits, resets
  and validates natively, in server-rendered markup before the script has loaded too. The `value`
  attribute is the starting value, as on a native input: changing it moves only an input the user has
  not edited, and a form reset returns to it and no longer clears `error`. The element no longer
  dispatches its own `change`; the input's own `change` bubbles through it, once. On plain pages too,
  `change` and `input` listeners on the element now get the inner `<input>` as `event.target`, not the
  element; use `event.currentTarget` for the element. `form`, `validity`,
  `validationMessage`, `checkValidity()`, `reportValidity()`, `setCustomValidity()`, `focus()` and
  `blur()` act on the inner input, and `name` and `defaultValue` are now properties too. `defaultValue`
  reads the starting value the inner input holds, as on every field, so it also reads one the JSX
  runtime set from `defaultValue` without a `value` attribute.
- Breaking: in React, `onChange` on `<neuwo-input>` fires on every keystroke, as on React's own
  `<input>`, instead of when the user commits a value. `value` makes the field controlled,
  `defaultValue` starts an uncontrolled one, and `event.target` is the inner `<input>`.
- Breaking: `data-*` on `<neuwo-input>` stays on the element and is no longer copied onto the inner
  input, so a query such as `[data-testid="email"]` matches one node. `aria-*` and `title` are still
  copied, and a later change or removal now reaches the inner input too.
- Breaking: `<neuwo-textarea>` renders into its own light DOM from the same template and shell as
  `<neuwo-input>`, with its recipe, `components/fields/textarea/textarea.css`, in `neuwo-components.css`.
  The classes are those of `<neuwo-input>` (`.neuwo-field`, `.neuwo-field__label`, `.neuwo-field__error`,
  `.neuwo-input` and their modifiers), plus `.neuwo-textarea` on the native `<textarea>` for the minimum
  height and vertical resize; the unprefixed `.field`, `.input` and their parts are gone, and
  `::part(field)`, `::part(label)`, `::part(input)` and `::part(error)` no longer match. It is no longer
  form-associated: the native `<textarea>` submits, resets and validates with its form, the `value`
  attribute is its starting text, a form reset no longer clears `error`, and the `change` and `input`
  events, `event.target`, `onChange` in React and `data-*` follow `<neuwo-input>` above. A value that
  starts with a line break survives server rendering, including one written as `\r\n` or `\r`, as a
  submitted form sends it.
- Breaking: `<neuwo-range>` renders into its own light DOM from the same shell as `<neuwo-input>`, with
  its recipe, `components/fields/range/range.css`, in `neuwo-components.css`. The native range input
  carries `.neuwo-input` and `.neuwo-range`; the unprefixed `.range`, `.field`, `.input` and their parts are
  gone, and `::part(field)`, `::part(label)`, `::part(input)` and `::part(error)` no longer match. It is no
  longer form-associated: the native input submits, resets and validates with its form, the `value`
  attribute is its starting value, a form reset no longer clears `error`, and the `change` and `input`
  events, `event.target`, `onChange` in React and `data-*` follow `<neuwo-input>` above. The custom
  properties keep their `--neuwo-range-*` names.
- The filled part of a range track is in the first paint. The template writes `--neuwo-range-fill` onto
  the input from `min`, `max` and `value`, so server-rendered markup shows it in WebKit and Blink before the
  script loads; it used to be written by script and the track was unfilled until then. The element keeps it
  current when the thumb moves, the value is set, a bound changes and the form resets, in markup React
  hydrated too, and it shows a value the browser restored, or the user set, before the script loaded.
- Breaking: `<neuwo-combobox>` renders into its own light DOM from one template, with its recipe,
  `components/fields/combobox/combobox.css`, in `neuwo-components.css`, so a server-rendered combobox shows
  its trigger and selected label from the first paint. Its classes are prefixed: `.combobox` is now
  `.neuwo-combobox`, and `.combobox__trigger`, `.combobox__value`, `.combobox__chevron`, `.combobox__popup`,
  `.combobox__listbox`, `.combobox__option`, `.combobox__group-item`, `.combobox__group` and `.combobox__empty`
  are now `.neuwo-combobox__trigger`, `.neuwo-combobox__value`, `.neuwo-combobox__chevron`,
  `.neuwo-combobox__popup`, `.neuwo-combobox__listbox`, `.neuwo-combobox__option`,
  `.neuwo-combobox__group-item`, `.neuwo-combobox__group` and `.neuwo-combobox__empty`. The highlighted row's
  `.is-active` is now `.neuwo-combobox__option--active`. The trigger keeps the field classes (`.neuwo-input`
  and its modifiers), the shell is that of `<neuwo-input>`, and `::part(field)`, `::part(label)`,
  `::part(input)`, `::part(error)`, `::part(chevron)` and `::part(popup)` no longer match.
- Breaking: `<neuwo-combobox>` is no longer form-associated. A visually hidden native input,
  `.neuwo-combobox__form-value`, carries `name`, the starting value, `required`, `disabled` and `form`, so
  the combobox submits, resets and validates with its form, in server-rendered markup before the script has
  loaded too. The `<option>` and `<optgroup>` children stay in a hidden `<select>`,
  `.neuwo-combobox__options`. `form`, `validity`, `validationMessage`, `checkValidity()`,
  `reportValidity()` and `setCustomValidity()` act on that input, and focus that lands on it moves to the
  trigger. In React, the options must be `<option>` and `<optgroup>` elements written in place, not a
  component that renders them.
- Breaking: `data-*` on `<neuwo-combobox>` stays on the element and is no longer copied onto the trigger, so
  a query such as `[data-testid="plan"]` matches the element alone; a query that pierces shadow roots, such
  as Playwright's `getByTestId`, used to match the trigger too. `aria-*` and `title` are still copied onto
  the trigger.
- Breaking: a required `<neuwo-combobox>` with nothing selected reports the browser's own message, such as
  "Please fill out this field.", instead of "Please select an option.". Its trigger carries
  `aria-required="true"`, since the required native input is hidden from assistive technology.
- Breaking: the hidden form value of `<neuwo-combobox>` is a text field, and so is the trigger of a
  `searchable` one, so a form whose only other field is a single text input, with no submit button, no
  longer submits when the user presses Enter in that input. This is the trade-off of carrying `required`
  natively; add a submit button to keep implicit submission.
- A value the browser or a script writes into the hidden form value of `<neuwo-combobox>`, such as autofill,
  shows in the trigger, and one no enabled option has is cleared. The form value's own `input` and `change`
  never reach the element's listeners.
- A form reset returns `<neuwo-combobox>` to the option marked `selected` when the `value` attribute names
  no enabled option; it used to clear the selection. A reset no longer removes `error`.
- Typing into the filter of a `searchable` `<neuwo-combobox>` no longer fires `input` or `change` on the
  element, so `onInput` and `onChange` in React fire only when the user picks a value.
- A blur from the trigger of `<neuwo-combobox>` reads the field's `name` on `event.target` while it is
  dispatched, so React Hook Form's `register` marks the combobox touched and validates it on blur. The
  trigger gains no `name` attribute and still submits nothing.
- The rows a `searchable` `<neuwo-combobox>` filters out are hidden; the row's `display: block` used to keep
  them on screen. The chevron turns while the list is open, which its rule never matched before.
- Breaking: in React, `value` on `<neuwo-combobox>` makes it controlled, as on React's own `<select>`. A pick
  fires `onInput` and `onChange` with the element as `event.target` and the picked value as its `value`, and
  the combobox then shows what your state says, so a pick your handler ignores is never shown; it used to show
  every pick. A `value` that names no enabled option resolves as the `value` attribute does: to the first
  enabled option marked `selected`, else to nothing, which shows the placeholder and submits an empty value;
  picking the option it resolved to fires no `change`. `defaultValue`, and `value` from a Server Component,
  give an uncontrolled combobox that keeps the user's pick across re-renders, including ones that change its
  placeholder or an option's label. Options a component of your own renders inside the combobox are never
  listed, as the JSX runtime reads the options before that component renders, while options inside
  fragments, context providers and React's own wrappers such as `Suspense` are; an option whose label a
  component renders shows an empty row. Client development builds warn about both, for `<neuwo-segmented>`
  too.
- Breaking: `<neuwo-cta>` renders into its own light DOM from one template, so a server-rendered band
  is styled from the first paint. Its classes are prefixed: `.cta` is now `.neuwo-cta` (with
  `.neuwo-cta--{banner|spotlight}`), and `.cta__body`, `.cta__glow`, `.cta__inner`, `.cta__headline`,
  `.cta__sub`, `.cta__field`, `.cta__status` and `.cta__actions` are now `.neuwo-cta__body`,
  `.neuwo-cta__glow`, `.neuwo-cta__inner`, `.neuwo-cta__headline`, `.neuwo-cta__sub`, `.neuwo-cta__field`,
  `.neuwo-cta__status` and `.neuwo-cta__actions`, with `.neuwo-cta__field--empty` and
  `.neuwo-cta__status--{success|error}`. The `cta-scan`, `cta-spin` and `cta-button-pulse` keyframes
  are now `neuwo-cta-scan`, `neuwo-cta-spin` and `neuwo-cta-button-pulse`.
- Breaking: the `<neuwo-cta>` sub wrapper, `.neuwo-cta__sub`, is a `<div>`, not a `<p>`, so it can
  hold a paragraph.
- Breaking: `::part(cta)`, `::part(inner)`, `::part(headline)`, `::part(sub)`, `::part(field)`,
  `::part(status)` and `::part(actions)` on `<neuwo-cta>` are gone. Restyle through the classes, with
  the element name in front for weight: `neuwo-cta .neuwo-cta__headline { font-weight: 500; }`.
- The `<neuwo-cta>` rules that reached your content through `::slotted` are descendant selectors now.
  `data-accent` paints at any depth in the headline (`.neuwo-cta__headline [data-accent]`), not only
  on a direct child, and the pulse ring goes on the first `<neuwo-button>` among the actions
  (`neuwo-cta[pulse] .neuwo-cta__actions > neuwo-button:first-of-type`), not the first one across
  every slot. `data-accent` no longer paints in the sub, field or actions, where `::slotted([data-accent])`
  used to match a top-level child in any slot.
- `<neuwo-cta>` now observes `pulse` and `intensity`, which it already documented. They still change
  no markup, only the ring's styles.
- The `<neuwo-cta>` scan line sweeps with `transform` instead of `left`, so a visible CTA no longer
  shifts layout.
- The gradient frame of the spotlight `<neuwo-cta>` now paints on hover before the script runs.
- The spotlight `<neuwo-cta>` isolates its stacking context, so the hover glow stays behind the card
  instead of disappearing behind a page section's background.
- `<neuwo-cta>` warns about a missing headline or action only when it connects with content, as
  server-rendered or authored markup does. A band a script connects empty and fills later, in any task,
  no longer logs both warnings.
- Breaking: `<neuwo-notice>` renders into its own light DOM from one template, so a server-rendered
  notice is styled from the first paint. Its classes are prefixed: `.notice` is now `.neuwo-notice`
  (with `.neuwo-notice--{fixed|top|bottom|start|end|center|row|dismissible}`), and `.notice__content`,
  `.notice__title`, `.notice__message`, `.notice__actions` and `.notice__dismiss` are now
  `.neuwo-notice__content`, `.neuwo-notice__title`, `.neuwo-notice__message`, `.neuwo-notice__actions`
  and `.neuwo-notice__dismiss`, with `.neuwo-notice__{title|message|actions}--empty` on a wrapper
  nothing fills. The title wrapper is a `<div>`, not a `<p>`, so it can hold a heading or a
  paragraph. The `notice-in` keyframes are now `neuwo-notice-in`.
- Breaking: `::part(notice)`, `::part(content)`, `::part(title)`, `::part(message)`, `::part(actions)`
  and `::part(dismiss)` on `<neuwo-notice>` are gone. Restyle through the classes, with the element
  name in front for weight: `neuwo-notice .neuwo-notice { border-radius: 0; }`.
- Breaking: `role="status"` moves from the `<neuwo-notice>` element to its inner `.neuwo-notice` card,
  and the element no longer writes `role` onto itself. A `role` you set on the element, such as
  `role="dialog"` on a consent banner, still takes its place, even when a script sets it after render:
  the card then carries no role. An `aria-label` or `aria-live` on the element no longer names or
  qualifies the status region, since the card holds the role now.
- Breaking: `<neuwo-copy>` renders into its own light DOM from one template, so a server-rendered
  copy wrapper shows its control from the first paint. Your content moves into a new
  `.neuwo-copy__content` wrapper inside a `display: contents` root, `.neuwo-copy`. The classes are
  prefixed: `.copy` is now `.neuwo-copy__button` and `.copy__status` is now `.neuwo-copy__status`.
  `.copy--done` is gone: for 1.2 s after a copy the host carries `data-neuwo-state="copied"`, which
  draws the tick, or `"failed"` when the clipboard refused.
- Breaking: `::part(button)` and `::part(status)` on `<neuwo-copy>` are gone. Restyle through the
  classes, with the element name in front for weight: `neuwo-copy .neuwo-copy__button { border-radius: 0; }`.
- Breaking: `<neuwo-copy>` always renders its control, since the markup cannot know whether the
  clipboard is reachable. Where it is not, as in an insecure context, a click announces
  `failed-label` instead of the control being absent. A copy with no text to write also announces
  `failed-label`, and fires no `copied`, instead of writing an empty string.
- Breaking: `<neuwo-logo>` renders its `<svg>` into its own light DOM from one template, so a
  server-rendered logo is drawn from the first paint. Its classes are prefixed: `.logo` is now
  `.neuwo-logo`, with `.neuwo-logo--{bg-light|bg-dark|bg-dark-alt|bg-colour}`.
- Breaking: `::part(logo)` on `<neuwo-logo>` is gone. Restyle through the classes, with the element
  name in front for weight: `neuwo-logo .neuwo-logo { opacity: 0.8; }`.
- Breaking: `<neuwo-badge>`, `<neuwo-deal-id>` and `<neuwo-status-dot>` render into their own light DOM
  from one template, like the button, so server-rendered ones are styled from the first paint.
  Their classes are prefixed: `.badge` is now `.neuwo-badge` (with `.neuwo-badge--{green|s|l|borderless|glow|pulse|shimmer|intensity-s|intensity-l}`),
  `.deal-id` is now `.neuwo-deal-id` (with `.neuwo-deal-id--{s|l}`), and `.status-dot` is now
  `.neuwo-status-dot` (with `.neuwo-status-dot--{blue|pulse|blink|halo-s|halo-l|glow-s|glow-m|glow-l}`).
- The keyframes are renamed to match: `badge-pulse` and `badge-shimmer` are now `neuwo-badge-pulse` and
  `neuwo-badge-shimmer`, and `status-dot-pulse` and `status-dot-blink` are now `neuwo-status-dot-pulse`
  and `neuwo-status-dot-blink`.
- Breaking: the `<neuwo-badge>` shimmer sweeps with `transform` instead of `left`, so it no longer shifts
  layout, and `--neuwo-badge-shimmer-width` is now unitless, a percentage of the badge (`35`, not `35%`).
  An override with a unit, such as `40%`, now removes the sweep.
- Breaking: `::part(badge)`, `::part(value)` and `::part(dot)` are gone. Restyle through the classes, with
  the element name in front for weight: `neuwo-badge .neuwo-badge { font-weight: 500; }`.
- The label of `<neuwo-badge>` and the value of `<neuwo-deal-id>` are now plain children of their
  `.neuwo-badge` and `.neuwo-deal-id` span instead of a slot.
- Breaking: `<neuwo-button>` renders into its own light DOM from one template, the same markup the
  server and the JSX runtime produce, so server-rendered buttons are styled from the first paint.
  Its classes are prefixed: `.btn` is now `.neuwo-btn`, with `.neuwo-btn--{solid|outline|glass|sm|lg}`,
  `.neuwo-btn--hover-{s|l}`, `.neuwo-btn--{wide|xwide|loading}` and `.neuwo-btn__spinner`, and the
  `button-spin` keyframes are now `neuwo-button-spin`. `block` also adds `.neuwo-btn--block`.
- `<neuwo-button>` wraps its children in three new spans, `.neuwo-btn__start`, `.neuwo-btn__label` and
  `.neuwo-btn__end`, always rendered and `display: contents`, so the layout is unchanged.
- Breaking: `::part(button)` on `<neuwo-button>` is gone. Restyle through the classes, with the element
  name in front for weight: `neuwo-button .neuwo-btn { border-radius: 0; }`.
- Breaking: `<neuwo-button>` is no longer form-associated. Its native `<button>` sits inside your form
  and submits or resets it natively, in server-rendered markup even before the script has loaded. The
  host's `form`, `name` and `value` are carried onto it, so `form="id"` still ties a button outside its
  form to that form. A scripted `click()` on the host element no longer submits; call it on the inner
  `.neuwo-btn`, or use `form.requestSubmit()`.
- `aria-*` and `title` on `<neuwo-button>` now appear on both the host and the inner control, which needs
  them for its accessible name and tooltip. `data-*` stays on the host only, so a query such as
  `[data-testid="save"]` matches one element.
- A script can still set `textContent` or `innerHTML` on a rendered light DOM element, append a child
  with a `slot`, change the `slot` of a child already placed, add or remove content inside one of the
  element's wrappers, or change its `aria-*`, `title` and `role`: the element fits the change into its
  markup in a microtask, so read the markup back after an `await`. A child whose `slot` changes moves to
  the wrapper of its new slot, and a wrapper a script empties gets its `--empty` modifier back, where
  both used to wait for the element's next change. An element a script took out of the page, as a toast
  does between messages, fits a change inside its wrappers or to a placed child's `slot` in a microtask
  too, and a change to its own children, `aria-*`, `title` or `role` when it is put back. Hosts React
  owns are left to React.
- A copy of a rendered field made with `cloneNode(true)` gets ids of its own when it is inserted, and its
  label, `aria-describedby`, `aria-controls`, `aria-labelledby` and `aria-activedescendant` follow them, so
  the copy's label focuses the copy's control instead of the original's. Any light DOM element that adopts
  markup whose ids another element in the same document or shadow root already has does the same, for the ids
  `expand` and the elements write (`neuwo-s1-...`, `neuwo-c1-...`). Ids React's `useId` made are left as React
  wrote them, so hydration still finds them, and a copy a script makes of markup React rendered keeps React's
  ids too: only the ids the library made are renamed. An element put back in the page while a copy of it
  holds its ids, as an undo of a removed row does, takes fresh ids in the same way.
- An attribute a script sets on, or removes from, a copy of a light DOM element made with `cloneNode(true)`
  before inserting it reaches the copy's markup; it used to be lost until the next change. One of the
  element's own attributes, such as a new `name` or a cleared `error` on an "add another" row, applies at
  once, so the copy's native controls carry it before they join the page: a renamed copy of a
  `<neuwo-radio-group>` or a `<neuwo-radio>` appended to the same form leaves the original's checked radio
  alone. An `aria-*`, `title` or `role` the element carries onto its control applies when the copy is
  inserted. A change to an element a script took out of the page applies at once in the same way.
- Two copies still adopt the markup they carry as written, since an element a browser parses cannot be
  told from one a script built: a clone of a `<template>`'s `content` (`template.content.cloneNode(true)`),
  and served rows cloned and renamed, say with a new `name`, before the elements are defined. Their
  markup keeps the attributes it was written with; set the attribute after the elements are defined.
- A copy of a rendered light DOM element made with `cloneNode(true)` adopts its markup as written too, as
  a change a script made inside its wrappers, or to a placed child's `slot`, before the copy was first
  inserted cannot be told from markup served that way. Call `refresh()` on the copy after such a change:
  it fits the markup at once, in the page or out of it.
- A property a script sets on any Neuwo element before the element is defined, such as `loading` on a
  button or `checked` on a checkbox from an inline script on a page whose module is deferred, now reaches
  the element when it is defined, through the element's own setter; it used to hide that property and
  never reach the markup or the control. A value written through the property after the element is
  defined wins over the early one, while an attribute written after a detached upgrade but before the
  element starts does not override it. One set on a read-only property, such as a radio's `type`, is
  dropped, so the element's own value shows.
- Setting an observed attribute to the value it already has no longer makes a light DOM element fit its
  markup again, and a `<neuwo-radio-group>` refreshes its radios only when its own attributes change, so a
  script that adds radios to a large group one at a time no longer slows down with each one.
- Light DOM elements have a `refresh()` method, which fits the markup to the current attributes and
  children at once instead of in that microtask, wherever an attribute change applies at once: on an
  element in the page, and on rendered markup out of it, such as a copy. Component classes get an
  `updated()` hook, which runs after every reconcile in the page and after every reconnect, but not after
  the first render or adoption, nor after a write out of the page, to re-apply live state the template
  cannot know.
- A component template can name an enclosing tag as its `within` to read the attributes of the nearest
  such element: in `expand`, in the browser, and through the JSX runtime, which reaches it through
  elements, fragments, context providers, `Suspense` and its fallback, `StrictMode`, `Profiler`,
  `Activity` and other Neuwo elements but not inside a component of your own, through a portal or in
  another React root, and warns about that in client development builds. `renderElement` takes them as an
  optional last argument, and an element refreshes the descendants that read it when it changes.
- `components/reset.css`, the reset for the light DOM components, is published and leads the component
  styles in `neuwo-components.css`. It is written with CSS nesting, so a tool that reads the file must
  support nesting, as lightningcss does.
- Page element rules such as `button { text-transform: uppercase }`, `span { line-height: 3 }`,
  `a { text-decoration: underline }` or `div { display: block }` no longer reach the markup a light DOM
  component renders. Its text properties come from the host, so casing set on `neuwo-badge` still applies,
  and every other property of its HTML elements starts from the browser's default, so such a rule no
  longer shows the closed list of a `<neuwo-combobox>`, outlines, dims or repositions a control, sets its
  cursor, wrapping, font features or writing direction, styles its placeholders, or gives its list rows a
  `::marker`. A component inside a `dir="rtl"` element still follows that direction. Your own content inside
  a component, including foundation classes such as `.neuwo-callout`, is left alone.
- Breaking: `neuwo.js` no longer carries fonts or tokens. Link `neuwo-components.css` (or `neuwo.css`) on
  the page, or import it where you import the library; `<style data-neuwo-fonts>` is no longer read.
- `neuwo-standalone.js` is for pages that can only add a script: it embeds `neuwo-components.css`, applies
  it only when the page has not linked it, and loads the fonts from beside itself.
- New entries: `./server` exports `expand(html)`, `renderElement` and the Eleventy plugin, with its HTML
  parser bundled; `./jsx-runtime` and `./jsx-dev-runtime` wrap React's runtime for `jsxImportSource`, with
  a `react-server` build for Server Components. React DevTools and development Server Component payloads
  name each element's component after its tag and show only the props you passed. Elements recognise
  markup React rendered, from Client or Server Components, and leave it to React, so children passed in
  keep their state and DOM nodes across re-renders. Markup React served but has not hydrated yet is
  adopted as it is when the script defines the elements, and left as it is when React moves it into place,
  as revealing a Suspense boundary does, so a field keeps the starting value that `value` in a Server
  Component, or `defaultValue`, put on its native control, and hydration finds the markup it sent. A moved
  element fits its markup to its attributes and children only when they changed while it was out of the
  document.
- Served markup keeps its formatting and its ids. Whitespace and comments around an element's markup stay
  where they are when a script appends a child, where they used to move into the content and show as a
  stray space; indentation inside the markup is no longer removed on the first change; and an element the
  browser was still parsing when the script defined it keeps the ids the server gave the parts parsed
  after that, where its first change used to rewrite them.
- `expand` replaces a `<p>` that holds nothing but block components, such as fields, `<neuwo-copy>`,
  `<neuwo-cta>` or `<neuwo-notice>`, with whitespace and comments, by the expanded components. Markdown
  wraps a component on a line of its own, or a run of them on consecutive lines, in a paragraph, and the
  browser used to move the components' markup out of it, so a form of such fields submitted every value
  twice.
- Through the JSX runtime, the native control inside a light DOM component behaves like React's own input:
  `value` and `checked` are controlled, `onChange` on the element fires on every keystroke with the native
  control as `event.target`, a controlled `value` with only `onInput` draws no missing-`onChange` warning,
  and `defaultValue` and `defaultChecked` start an uncontrolled control. The Server Components build takes
  `value` and `checked` as starting values, and keeps `value` on a radio, checkbox or toggle, where it
  names the control, so a selector such as `neuwo-radio[value="pro"]` matches its markup too. The JSX
  types give every element with a `value` and a `change` event `value` and `defaultValue` as a string or a
  number, and an `onChange` whose `event.currentTarget` is typed as the element and `event.target` as its
  inner control, or as the element itself on the combobox and the segmented control. `min`, `max`, `step`,
  `minlength`, `maxlength` and `rows` on the fields take a string or a number too, so React Hook Form's
  `{...register("name")}` spreads onto every field.
- Through the JSX runtime, a light DOM element's own event handlers, such as `oncopied` on `<neuwo-copy>`
  and `ondismiss` on `<neuwo-notice>`, run from the first event on markup React hydrated. React's
  hydration binds none of them, so they used to stay silent until the component re-rendered, and a
  notice whose dismissal the handler should cancel hid itself instead.
- `neuwo.js` can be imported on a server, where it registers nothing, and loading it twice no longer throws.
- `neuwo-components.css` and `foundation/fonts.css` are now published, and `neuwo.css` carries the font faces.
- The metric-adjusted fallback faces also use Liberation Sans or Arimo where Arial is missing, as on most
  Linux systems, so text shifts less when the brand fonts arrive.
- Breaking: every custom property is now prefixed `--neuwo-` (tokens such as `--neuwo-color-blue`
  and component properties such as `--neuwo-copy-inset`), so the library cannot collide with a
  host page. Rename any overrides in your own CSS.
- Breaking: the foundation classes are now prefixed `neuwo-`: `.neuwo-body`, `.neuwo-background__gradient`,
  `.neuwo-nav-link`, `.neuwo-markdown`, `.neuwo-callout`, `.neuwo-link` and `.neuwo-eyebrow`, with their
  modifiers and elements. Update the class attributes in your markup.
- React JSX types, generated from the manifest, now come through `jsxImportSource`
  (`"jsxImportSource": "@neuwo/web-ui-library--demo"`) and type every element's attributes and custom
  events. Breaking: the types-only `./react` entry is removed.
- `copied` on `<neuwo-copy>` is typed `CustomEvent<{ text: string }>`.
- README: setup per kind of site (React, Next.js, Eleventy, other Node builds, plain HTML and
  script-only pages), versioning advice, and React 19 props and events with React 18's limits.
- Brand fonts now load when the stylesheet is imported through a bundler, which copies the woff2 files
  its `url()`s name into the app's output; previously the faces 404'd into a system fallback unless
  `fonts/` was served beside the bundle.

## 0.1.0

First published release. Pre-1.0, so breaking changes ship in minor bumps until the API settles.

- Renamed to the Neuwo Web UI Library, published as `@neuwo/web-ui-library--demo`.
- Licensed MIT.
- Published artefacts: `dist/neuwo.js`, the combined `dist/neuwo.css`, each foundation sheet and
  component recipe as its own file, the three woff2 faces, the four wordmark SVGs, generated
  types, and `custom-elements.json`.
