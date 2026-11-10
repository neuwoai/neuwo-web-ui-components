import type { NeuwoButton, NeuwoInput } from "@neuwo/web-ui-library--demo";
import { useRef, useState } from "react";

export function Usage() {
  const button = useRef<NeuwoButton>(null);
  const input = useRef<NeuwoInput>(null);
  const [s, setS] = useState("");
  return (
    <>
      <neuwo-button ref={button} variant="outline" size="lg" disabled={false} onClick={() => {}}>
        Save
      </neuwo-button>
      <neuwo-checkbox checked name="terms" onChange={(event) => event.currentTarget.toggleAttribute("checked")} />
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
