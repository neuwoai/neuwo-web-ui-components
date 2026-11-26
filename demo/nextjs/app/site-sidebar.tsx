"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function SiteSidebar() {
  const router = useRouter();
  return (
    <neuwo-sidebar
      current={usePathname()}
      remember
      onnavigate={(event) => {
        event.preventDefault();
        router.push(event.detail.href);
      }}
    >
      <Link slot="brand" href="/">
        <neuwo-logo variant="bg-dark" />
      </Link>
      <neuwo-nav-item href="/">Sign Up</neuwo-nav-item>
      <neuwo-nav-section label="Layout">
        <neuwo-nav-item href="/second">Second Page</neuwo-nav-item>
      </neuwo-nav-section>
      <neuwo-nav-section label="Resources">
        <neuwo-nav-item href="https://github.com/neuwoai/neuwo-web-ui-components">Source Code</neuwo-nav-item>
        <neuwo-nav-item href="https://www.npmjs.com/package/@neuwo/web-ui-library--demo">Package on npm</neuwo-nav-item>
      </neuwo-nav-section>
      <a slot="footer" href="https://neuwo.ai/">Back to neuwo.ai</a>
    </neuwo-sidebar>
  );
}
