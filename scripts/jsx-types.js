import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const PRIMITIVES = new Set(["string", "number", "boolean"]);

function propKey(name) {
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name);
}

function attributeType(text) {
  if (!text) return "string";
  if (PRIMITIVES.has(text)) return text;
  return text
    .split("|")
    .map((value) => value.trim())
    .map((value) => (/^\d+$/.test(value) ? `${value} | "${value}"` : JSON.stringify(value)))
    .join(" | ");
}

function isFormControl(declaration) {
  return (declaration.attributes ?? []).some(({ name }) => name === "value") && (declaration.events ?? []).some(({ name }) => name === "change");
}

function elementProps(declaration) {
  const form = isFormControl(declaration);
  const lines = [];
  const seen = new Set();
  for (const { name, type } of declaration.attributes ?? []) {
    if (seen.has(name)) continue;
    seen.add(name);
    lines.push(`${propKey(name)}?: ${form && name === "value" ? "string | number" : attributeType(type?.text)};`);
  }
  if (form) lines.push("defaultValue?: string | number;", `onChange?: React.ChangeEventHandler<${declaration.name}>;`);
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
