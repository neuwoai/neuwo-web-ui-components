import type { ReactNode } from "react";
import { preload } from "react-dom";
import "@neuwo/web-ui-library--demo/neuwo.css";
import notoSans from "@neuwo/web-ui-library--demo/fonts/noto-sans-variable.woff2";
import outfit from "@neuwo/web-ui-library--demo/fonts/outfit-variable.woff2";
import "./app.css";
import { Neuwo } from "./neuwo";
import { SiteSidebar } from "./site-sidebar";

export const metadata = { title: "Neuwo with React and Next.js", icons: { icon: "data:," } };

export default function RootLayout({ children }: { children: ReactNode }) {
  preload(notoSans, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  preload(outfit, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return (
    <html lang="en">
      <body className="neuwo-body">
        <Neuwo />
        <div className="background">
          <div className="neuwo-background__gradient" />
        </div>
        <div className="shell">
          <SiteSidebar />
          <main className="page">{children}</main>
        </div>
      </body>
    </html>
  );
}
