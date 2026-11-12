import css from "neuwo:components-css";
import { resolveFontUrls } from "./core/fonts.js";
import { applyComponentsStylesheet } from "./core/stylesheet.js";

applyComponentsStylesheet(resolveFontUrls(css));
