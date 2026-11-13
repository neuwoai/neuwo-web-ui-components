import { useState, type FormEvent } from "react";
import { submitSignUp } from "./sign-up";

export default function UncontrolledSignUp() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email"));
    const updates = data.get("updates") !== null;
    setPending(true);
    setMessage(null);
    await submitSignUp({ email, updates });
    setPending(false);
    setMessage(`Read from the form: ${JSON.stringify({ email, updates })}`);
  };

  return (
    <form className="sign-up" onSubmit={onSubmit}>
      <neuwo-input label="Email" name="email" type="email" required defaultValue="" />
      <neuwo-checkbox name="updates" required defaultChecked={false}>
        Send me product updates
      </neuwo-checkbox>
      <neuwo-button type="submit" loading={pending}>
        Sign up
      </neuwo-button>
      <neuwo-notice position="static" hidden={message === null}>
        <span slot="title">Thanks for signing up</span>
        {message}
      </neuwo-notice>
    </form>
  );
}
