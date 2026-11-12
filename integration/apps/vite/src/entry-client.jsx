import "@neuwo/web-ui-library--demo/neuwo-components.css";
import "@neuwo/web-ui-library--demo";
import { hydrateRoot } from "react-dom/client";
import App from "./App.jsx";

hydrateRoot(document.getElementById("root"), <App />);
