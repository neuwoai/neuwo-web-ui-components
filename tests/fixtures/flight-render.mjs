import assert from "node:assert/strict";
import { Writable } from "node:stream";
import { renderToPipeableStream } from "react-server-dom-webpack/server";
import * as runtime from "@neuwo/web-ui-library--demo/jsx-runtime";
import * as devRuntime from "@neuwo/web-ui-library--demo/jsx-dev-runtime";

/** @type {Record<string, string>} */
const blocks = JSON.parse(process.argv[2]);

const factories = {
  jsx: (type, props, key) => (Array.isArray(props.children) ? runtime.jsxs : runtime.jsx)(type, props, key),
  jsxDEV: (type, props, key) => devRuntime.jsxDEV(type, props, key, Array.isArray(props.children)),
};

function render(create) {
  const Icon = () => create("svg", { className: "icon" });
  const Page = () =>
    create("main", {
      children: Object.keys(blocks).map((tag) => create(tag, { children: [create(Icon, { slot: "start" }), "Label"] }, tag)),
    });
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
    renderToPipeableStream(create(Page, {}), {}, { onError: (error) => void errors.push(String(error?.message ?? error)) }).pipe(sink);
  });
}

const found = {};
for (const [name, create] of Object.entries(factories)) {
  const { errors, payload } = await render(create);
  assert.deepEqual(errors, [], `${name}: the Flight render reported errors`);
  found[name] = Object.values(blocks).filter((block) => new RegExp(`"className":"${block}[ "]`).test(payload));
  assert.deepEqual(found[name], Object.values(blocks), `${name}: a root class is missing from the Flight payload`);
}
console.log(JSON.stringify(found));
