import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react({ jsxImportSource: "@neuwo/web-ui-library--demo" })],
});
