import { preload } from "react-dom";
import "@neuwo/web-ui-library--demo/neuwo-components.css";
import notoSans from "@neuwo/web-ui-library--demo/fonts/noto-sans-variable.woff2";
import outfit from "@neuwo/web-ui-library--demo/fonts/outfit-variable.woff2";

export const metadata = { title: "Next.js integration", icons: { icon: "data:," } };

export default function RootLayout({ children }) {
  preload(notoSans, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  preload(outfit, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
