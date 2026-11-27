"use client";

import { useState, type FormEvent } from "react";
import type { NeuwoCombobox, NeuwoInput } from "@neuwo/web-ui-library--demo";
import type { NeuwoChangeEvent } from "@neuwo/web-ui-library--demo/jsx-runtime";
import { submitSignUp } from "./sign-up";

export default function ControlledSignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("publisher");
  const [digest, setDigest] = useState(false);
  const [updates, setUpdates] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const onName = (event: NeuwoChangeEvent<NeuwoInput, HTMLInputElement>) => setName(event.target.value);
  const onEmail = (event: NeuwoChangeEvent<NeuwoInput, HTMLInputElement>) => setEmail(event.target.value);
  const onRole = (event: NeuwoChangeEvent<NeuwoCombobox>) => setRole(event.target.value);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setDone(false);
    try {
      await submitSignUp({ name, email, role, digest, updates });
      setDone(true);
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="sign-up" onSubmit={onSubmit}>
      <neuwo-input label="Name" name="name" autocomplete="name" value={name} onChange={onName} />
      <neuwo-input label="Email" name="email" type="email" required value={email} onChange={onEmail} />
      <neuwo-combobox label="Role" name="role" value={role} onChange={onRole}>
        <option value="publisher">Publisher</option>
        <option value="advertiser">Advertiser</option>
        <option value="agency">Agency</option>
        <option value="other">Other</option>
      </neuwo-combobox>
      <neuwo-toggle name="digest" checked={digest} onChange={(event) => setDigest(event.target.checked)}>
        Send me the weekly digest
      </neuwo-toggle>
      <neuwo-checkbox name="updates" required checked={updates} onChange={(event) => setUpdates(event.target.checked)}>
        Send me product updates
      </neuwo-checkbox>
      <output>{JSON.stringify({ name, email, role, digest, updates })}</output>
      <neuwo-button type="submit" loading={pending}>
        Sign Up
      </neuwo-button>
      <neuwo-notice position="static" hidden={!done}>
        <span slot="title">Thanks for signing up</span>
      </neuwo-notice>
    </form>
  );
}
