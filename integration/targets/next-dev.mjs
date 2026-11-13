import { join } from "node:path";
import { CHECKS } from "../checks.mjs";
import { startNext } from "../next.mjs";

export { interact } from "../forms.mjs";
export const checks = CHECKS;

export function start(context) {
  return startNext("next-dev", "dev", context, join(context.work, "apps", "next"));
}
