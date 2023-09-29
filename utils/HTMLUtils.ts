import { Datex } from "datex-core-js-legacy"
import { Element } from "../dom/Element.ts";
import { HTMLElement } from "../dom/HTMLElement.ts";
import { document } from "../dom/Document.ts";
import { HTMLElementTagNameMap } from "../dom/types.ts";
import { JSX_INSERT_STRING } from "../jsx-runtime/jsx.ts";
import { defaultElementAttributes, elementEventHandlerAttributes, htmlElementAttributes, svgElementAttributes } from "uix/html/attributes.ts";
import { HTMLVideoElement } from "../dom/HTMLVideElement.ts";

export class HTMLUtils {
	static createElement(tagName:keyof HTMLElementTagNameMap): HTMLElement {
        return document.createElement(tagName);
    }

	static setElementAttribute<T extends Element>(element:T, attr:string, value:Datex.RefOrValue<unknown>|((...args:unknown[])=>unknown)|{[JSX_INSERT_STRING]:true, val:string}, rootPath?:string|URL):boolean|Promise<boolean> {
        value = value?.[JSX_INSERT_STRING] ? value.val : value; // collapse safely injected strings

        // first await, if value is promise
        if (value instanceof Promise) return value.then(v=>this.setElementAttribute(element, attr, v, rootPath))

        if (!element) return false;
        // DatexValue
        value = Datex.Pointer.pointerifyValue(value)
        if (value instanceof Datex.Ref) {

            const isInputElement = element.tagName.toLowerCase() === "input";
            const type = Datex.Type.ofValue(value);

            // :out attributes
            if (isInputElement && (attr == "value:out" || attr == "value")) {

                if (type.matchesType(Datex.Type.std.text)) element.addEventListener('change', () => value.val = element.value)
                else if (type.matchesType(Datex.Type.std.decimal)) element.addEventListener('change', () => value.val = Number(element.value))
                else if (type.matchesType(Datex.Type.std.integer)) element.addEventListener('change', () => value.val = BigInt(element.value))
                else if (type.matchesType(Datex.Type.std.boolean)) element.addEventListener('change', () => value.val = Boolean(element.value))
                else throw new Error("The type "+type+" is not supported for the '"+attr+"' attribute of the <input> element");

                // TODO: allow duplex updates for "value"
                if (attr == "value") this.setAttribute(element, attr, value.val, rootPath)

                return true;
            }

            // checked attribute
            if (isInputElement && element.getAttribute("type") === "checkbox" && attr == "checked") {
                if (!(element instanceof HTMLInputElement)) throw new Error("the 'checked' attribute is only supported for <input> elements");

                if (type.matchesType(Datex.Type.std.boolean)) element.addEventListener('change', () => value.val = element.checked)
                else throw new Error("The type "+type+" is not supported for the 'checked' attribute of the <input> element");
            }

            // default attributes

            const valid = this.setAttribute(element, attr, value.val, rootPath)
            if (valid) value.observe(v => this.setAttribute(element, attr, v, rootPath));
            return valid;
        }
        // default
        else return this.setAttribute(element, attr, value, rootPath)
    }

	static setAttribute(element: Element, attr:string, val:unknown, root_path?:string|URL) {

        // non-module-relative paths if :route suffix
        if (attr.endsWith(":route")) {
            attr = attr.replace(":route", "");
            root_path = undefined;
        }

        // not an HTML attribute
        if (!(
            attr.startsWith("data-") ||
            attr.startsWith("aria-") ||
            defaultElementAttributes.includes(<typeof defaultElementAttributes[number]>attr) || 
            elementEventHandlerAttributes.includes(<typeof elementEventHandlerAttributes[number]>attr) ||
            (<readonly string[]>htmlElementAttributes[<keyof typeof htmlElementAttributes>element.tagName.toLowerCase()])?.includes(<typeof htmlElementAttributes[keyof typeof htmlElementAttributes][number]>attr) ||
            (<readonly string[]>svgElementAttributes[<keyof typeof svgElementAttributes>element.tagName.toLowerCase()])?.includes(<typeof svgElementAttributes[keyof typeof svgElementAttributes][number]>attr) )) {
                // TODO: remove deprecated module
                if (attr!="module")
                    return false;
                // try {
                // 	element[property] = Datex.Value.collapseValue(val, true, true);
                // }
                // catch(e) {
                // 	// console.log(e,element,property)
                // 	console.error("could not set attribute '" + property + "' for " + element.constructor.name);
                // }
        }

        // invalid :out attributes here
        else if (attr.endsWith(":out")) throw new Error("Invalid value for "+attr+" attribute - must be a pointer");

        // special attribute values
        else if (val === false) element.removeAttribute(attr);
        else if (val === true || val === undefined) element.setAttribute(attr,"");

        // video src => srcObject
        else if (element instanceof HTMLVideoElement && attr === "src" && globalThis.MediaStream && val instanceof MediaStream) {
            element.srcObject = val;
        }

        // event listener
        else if (attr.startsWith("on")) {
            for (const handler of ((val instanceof Array || val instanceof Set) ? val : [val])) {
                if (typeof handler == "function") {
                    const eventName = <keyof HTMLElementEventMap>attr.replace("on","").toLowerCase();
                    element.addEventListener(eventName, <any>handler);
                    // save in [EVENT_LISTENERS]
                    if (!(<elWithEventListeners>element)[EVENT_LISTENERS]) (<elWithEventListeners>element)[EVENT_LISTENERS] = new Map<keyof HTMLElementEventMap, Set<Function>>().setAutoDefault(Set);
                    (<elWithEventListeners>element)[EVENT_LISTENERS].getAuto(eventName).add(handler);
                }
                else throw new Error("Cannot set event listener for element attribute '"+attr+"'")
            }
            
        }
        // special form 'action' callback
        else if (element instanceof HTMLFormElement && attr === "action") {
            for (const handler of ((val instanceof Array || val instanceof Set) ? val : [val])) {
                // action callback function
                if (typeof handler == "function") {
                    const eventName = "submit";
                    element.addEventListener(eventName, <any>handler);
                    // save in [EVENT_LISTENERS]
                    if (!(<elWithEventListeners>element)[EVENT_LISTENERS]) (<elWithEventListeners>element)[EVENT_LISTENERS] = new Map<keyof HTMLElementEventMap, Set<Function>>().setAutoDefault(Set);
                    (<elWithEventListeners>element)[EVENT_LISTENERS].getAuto(eventName).add(handler);
                }
                // default "action" (path)
                else element.setAttribute(attr, formatAttributeValue(val,root_path));
            }
            
        }

        // normal attribute
        else element.setAttribute(attr, formatAttributeValue(val,root_path));

        return true;
    }
}