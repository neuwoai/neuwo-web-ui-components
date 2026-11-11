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
      <neuwo-input type="number" min={0} max="10" step={0.5} minlength={1} maxlength="5" />
      <neuwo-range min="0" max={100} step={10} />
      <neuwo-textarea rows="4" minlength={2} maxlength={200} />
      {/* @ts-expect-error a checkbox starts from defaultChecked, not defaultValue */}
      <neuwo-checkbox defaultValue="on" />
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
