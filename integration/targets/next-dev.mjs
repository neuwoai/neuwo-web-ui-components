import { CHECKS } from "../checks.mjs";
import { startNext } from "../next.mjs";

export { interact } from "../next.mjs";
export const checks = CHECKS;

export function start(context) {
  return startNext("next-dev", "dev", context);
}
