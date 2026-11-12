import { Forms } from "./forms.jsx";

export default function Page() {
  return (
    <main>
      <neuwo-button variant="solid">Get started</neuwo-button> <neuwo-badge>Live</neuwo-badge>
      <neuwo-notice position="static">
        <span slot="title">Saved</span>Your changes are live.
      </neuwo-notice>
      <Forms />
    </main>
  );
}
