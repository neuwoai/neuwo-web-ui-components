import { jsxDEV as reactJsxDEV } from "react/jsx-dev-runtime";
import { createRuntime } from "../core/adapters/react.js";
import { templates } from "../templates.js";

export { Fragment } from "react/jsx-dev-runtime";

export const { jsxDEV } = createRuntime(templates, { factory: { jsxDEV: reactJsxDEV }, dev: true });
