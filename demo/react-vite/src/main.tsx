import "@neuwo/web-ui-library--demo/neuwo.css";
import "@neuwo/web-ui-library--demo";
import "./App.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
