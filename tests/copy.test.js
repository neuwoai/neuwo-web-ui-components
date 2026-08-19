import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/components/copy/neuwo-copy.js";

function make(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild;
}

const CODE = `<neuwo-copy>
  <pre><code>const topics = await neuwo.classify(url);</code></pre>
</neuwo-copy>`;

let writeText;

beforeEach(() => {
  writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("<neuwo-copy>", () => {
  it("registers the element", () => {
    expect(customElements.get("neuwo-copy")).toBeTruthy();
  });

  it("projects the wrapped content and exposes the control's part", () => {
    const el = make(CODE);
    expect(el.shadowRoot.querySelector("slot")).toBeTruthy();
    const button = el.shadowRoot.querySelector("button.copy");
    expect(button.getAttribute("part")).toBe("button");
    expect(button.type).toBe("button");
  });

  // Reading and tab order follow the visual order, so the control comes after
  // the content it acts on.
  it("puts the slot before the control", () => {
    const el = make(CODE);
    const nodes = [...el.shadowRoot.children];
    expect(nodes[0].tagName.toLowerCase()).toBe("slot");
    expect(nodes[1]).toBe(el.shadowRoot.querySelector("button.copy"));
  });

  it("announces the outcome through a polite live region, not by relabelling", () => {
    const el = make(CODE);
    const status = el.shadowRoot.querySelector(".copy__status");
    expect(status.getAttribute("role")).toBe("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.getAttribute("part")).toBe("status");
  });

  // The trim is what makes indented markup safe: the newline and spaces around
  // the nested <pre> are the author's formatting, not part of the sample.
  it("copies the wrapped text, trimmed of the markup's own whitespace", async () => {
    const el = make(CODE);
    await el.copy();
    expect(writeText).toHaveBeenCalledWith("const topics = await neuwo.classify(url);");
  });

  it("copies on click", async () => {
    const el = make(CODE);
    el.shadowRoot.querySelector("button.copy").click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledOnce());
  });

  it("confirms with the tick, then resets itself", async () => {
    const el = make(CODE);
    const button = el.shadowRoot.querySelector("button.copy");
    const status = el.shadowRoot.querySelector(".copy__status");

    await el.copy();
    expect(button.classList.contains("copy--done")).toBe(true);
    expect(status.textContent).toBe("Copied");

    vi.runAllTimers();
    expect(button.classList.contains("copy--done")).toBe(false);
    expect(status.textContent).toBe("");
  });

  it("reports a refused clipboard without claiming success", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    const el = make(CODE);
    const onCopied = vi.fn();
    el.addEventListener("copied", onCopied);

    expect(await el.copy()).toBe(false);
    expect(el.shadowRoot.querySelector(".copy__status").textContent).toBe("Copying failed");
    expect(el.shadowRoot.querySelector("button.copy").classList.contains("copy--done")).toBe(false);
    expect(onCopied).not.toHaveBeenCalled();
  });

  it("fires copied with the written text, composed so it escapes the shadow root", async () => {
    const el = make(CODE);
    const onCopied = vi.fn();
    el.addEventListener("copied", onCopied);

    expect(await el.copy()).toBe(true);
    expect(onCopied).toHaveBeenCalledOnce();
    const event = onCopied.mock.calls[0][0];
    expect(event.detail.text).toBe("const topics = await neuwo.classify(url);");
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
  });

  it("names the control, and takes the consumer's language for every string", () => {
    expect(
      make(CODE).shadowRoot.querySelector("button.copy").getAttribute("aria-label")
    ).toBe("Copy");

    const el = make(
      `<neuwo-copy label="Kopioi" copied-label="Kopioitu" failed-label="Kopiointi ei onnistunut"><pre>x</pre></neuwo-copy>`
    );
    expect(el.shadowRoot.querySelector("button.copy").getAttribute("aria-label")).toBe("Kopioi");
    expect(el.copiedLabel).toBe("Kopioitu");
    expect(el.failedLabel).toBe("Kopiointi ei onnistunut");
  });

  it("reflects each label property to its attribute", () => {
    const el = make(`<neuwo-copy><pre>x</pre></neuwo-copy>`);
    el.label = "Kopioi";
    expect(el.getAttribute("label")).toBe("Kopioi");
    el.copiedLabel = "Kopioitu";
    expect(el.getAttribute("copied-label")).toBe("Kopioitu");
    el.failedLabel = "Ei onnistunut";
    expect(el.getAttribute("failed-label")).toBe("Ei onnistunut");

    el.label = "";
    expect(el.hasAttribute("label")).toBe(false);
    expect(el.label).toBe("Copy");
  });

  // Relabelling patches the existing control rather than rebuilding it, so a
  // label change cannot drop focus or interrupt the tick mid-confirmation.
  it("keeps the same control across a label change", async () => {
    const el = make(CODE);
    const button = el.shadowRoot.querySelector("button.copy");
    await el.copy();
    el.label = "Kopioi";
    expect(el.shadowRoot.querySelector("button.copy")).toBe(button);
    expect(button.getAttribute("aria-label")).toBe("Kopioi");
    expect(button.classList.contains("copy--done")).toBe(true);
  });

  it("stops its reset timer when removed", async () => {
    const el = make(CODE);
    await el.copy();
    el.remove();
    expect(() => vi.runAllTimers()).not.toThrow();
  });
});

// An insecure context leaves navigator.clipboard undefined. A button that
// silently fails is worse than no button, but the wrapped content must still
// appear, so only the control is withheld.
describe("<neuwo-copy> without a clipboard", () => {
  let clipboard;

  beforeEach(() => {
    clipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", { value: clipboard, configurable: true });
  });

  it("still projects the content, but renders no control", () => {
    const el = make(CODE);
    expect(el.shadowRoot.querySelector("slot")).toBeTruthy();
    expect(el.shadowRoot.querySelector("button.copy")).toBeNull();
    expect(el.shadowRoot.querySelector(".copy__status")).toBeNull();
  });

  it("reports failure from a programmatic copy instead of throwing", async () => {
    const el = make(CODE);
    await expect(el.copy()).resolves.toBe(false);
  });
});
