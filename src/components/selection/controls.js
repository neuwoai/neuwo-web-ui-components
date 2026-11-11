import { sheet } from "../../core/sheet.js";
import controlsCss from "./shadow-controls.css?raw";

// Built once, adopted by reference by <neuwo-segmented>.
export const controlsSheet = sheet(controlsCss);
