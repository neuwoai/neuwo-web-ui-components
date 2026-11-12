import { useEffect, useRef, useState } from "react";

export default function Forms() {
  const forms = useRef(null);
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("free");
  const [terms, setTerms] = useState(false);
  const [volume, setVolume] = useState("30");
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    forms.current.dataset.ready = "";
  }, []);

  const submit = (event) => {
    event.preventDefault();
    setEntries([...new FormData(event.currentTarget)]);
  };

  return (
    <div id="forms" ref={forms}>
      <form id="controlled">
        <neuwo-input label="Email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <neuwo-combobox label="Plan" name="plan" value={plan} onChange={(event) => setPlan(event.target.value)}>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="team">Team</option>
        </neuwo-combobox>
        <neuwo-checkbox name="terms" checked={terms} onChange={(event) => setTerms(event.target.checked)}>
          I agree to the terms
        </neuwo-checkbox>
        <neuwo-range label="Volume" name="volume" value={volume} onChange={(event) => setVolume(event.target.value)} />
        <output id="controlled-echo">{JSON.stringify({ email, plan, terms, volume })}</output>
      </form>
      <form id="uncontrolled" onSubmit={submit}>
        <neuwo-input label="Name" name="name" defaultValue="Ada" />
        <neuwo-combobox label="Plan" name="plan" defaultValue="pro">
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="team">Team</option>
        </neuwo-combobox>
        <neuwo-checkbox name="news" defaultChecked>
          Send me news
        </neuwo-checkbox>
        <neuwo-range label="Volume" name="volume" defaultValue="60" />
        <neuwo-button type="submit">Submit</neuwo-button> <neuwo-button type="reset" variant="outline">Reset</neuwo-button>
        <output id="uncontrolled-result">{entries && JSON.stringify(Object.fromEntries(entries))}</output>
        <output id="uncontrolled-entries">{entries && JSON.stringify(entries)}</output>
      </form>
    </div>
  );
}
