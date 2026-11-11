import { jsx as reactJsx, jsxs as reactJsxs } from "react/jsx-runtime";
import { createRuntime } from "../core/adapters/react.js";
import { templates } from "../templates.js";

export { Fragment } from "react/jsx-runtime";

export const { jsx, jsxs } = createRuntime(templates, { factory: { jsx: reactJsx, jsxs: reactJsxs } });
