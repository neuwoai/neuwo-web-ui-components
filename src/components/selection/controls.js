import { sheet } from "../../core/sheet.js";
import controlsCss from "./controls.css?raw";

// Built once, adopted by reference across every selection control.
export const controlsSheet = sheet(controlsCss);
