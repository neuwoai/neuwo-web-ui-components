import * as react from "react/jsx-runtime";
import { createRuntime as create } from "../../src/core/adapters/react.js";

export const createRuntime = (registry, options = {}) => create(registry, { factory: react, ...options });
