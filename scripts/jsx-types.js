import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const PRIMITIVES = new Set(["string", "number", "boolean"]);

// The element a change event comes from. An element not listed here dispatches on itself.
export const CHANGE_TARGETS = {
  "neuwo-checkbox": "HTMLInputElement",
  "neuwo-input": "HTMLInputElement",
  "neuwo-radio": "HTMLInputElement",
  "neuwo-radio-group": "HTMLInputElement",
  "neuwo-range": "HTMLInputElement",
  "neuwo-textarea": "HTMLTextAreaElement",
  "neuwo-toggle": "HTMLInputElement",
};

function changeHandler(declaration) {
  const target = CHANGE_TARGETS[declaration.tagName];
  return `onChange?: NeuwoChangeHandler<${declaration.name}${target ? `, ${target}` : ""}>;`;
}

function propKey(name) {
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name);
}

function attributeType(text) {
  if (!text) return "string";
  const members = text.split("|").map((value) => value.trim());
  if (members.every((value) => PRIMITIVES.has(value))) return members.join(" | ");
  return members.map((value) => (/^\d+$/.test(value) ? `${value} | "${value}"` : JSON.stringify(value))).join(" | ");
}

function isCheckable(declaration) {
  return (declaration.attributes ?? []).some(({ name }) => name === "checked");
}

function isFormControl(declaration) {
  return (declaration.attributes ?? []).some(({ name }) => name === "value") && (declaration.events ?? []).some(({ name }) => name === "change");
}

function propType(name, type, { checkable, form }) {
  if (checkable && name === "checked") return "boolean";
  if ((checkable || form) && name === "value") return "string | number";
  return attributeType(type);
}

function elementProps(declaration) {
  const checkable = isCheckable(declaration);
  const form = isFormControl(declaration);
  const lines = [];
  const seen = new Set();
  for (const { name, type } of declaration.attributes ?? []) {
    if (seen.has(name)) continue;
    seen.add(name);
    lines.push(`${propKey(name)}?: ${propType(name, type?.text, { checkable, form })};`);
  }
  // React's own HTML props allow defaultValue on every element, so a checkable one refuses it explicitly.
  if (checkable) lines.push("defaultChecked?: boolean;", "defaultValue?: never;", changeHandler(declaration));
  else if (form) lines.push("defaultValue?: string | number;", changeHandler(declaration));
  // React 19 binds an on* prop on a custom element to the event of exactly that name, case and all.
  for (const { name, type } of declaration.events ?? []) {
    if (!name || !type?.text.startsWith("CustomEvent")) continue;
    lines.push(`${propKey(`on${name}`)}?: (event: ${type.text}) => void;`);
  }
  return lines;
}

export function jsxElementsTypes(manifest) {
  const elements = manifest.modules
    .flatMap((module) => module.declarations ?? [])
    .filter((declaration) => declaration.tagName)
    .sort((a, b) => a.tagName.localeCompare(b.tagName));

  const entries = elements.map((declaration) => {
    const props = elementProps(declaration).map((line) => `        ${line}`);
    return [`      "${declaration.tagName}": NeuwoElementProps<${declaration.name}, {`, ...props, "      }>;"].join("\n");
  });

  return `import type * as React from "react";
import type { ${elements.map((d) => d.name).join(", ")} } from "../index.js";

type NeuwoElementProps<E extends HTMLElement, P> = Omit<React.DetailedHTMLProps<React.HTMLAttributes<E>, E>, keyof P> & P;

type NeuwoChangeHandler<E extends HTMLElement, T extends EventTarget = E> = React.EventHandler<React.SyntheticEvent<E> & { target: EventTarget & T }>;

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
${entries.join("\n")}
    }
  }
}
`;
}

export function jsxRuntimeTypes(runtime) {
  const entry = runtime === "jsx-dev-runtime" ? "jsxDEV" : "jsx, jsxs";
  return `import "./jsx-elements.js";
export { Fragment, ${entry} } from "react/${runtime}";
export type { JSX } from "react/${runtime}";
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manifest = JSON.parse(await readFile("custom-elements.json", "utf8"));
  await writeFile("dist/types/jsx-elements.d.ts", jsxElementsTypes(manifest));
  await writeFile("dist/types/jsx-runtime.d.ts", jsxRuntimeTypes("jsx-runtime"));
  await writeFile("dist/types/jsx-dev-runtime.d.ts", jsxRuntimeTypes("jsx-dev-runtime"));
  console.log("Wrote dist/types/jsx-elements.d.ts, jsx-runtime.d.ts and jsx-dev-runtime.d.ts");
}
