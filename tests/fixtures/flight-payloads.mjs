import { Writable } from "node:stream";
import { renderToPipeableStream } from "react-server-dom-webpack/server";
import { jsx, jsxs } from "@neuwo/web-ui-library--demo/jsx-runtime";

/** @type {{ props: Record<string, unknown>, icon: "plus" | "check" }[]} */
const steps = JSON.parse(process.argv[2]);

const Plus = () => jsx("svg", { className: "icon-plus" });
const Check = () => jsx("svg", { className: "icon-check" });

function encode({ props, icon }) {
  const Page = () => jsx("main", { children: jsxs("neuwo-button", { ...props, children: [jsx(icon === "check" ? Check : Plus, { slot: "start" }), "Save"] }) });
  return new Promise((resolve, reject) => {
    const errors = [];
    let payload = "";
    const sink = new Writable({
      write(chunk, _encoding, done) {
        payload += chunk;
        done();
      },
    });
    sink.on("finish", () => (errors.length ? reject(new Error(errors.join("\n"))) : resolve(payload)));
    sink.on("error", reject);
    renderToPipeableStream(jsx(Page, {}), {}, { onError: (error) => void errors.push(String(error?.message ?? error)) }).pipe(sink);
  });
}

const payloads = [];
for (const step of steps) payloads.push(await encode(step));
console.log(JSON.stringify(payloads));
