import assert from "node:assert/strict";
import { Writable } from "node:stream";
import { renderToPipeableStream } from "react-server-dom-webpack/server";
import { createFromReadableStream } from "react-server-dom-webpack/client.edge";
import * as runtime from "@neuwo/web-ui-library--demo/jsx-runtime";
import * as devRuntime from "@neuwo/web-ui-library--demo/jsx-dev-runtime";
import { createRuntime } from "../../src/core/adapters/react.js";
import { formTemplates } from "./form-fields.js";
import { withinTemplates } from "./within.js";

/** @type {Record<string, string>} */
const blocks = JSON.parse(process.argv[2]);

const factoriesOf = (prod, dev) => ({
  jsx: (type, props, key) => (Array.isArray(props.children) ? prod.jsxs : prod.jsx)(type, props, key),
  jsxDEV: (type, props, key) => dev.jsxDEV(type, props, key, Array.isArray(props.children)),
});
const factories = factoriesOf(runtime, devRuntime);
const form = createRuntime(formTemplates, { markHost: false, server: true });
const formFactories = factoriesOf(form, form);
const within = createRuntime(withinTemplates, { markHost: false, server: true });
const withinFactories = factoriesOf(within, within);

function flight(element) {
  return new Promise((resolve, reject) => {
    const errors = [];
    let payload = "";
    const sink = new Writable({
      write(chunk, _encoding, done) {
        payload += chunk;
        done();
      },
    });
    sink.on("finish", () => resolve({ errors, payload }));
    sink.on("error", reject);
    renderToPipeableStream(element, {}, { onError: (error) => void errors.push(String(error?.message ?? error)) }).pipe(sink);
  });
}

const decode = (payload) => createFromReadableStream(new Response(payload).body, { serverConsumerManifest: { moduleMap: {}, moduleLoading: null } });

function render(create) {
  const Icon = () => create("svg", { className: "icon" });
  const Page = () =>
    create("main", {
      children: Object.keys(blocks).map((tag) => create(tag, { children: [create(Icon, { slot: "start" }), "Label"] }, tag)),
    });
  return flight(create(Page, {}));
}

function find(node, match) {
  if (Array.isArray(node)) return node.reduce((hit, child) => hit ?? find(child, match), null);
  if (!node || typeof node !== "object" || !("props" in node)) return null;
  return match(node) ? node : find(node.props.children, match);
}

function findAll(node, match, out = []) {
  if (Array.isArray(node)) node.forEach((child) => findAll(child, match, out));
  else if (node && typeof node === "object" && "props" in node) {
    if (match(node)) out.push(node);
    findAll(node.props.children, match, out);
  }
  return out;
}

function functionsIn(node, path = "", out = []) {
  if (typeof node === "function") out.push(path);
  else if (Array.isArray(node)) node.forEach((child, index) => functionsIn(child, `${path}[${index}]`, out));
  else if (node && typeof node === "object" && "props" in node) {
    for (const [name, value] of Object.entries(node.props)) functionsIn(value, `${path}/${node.type}.${name}`, out);
  }
  return out;
}

function componentsIn(payload) {
  const rows = [];
  for (const line of payload.split("\n")) {
    const json = line.slice(line.indexOf(":") + 1);
    if (!json.startsWith("{")) continue;
    const row = JSON.parse(json);
    if (row.env === "Server" && typeof row.name === "string" && row.props) rows.push([row.name, Object.keys(row.props)]);
  }
  return rows;
}

const found = {};
for (const [name, create] of Object.entries(factories)) {
  const { errors, payload } = await render(create);
  assert.deepEqual(errors, [], `${name}: the Flight render reported errors`);
  found[name] = Object.values(blocks).filter((block) => new RegExp(`"className":"${block}[ "]`).test(payload));
  assert.deepEqual(found[name], Object.values(blocks), `${name}: a root class is missing from the Flight payload`);
  const tree = await decode(payload);
  const start = find(tree, (el) => el.props.className === "neuwo-btn__start");
  const icons = [start?.props.children].flat().map((child) => `${child?.type}.${child?.props?.className}`);
  assert.deepEqual(icons, ["svg.icon"], `${name}: the slotted icon is not inside neuwo-btn__start`);
}

found.input = {};
for (const [name, create] of Object.entries(factories)) {
  const Page = () => create("main", { children: create("neuwo-input", { value: "a", name: "n" }) });
  const { errors, payload } = await flight(create(Page, {}));
  assert.deepEqual(errors, [], `${name}: the neuwo-input Flight render reported errors`);
  const tree = await decode(payload);
  found.input[name] = { control: find(tree, (el) => el.props.className === "neuwo-input")?.props, functions: functionsIn(tree) };
}

found.combobox = { payloads: [] };
for (const [name, create] of Object.entries(factories)) {
  const options = [create("option", { value: "fi", children: "Finland" }, "fi"), create("option", { value: "fr", children: "France" }, "fr")];
  const Page = () => create("main", { children: create("neuwo-combobox", { value: "fr", name: "country", placeholder: "Pick", children: options }) });
  const { errors, payload } = await flight(create(Page, {}));
  assert.deepEqual(errors, [], `${name}: the neuwo-combobox Flight render reported errors`);
  const tree = await decode(payload);
  const host = find(tree, (el) => el.type === "neuwo-combobox");
  found.combobox[name] = {
    hostValue: host?.props.value,
    formValue: find(tree, (el) => el.props.className === "neuwo-combobox__form-value")?.props,
    shown: find(tree, (el) => el.props.className === "neuwo-combobox__value")?.props.children,
    functions: functionsIn(tree),
  };
}
for (const placeholder of ["Pick", "Choose"]) {
  const options = [runtime.jsx("option", { value: "fi", children: "Finland" }, "fi"), runtime.jsx("option", { value: "fr", children: "France" }, "fr")];
  const Page = () => runtime.jsx("main", { children: runtime.jsxs("neuwo-combobox", { name: "country", placeholder, children: options }) });
  const { errors, payload } = await flight(runtime.jsx(Page, {}));
  assert.deepEqual(errors, [], "the neuwo-combobox Flight payload reported errors");
  found.combobox.payloads.push(payload);
}

