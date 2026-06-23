import { sheet } from "../../core/sheet.js";
import formCheckCss from "./form-check.css?raw";

// Built once, adopted by reference by <neuwo-checkbox> and <neuwo-radio>.
export const formCheckSheet = sheet(formCheckCss);
