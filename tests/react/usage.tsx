import type { NeuwoButton, NeuwoInput } from "@neuwo/web-ui-library--demo";
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

export function Usage() {
  const button = useRef<NeuwoButton>(null);
  const input = useRef<NeuwoInput>(null);
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
      <neuwo-cta heading-level={3} />
      <neuwo-cta heading-level="3" />
      <neuwo-textarea rows={4} className="notes" />
      <neuwo-input value={s} onChange={(e) => setS(e.target.value)} />
      <neuwo-input ref={input} defaultValue="draft" name="q" onChange={(e) => e.target.checkValidity()} />
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
      {/* @ts-expect-error React only binds the exact event name */}
      <neuwo-copy onCopied={() => {}} />
      {/* @ts-expect-error not an element the library defines */}
      <neuwo-nope />
    </>
  );
}
