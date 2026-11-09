import type {} from "@neuwo/web-ui-library--demo/react";
import type { NeuwoButton } from "@neuwo/web-ui-library--demo";
import { useRef } from "react";

export function Usage() {
  const button = useRef<NeuwoButton>(null);
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
