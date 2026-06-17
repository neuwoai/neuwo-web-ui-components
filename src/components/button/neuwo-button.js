import { NeuwoElement } from "../../core/base-element.js";
import { sheet } from "../../core/sheet.js";
import buttonCss from "./button.css?raw";

export class NeuwoButton extends NeuwoElement {
  static styles = sheet(buttonCss);
  static observedAttributes = [
    "variant",
    "size",
    "wide",
    "xwide",
    "href",
    "disabled",
    "type",
    "target",
    "rel",
    "download",
  ];

  render() {
    const variant = this.getAttribute("variant") || "solid";
    const size = this.getAttribute("size");
    const href = this.getAttribute("href");
    const disabled = this.hasAttribute("disabled");
    const type = this.getAttribute("type") || "button";

    const classes = ["btn", `btn--${variant}`];
    if (size) classes.push(`btn--${size}`);
    if (this.hasAttribute("wide")) classes.push("btn--wide");
    if (this.hasAttribute("xwide")) classes.push("btn--xwide");

    // An anchor when navigable; a real button otherwise -- a disabled anchor
    // is not a thing, so disabled+href must stay a button to be inert.
    const asLink = href && !disabled;
    const el = document.createElement(asLink ? "a" : "button");
    el.className = classes.join(" ");
    el.setAttribute("part", "button"); // let host pages reach the control across the boundary
    if (asLink) {
      el.setAttribute("href", href);
      for (const attr of ["target", "rel", "download"]) {
        if (this.hasAttribute(attr)) el.setAttribute(attr, this.getAttribute(attr));
      }
    } else {
      el.type = type;
      el.disabled = disabled;
    }

    // Forward presentational / accessibility attributes to the rendered control.
    for (const { name, value } of this.attributes) {
      if (name === "title" || name.startsWith("aria-") || name.startsWith("data-")) {
        el.setAttribute(name, value);
      }
    }

    el.append(document.createElement("slot"));

    this.shadowRoot.replaceChildren(el);
  }
}

customElements.define("neuwo-button", NeuwoButton);
