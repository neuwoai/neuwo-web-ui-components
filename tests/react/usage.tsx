import type { NeuwoButton, NeuwoInput, NeuwoSidebar } from "@neuwo/web-ui-library--demo";
import type { NeuwoChangeEvent } from "@neuwo/web-ui-library--demo/jsx-runtime";
import { useRef, useState } from "react";

// React Hook Form's own shape, declared here so the repository does not depend on it.
type FormHandler = (event: { target: unknown; type?: unknown }) => Promise<void | boolean>;
type UseFormRegisterReturn = {
  onChange: FormHandler;
  onBlur: FormHandler;
  ref: (instance: unknown) => void;
  name: string;
  min?: string | number;
  max?: string | number;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  required?: boolean;
  disabled?: boolean;
};
declare const register: (name: string) => UseFormRegisterReturn;

const onInputChange = (e: NeuwoChangeEvent<NeuwoInput, HTMLInputElement>) => e.target.checkValidity() && e.currentTarget.noErrorLine;

export function Usage() {
  const button = useRef<NeuwoButton>(null);
  const input = useRef<NeuwoInput>(null);
  const sidebar = useRef<NeuwoSidebar>(null);
  const [s, setS] = useState("");
  const [agreed, setAgreed] = useState(false);
  return (
    <>
      <neuwo-button ref={button} variant="outline" size="lg" disabled={false} onClick={() => {}}>
        Save
      </neuwo-button>
      <neuwo-checkbox checked={agreed} name="terms" onChange={(e) => setAgreed(e.target.checked)} />
      <neuwo-checkbox checked onChange={(e) => setAgreed(e.target.checked)} />
      <neuwo-checkbox defaultChecked value="weekly" onChange={(e) => e.target.indeterminate} />
      <neuwo-toggle pulse defaultChecked={false} onChange={(e) => setAgreed(e.currentTarget.checked)} />
      <neuwo-copy copied-label="Copied" oncopied={(event) => event.detail.text.toUpperCase()}>
        <pre>npm install</pre>
      </neuwo-copy>
      <neuwo-notice dismissible ondismiss={(event) => event.preventDefault()} />
      <neuwo-menu id="m" onopen={(e) => e.detail.trigger} onselect={(e) => e.detail.value}>
        <neuwo-menu-group heading="Show" select="many">
          <neuwo-menu-item value="live" checked={agreed}>
            Live Segments
          </neuwo-menu-item>
        </neuwo-menu-group>
      </neuwo-menu>
      <neuwo-menu onselect={(e) => e.detail.checked === e.detail.item.checked && e.detail.trigger?.dataset.row} onopen={(e) => e.preventDefault()} />
      <neuwo-button menu="m" variant="outline">Export</neuwo-button>
      <neuwo-button icon-only menu="m" size="sm" data-row="7" aria-label="Actions for Sports Fans" />
      <neuwo-button split menu="m" menu-label="More Save Options" type="submit">Save</neuwo-button>
      <neuwo-sidebar ref={sidebar} label="Documentation" current="/guides/" remember menu-label="Open Navigation" onnavigate={(e) => e.detail.href.startsWith("/") && e.preventDefault()}>
        <a slot="brand" href="/">
          <neuwo-logo variant="bg-dark" label="Neuwo Docs" />
        </a>
        <neuwo-nav-item href="/guides/">Guides</neuwo-nav-item>
        <neuwo-nav-section label="Reference" href="/reference/" id="reference" open>
          <neuwo-nav-item href="/reference/api/">API</neuwo-nav-item>
          <neuwo-nav-section label="Errors" open={false} />
        </neuwo-nav-section>
      </neuwo-sidebar>
      <neuwo-sidebar remember="docs" />
      <neuwo-button onClick={() => sidebar.current && (sidebar.current.menuOpen = !sidebar.current.menuOpen)}>Menu</neuwo-button>
      <neuwo-cta heading-level={3} />
      <neuwo-cta heading-level="3" />
      <neuwo-textarea rows={4} className="notes" />
      <neuwo-textarea mono no-resize />
      <neuwo-badge uppercase variant="green">Live</neuwo-badge>
      <neuwo-notice dismissible dismiss-filled position="static">Saved</neuwo-notice>
      <neuwo-input mono placeholder="nw_live_..." />
      <neuwo-input value={s} onChange={(e) => setS(e.target.value)} />
      <neuwo-input ref={input} defaultValue="draft" name="q" onChange={(e) => e.target.checkValidity()} />
      <neuwo-button onClick={() => input.current?.flashError()}>Run</neuwo-button>
      <neuwo-range value={40} />
      <neuwo-combobox value={s} onChange={(e) => setS(e.target.value + e.target.name)}>
        <option value="a">A</option>
      </neuwo-combobox>
      <neuwo-combobox defaultValue="a" name="plan" searchable />
      <neuwo-input {...register("email")} />
      <neuwo-textarea {...register("bio")} />
      <neuwo-range {...register("volume")} />
      <neuwo-checkbox {...register("terms")} />
      <neuwo-combobox {...register("plan")}>
        <option value="a">A</option>
      </neuwo-combobox>
      <neuwo-radio-group value={s} name="plan" onChange={(e) => setS(e.target.value)}>
        <neuwo-radio value="free">Free</neuwo-radio>
        <neuwo-radio value="pro" disabled>
          Pro
        </neuwo-radio>
      </neuwo-radio-group>
      <neuwo-radio-group defaultValue="free" label="Plan" orientation="horizontal" required form="signup" />
      <neuwo-radio-group {...register("tier")} />
      <neuwo-radio name="solo" value="x" defaultChecked onChange={(e) => setAgreed(e.target.checked)} />
      <neuwo-segmented value={s} name="view" label="View" onChange={(e) => setS(e.target.value + e.target.name)}>
        <option value="visual">Visual</option>
        <option value="json">JSON</option>
      </neuwo-segmented>
      <neuwo-segmented defaultValue="visual" required form="search" no-error-line onInput={(e) => e.currentTarget.commit("json")} />
      <neuwo-segmented {...register("view")} />
      <neuwo-input type="number" min={0} max="10" step={0.5} minlength={1} maxlength="5" />
      <neuwo-range min="0" max={100} step={10} />
      <neuwo-textarea rows="4" minlength={2} maxlength={200} />
      <neuwo-input onChange={(e) => e.currentTarget.noErrorLine} />
      <neuwo-input onChange={onInputChange} />
      <neuwo-combobox onChange={(e) => e.target.open()} />
      {/* @ts-expect-error the input's change event comes from its inner control, which has no noErrorLine */}
      <neuwo-input onChange={(e) => e.target.noErrorLine} />
      {/* @ts-expect-error the checkbox's change event comes from its inner control, which has no focusTarget */}
      <neuwo-checkbox onChange={(e) => e.target.focusTarget} />
      {/* @ts-expect-error the combobox dispatches on itself, so its target is no inner control with a list */}
      <neuwo-combobox onChange={(e) => e.target.list} />
      {/* @ts-expect-error a checkbox starts from defaultChecked, not defaultValue */}
      <neuwo-checkbox defaultValue="on" />
      {/* @ts-expect-error a radio's error belongs on its group */}
      <neuwo-radio error="Pick one" />
      {/* @ts-expect-error a radio starts from defaultChecked, not defaultValue */}
      <neuwo-radio defaultValue="x" />
      {/* @ts-expect-error not an orientation */}
      <neuwo-radio-group orientation="diagonal" />
      {/* @ts-expect-error the segmented control is always horizontal */}
      <neuwo-segmented orientation="vertical" />
      {/* @ts-expect-error checked is a boolean */}
      <neuwo-toggle checked="yes" />
      {/* @ts-expect-error not a text-like input type */}
      <neuwo-input type="checkbox" />
      {/* @ts-expect-error not a button variant */}
      <neuwo-button variant="primary" />
      {/* @ts-expect-error glow is a boolean */}
      <neuwo-badge glow="yes" />
      {/* @ts-expect-error icon-only is a boolean */}
      <neuwo-button icon-only="yes" />
      {/* @ts-expect-error split is a boolean */}
      <neuwo-button split="yes" />
      {/* @ts-expect-error React only binds the exact event name */}
      <neuwo-copy onCopied={() => {}} />
      {/* @ts-expect-error a pick reports a string value */}
      <neuwo-menu onselect={(e) => e.detail.value.toFixed()} />
      {/* @ts-expect-error a section starts open from a flag, not a string */}
      <neuwo-nav-section open="open" />
      {/* @ts-expect-error a navigate reports a string href */}
      <neuwo-sidebar onnavigate={(e) => e.detail.href.toFixed()} />
      {/* @ts-expect-error not an element the library defines */}
      <neuwo-nope />
    </>
  );
}
