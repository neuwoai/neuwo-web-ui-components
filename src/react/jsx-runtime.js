import { createRuntime } from "../core/adapters/react.js";
import { templates } from "../templates.js";

export { Fragment } from "react/jsx-runtime";

export const { jsx, jsxs } = createRuntime(templates);
