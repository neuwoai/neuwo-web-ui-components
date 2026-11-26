import { join } from "node:path";
import { CHECKS } from "../checks.mjs";
import { startNext } from "../next.mjs";
import { checkSidebarSteady } from "../sidebar.mjs";
import { submitSignUps } from "../sign-up.mjs";

export const checks = CHECKS;

export async function interact(page, url) {
  return [...(await submitSignUps(page, url, { forms: 2, react: true })), ...(await checkSidebarSteady(page, url, { next: true }))];
}

export function start(context) {
  return startNext("example-next", "start", context, join(context.work, "examples", "nextjs"));
}
