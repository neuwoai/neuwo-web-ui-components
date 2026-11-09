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

function elementProps(declaration) {
  const lines = [];
  const seen = new Set();
  for (const { name, type } of declaration.attributes ?? []) {
    if (seen.has(name)) continue;
    seen.add(name);
    lines.push(`${propKey(name)}?: ${attributeType(type?.text)};`);
  }
  // React 19 binds an on* prop on a custom element to the event of exactly that name, case and all.
  for (const { name, type } of declaration.events ?? []) {
    if (!name || !type?.text.startsWith("CustomEvent")) continue;
    lines.push(`${propKey(`on${name}`)}?: (event: ${type.text}) => void;`);
  }
  return lines;
}

export function reactTypes(manifest) {
  const elements = manifest.modules
    .flatMap((module) => module.declarations ?? [])
    .filter((declaration) => declaration.tagName)
    .sort((a, b) => a.tagName.localeCompare(b.tagName));

  const entries = elements.map((declaration) => {
    const props = elementProps(declaration).map((line) => `        ${line}`);
    return [`      "${declaration.tagName}": NeuwoElementProps<${declaration.name}, {`, ...props, "      }>;"].join("\n");
  });

  return `import type { DetailedHTMLProps, HTMLAttributes } from "react";
import type { ${elements.map((d) => d.name).join(", ")} } from "../index.js";

type NeuwoElementProps<E extends HTMLElement, P> = Omit<DetailedHTMLProps<HTMLAttributes<E>, E>, keyof P> & P;

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
${entries.join("\n")}
    }
  }
}
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manifest = JSON.parse(await readFile("custom-elements.json", "utf8"));
  await writeFile("dist/types/react.d.ts", reactTypes(manifest));
  console.log("Wrote dist/types/react.d.ts");
}
