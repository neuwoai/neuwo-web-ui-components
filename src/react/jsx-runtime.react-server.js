import * as react from "react/jsx-runtime";
import { createRuntime } from "../core/adapters/react.js";
import { templates } from "../templates.js";

export { Fragment } from "react/jsx-runtime";

// Server Components reject any ref or function prop, so this build marks no host and controls no field; keep it apart from jsx-runtime.js.
export const { jsx, jsxs } = createRuntime(templates, { factory: react, markHost: false, server: true });
