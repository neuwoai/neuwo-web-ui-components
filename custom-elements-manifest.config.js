// Reads the component JS (and its JSDoc) and writes custom-elements.json to the
// repo root. The hand-authored .d.ts files are not components, so exclude them.
export default {
  globs: ["src/**/*.js"],
  exclude: ["src/**/*.d.ts"],
  outdir: ".",
  litelement: false,
  plugins: [
    {
      name: "neuwo-mixins",
      // The analyser also records a mixin's inner class, named like the mixin so its JSDoc applies, as a class.
      moduleLinkPhase({ moduleDoc }) {
        const mixins = new Set((moduleDoc.declarations ?? []).filter(({ kind }) => kind === "mixin").map(({ name }) => name));
        moduleDoc.declarations = moduleDoc.declarations?.filter(({ kind, name }) => kind !== "class" || !mixins.has(name));
      },
      // The analyser puts a superclass's mixin attributes before, and over, the superclass's own; keep the superclass's order and wording.
      packageLinkPhase({ customElementsManifest }) {
        const declarations = customElementsManifest.modules.flatMap((mod) => mod.declarations ?? []);
        const classes = new Map(declarations.filter(({ kind }) => kind === "class").map((klass) => [klass.name, klass]));
        for (const klass of classes.values()) {
          const parent = classes.get(klass.superclass?.name);
          if (klass.mixins || !parent?.mixins || !klass.attributes) continue;
          const inherited = new Map((parent.attributes ?? []).map((attribute, index) => [attribute.name, { attribute, index }]));
          const rank = (attribute) => (attribute.inheritedFrom ? (inherited.get(attribute.name)?.index ?? -1) : -1);
          klass.attributes = klass.attributes
            .map((attribute) => {
              const description = attribute.inheritedFrom && inherited.get(attribute.name)?.attribute.description;
              return description ? { ...attribute, description } : attribute;
            })
            .sort((a, b) => rank(a) - rank(b));
        }
      },
    },
  ],
};
