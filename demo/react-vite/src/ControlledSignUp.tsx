import { useState, type FormEvent } from "react";
import type { NeuwoInput } from "@neuwo/web-ui-library--demo";
import type { NeuwoChangeEvent } from "@neuwo/web-ui-library--demo/jsx-runtime";
import { submitSignUp } from "./sign-up";

export default function ControlledSignUp() {
  const [email, setEmail] = useState("");
  const [updates, setUpdates] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const onEmail = (event: NeuwoChangeEvent<NeuwoInput, HTMLInputElement>) => setEmail(event.target.value);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setDone(false);
    await submitSignUp({ email, updates });
    setPending(false);
    setDone(true);
  };

  return (
    <form className="sign-up" onSubmit={onSubmit}>
      <neuwo-input label="Email" name="email" type="email" required value={email} onChange={onEmail} />
      <neuwo-checkbox name="updates" required checked={updates} onChange={(event) => setUpdates(event.target.checked)}>
        Send me product updates
      </neuwo-checkbox>
      <output>{JSON.stringify({ email, updates })}</output>
      <neuwo-button type="submit" loading={pending}>
        Sign up
      </neuwo-button>
      <neuwo-notice position="static" hidden={!done}>
        <span slot="title">Thanks for signing up</span>
      </neuwo-notice>
    </form>
  );
}
