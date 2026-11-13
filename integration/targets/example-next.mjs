import { join } from "node:path";
import { CHECKS } from "../checks.mjs";
import { startNext } from "../next.mjs";
import { submitSignUps } from "../sign-up.mjs";

export const checks = CHECKS;

export const interact = (page, url) => submitSignUps(page, url, { forms: 2, react: true });

export function start(context) {
  return startNext("example-next", "start", context, join(context.work, "examples", "nextjs"));
}
