import { enableDatexBindings } from "../uix-dom/datex-bindings/mod.ts";
import { DOMContext } from "../uix-dom/dom/DOMContext.ts";

export const domContext = new DOMContext();
export const domUtils = enableDatexBindings(domContext)