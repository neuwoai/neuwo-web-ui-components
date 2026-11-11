import * as react from "react/jsx-dev-runtime";
import { createRuntime } from "../core/adapters/react.js";
import { templates } from "../templates.js";

export { Fragment } from "react/jsx-dev-runtime";

export const { jsxDEV } = createRuntime(templates, { factory: react, dev: true });