found.form = {};
for (const [name, create] of Object.entries(formFactories)) {
  const Page = () => create("main", { children: [create("x-field", { value: "a", name: "q" }), create("x-notes", { value: "n" })] });
  const { errors, payload } = await flight(create(Page, {}));
  assert.deepEqual(errors, [], `${name}: the form Flight render reported errors`);
  const tree = await decode(payload);
  const props = (className) => find(tree, (el) => el.props.className === className)?.props;
  found.form[name] = { input: props("x-field__input"), textarea: props("x-notes__input"), functions: functionsIn(tree) };
}
found.within = {};
found.lent = {};
for (const [name, create] of Object.entries(withinFactories)) {
  const items = [create("x-item", { children: "Medium" }, "m"), create("x-item", { children: "Large" }, "l")];
  const Page = () => create("main", { children: [create("x-group", { name: "size", value: "m", children: items }), create("x-item", { children: "Alone" })] });
  const { errors, payload } = await flight(create(Page, {}));
  assert.deepEqual(errors, [], `${name}: the within Flight render reported errors`);
  const tree = await decode(payload);
  found.within[name] = {
    shown: findAll(tree, (el) => el.props.className === "x-item__group").map((el) => el.props.children),
    values: findAll(tree, (el) => el.props.className === "x-item").map((el) => el.props["data-value"] ?? null),
    leaked: findAll(tree, (el) => Object.keys(el.props).some((prop) => /within/i.test(prop))).length > 0,
    functions: functionsIn(tree),
  };
  found.lent[name] = { named: payload.includes("__neuwoWithin"), components: componentsIn(payload) };
}
found.radio = {};
for (const [name, create] of Object.entries(factories)) {
  const radios = [create("neuwo-radio", { value: "free", children: "Free" }, "free"), create("div", { children: create("neuwo-radio", { value: "pro", children: "Pro" }) }, "pro")];
  const Page = () =>
    create("main", {
      children: [
        create("neuwo-radio-group", { name: "plan", value: "pro", label: "Plan", children: radios }, "group"),
        create("neuwo-radio", { name: "solo", value: "x", checked: true, children: "Solo" }, "solo"),
      ],
    });
  const { errors, payload } = await flight(create(Page, {}));
  assert.deepEqual(errors, [], `${name}: the radio group Flight render reported errors`);
  const tree = await decode(payload);
  found.radio[name] = {
    inputs: findAll(tree, (el) => el.props.className === "neuwo-form-check__input").map((el) => el.props),
    hostValue: find(tree, (el) => el.type === "neuwo-radio-group")?.props.value ?? null,
    leaked: findAll(tree, (el) => Object.keys(el.props).some((prop) => /within/i.test(prop))).length > 0,
    functions: functionsIn(tree),
  };
}
found.fixed = {};
for (const [name, create] of Object.entries(factories)) {
  const Page = () =>
    create("main", {
      children: [
        create("neuwo-radio", { name: "plan", value: "pro", checked: true, children: "Pro" }, "radio"),
        create("neuwo-checkbox", { name: "terms", value: "yes", checked: true, children: "Yes" }, "checkbox"),
        create("neuwo-input", { name: "q", value: "typed" }, "input"),
      ],
    });
  const { errors, payload } = await flight(create(Page, {}));
  assert.deepEqual(errors, [], `${name}: the fixed-value Flight render reported errors`);
  const tree = await decode(payload);
  found.fixed[name] = Object.fromEntries(
    ["neuwo-radio", "neuwo-checkbox", "neuwo-input"].map((tag) => {
      const props = find(tree, (el) => el.type === tag)?.props;
      return [tag, [props?.value ?? null, props?.checked ?? null]];
    }),
  );
  found.fixed[name].components = componentsIn(payload).map(([component]) => component);
}
found.expanded = {};
for (const [name, create] of Object.entries(factories)) {
  const radios = [create("neuwo-radio", { value: "free", children: "Free" }, "free"), create("neuwo-radio", { value: "pro", children: "Pro" }, "pro")];
  const { errors, payload } = await flight(radios);
  assert.deepEqual(errors, [], `${name}: the radios' Flight render reported errors`);
  found.expanded[name] = payload;
}
found.segmented = {};
for (const [name, create] of Object.entries(factories)) {
  const options = [create("option", { value: "visual", children: "Visual" }, "visual"), create("option", { value: "json", children: "JSON" }, "json")];
  const Page = () => create("main", { children: create("neuwo-segmented", { value: "json", name: "view", label: "View", children: options }) });
  const { errors, payload } = await flight(create(Page, {}));
  assert.deepEqual(errors, [], `${name}: the neuwo-segmented Flight render reported errors`);
  const tree = await decode(payload);
  found.segmented[name] = {
    hostValue: find(tree, (el) => el.type === "neuwo-segmented")?.props.value ?? null,
    formValue: find(tree, (el) => el.props.className === "neuwo-segmented__form-value")?.props,
    options: findAll(tree, (el) => el.props.className === "neuwo-segmented__option").map((el) => [el.props["data-value"], el.props["aria-checked"], el.props.tabIndex]),
    indicator: find(tree, (el) => el.props.className === "neuwo-segmented__indicator")?.props,
    functions: functionsIn(tree),
  };
}
console.log(JSON.stringify(found));
