import { preload } from "react-dom";
import notoSans from "@neuwo/web-ui-library--demo/fonts/noto-sans-variable.woff2";
import outfit from "@neuwo/web-ui-library--demo/fonts/outfit-variable.woff2";
import Forms from "../shared/Forms.jsx";

export default function App() {
  preload(notoSans, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  preload(outfit, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
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
