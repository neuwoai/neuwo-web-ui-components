// Reads the component JS (and its JSDoc) and writes custom-elements.json to the
// repo root. The hand-authored .d.ts files are not components, so exclude them.

/** @type {Map<string, Set<string>>} */
const documented = new Map();
/** @type {Set<string>} */
const globalBased = new Set();

const keyOf = (path, name) => `${path}#${name}`;

export default {
  globs: ["src/**/*.js"],
  exclude: ["src/**/*.d.ts"],
  outdir: ".",
  litelement: false,
  plugins: [
    {
      name: "neuwo-global-base",
      // `extends (globalThis.HTMLElement ?? class {})`, which lets the base load on a server, leaves the analyser no name.
      analyzePhase({ ts, node, moduleDoc }) {
        if (!ts.isClassDeclaration(node) || !node.name) return;
        if (node.heritageClauses?.some((clause) => /\bglobalThis\.HTMLElement\b/.test(clause.getText()))) {
          globalBased.add(keyOf(moduleDoc.path, node.name.getText()));
        }
      },
      packageLinkPhase({ customElementsManifest }) {
        for (const mod of customElementsManifest.modules) {
          for (const declaration of mod.declarations ?? []) {
            if (globalBased.has(keyOf(mod.path, declaration.name))) declaration.superclass = { name: "HTMLElement", package: "global:" };
          }
        }
      },
    },
    {
      name: "neuwo-own-attributes",
      // Before inheritance a class's attributes are its own, and those its JSDoc documents carry a description.
      moduleLinkPhase({ moduleDoc }) {
        for (const declaration of moduleDoc.declarations ?? []) {
          if (declaration.kind !== "class") continue;
          const names = (declaration.attributes ?? []).filter(({ description }) => description).map(({ name }) => name);
          documented.set(keyOf(moduleDoc.path, declaration.name), new Set(names));
        }
      },
      // The analyser marks an attribute a class documents itself as inherited when a base documents it too.
      packageLinkPhase({ customElementsManifest }) {
        for (const mod of customElementsManifest.modules) {
          for (const declaration of mod.declarations ?? []) {
            const own = documented.get(keyOf(mod.path, declaration.name));
            for (const attribute of declaration.attributes ?? []) if (own?.has(attribute.name)) delete attribute.inheritedFrom;
          }
        }
      },
    },
    {
      name: "neuwo-mixins",
      // The analyser also records a mixin's inner class, named like the mixin so its JSDoc applies, as a class.
      moduleLinkPhase({ moduleDoc }) {
        const mixins = new Set((moduleDoc.declarations ?? []).filter(({ kind }) => kind === "mixin").map(({ name }) => name));
        moduleDoc.declarations = moduleDoc.declarations?.filter(({ kind, name }) => kind !== "class" || !mixins.has(name));
      },
      // The analyser puts a superclass's mixin attributes before, and over, the superclass's own; keep the superclass's order, wording and origin.
      packageLinkPhase({ customElementsManifest }) {
        const modules = new Map();
        for (const mod of customElementsManifest.modules) for (const declaration of mod.declarations ?? []) modules.set(declaration, mod.path);
        const declarations = customElementsManifest.modules.flatMap((mod) => mod.declarations ?? []);
        const classes = new Map(declarations.filter(({ kind }) => kind === "class").map((klass) => [klass.name, klass]));
        const mixedIn = (klass) => Boolean(klass && (klass.mixins || mixedIn(classes.get(klass.superclass?.name))));
        const done = new Set();
        const order = (klass) => {
          if (!klass || done.has(klass)) return;
          done.add(klass);
          const parent = classes.get(klass.superclass?.name);
          order(parent);
          if (klass.mixins || !mixedIn(parent) || !klass.attributes) return;
          const inherited = new Map((parent.attributes ?? []).map((attribute, index) => [attribute.name, { attribute, index }]));
          const rank = (attribute) => (attribute.inheritedFrom ? (inherited.get(attribute.name)?.index ?? -1) : -1);
          klass.attributes = klass.attributes
            .map((attribute) => {
              const from = attribute.inheritedFrom && inherited.get(attribute.name)?.attribute;
              if (!from) return attribute;
              const inheritedFrom = from.inheritedFrom ?? { name: parent.name, module: modules.get(parent) };
              return { ...attribute, ...(from.description && { description: from.description }), inheritedFrom };
            })
            .sort((a, b) => rank(a) - rank(b));
        };
        for (const klass of classes.values()) order(klass);
      },
    },
  ],
};
