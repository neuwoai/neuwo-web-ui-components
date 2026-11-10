import { createRuntime } from "../core/adapters/react.js";
import { templates } from "../templates.js";

export { Fragment } from "react/jsx-runtime";

// Server Components reject any ref, so this build must not mark hosts; keep it apart from jsx-runtime.js.
export const { jsx, jsxs } = createRuntime(templates, { markHost: false });
