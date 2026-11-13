"use client";

import { useState, type FormEvent } from "react";
import { submitSignUp } from "./sign-up";

export default function UncontrolledSignUp() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const entries = [...data].map(([key, value]) => `${key}: ${String(value)}`).join(", ");
    setPending(true);
    setMessage(null);
    try {
      await submitSignUp({
        name: String(data.get("name")),
        email: String(data.get("email")),
        role: String(data.get("role")),
        digest: data.get("digest") !== null,
        updates: data.get("updates") !== null,
      });
      setMessage(`Read from the form: ${entries}`);
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="sign-up" onSubmit={onSubmit}>
      <neuwo-input label="Name" name="name" autocomplete="name" defaultValue="" />
      <neuwo-input label="Email" name="email" type="email" required defaultValue="" />
      <neuwo-combobox label="Role" name="role" defaultValue="publisher">
        <option value="publisher">Publisher</option>
        <option value="advertiser">Advertiser</option>
        <option value="agency">Agency</option>
        <option value="other">Other</option>
      </neuwo-combobox>
      <neuwo-toggle name="digest" defaultChecked={false}>
        Send me the weekly digest
      </neuwo-toggle>
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
