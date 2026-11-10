import css from "neuwo:components-css";
import { resolveFontUrls } from "./core/fonts.js";
import { applyComponentsStylesheet } from "./core/stylesheet.js";

export * from "./index.js";

applyComponentsStylesheet(resolveFontUrls(css));
