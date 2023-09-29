import { Datex } from "datex-core-js-legacy";

import { DocumentFragment } from "../dom/DocumentFragment.ts";
import { Element } from "../dom/Element.ts";
import { HTMLElement } from "../dom/HTMLElement.ts";
import { ShadowRoot } from "../dom/ShadowRoot.ts";
import { getCallerFile } from "datex-core-js-legacy/utils/caller_metadata.ts";
import { HTMLElementTagNameMap, SVGElementTagNameMap } from "../dom/types.ts";
import { validHTMLElementSpecificAttrs, validHTMLElementAttrs, validSVGElementSpecificAttrs } from "../dom/attributes.ts";
import { HTMLUtils } from "../utils/HTMLUtils.ts";
import { document } from "../dom/Document.ts"

const logger = new Datex.Logger("URMEL-JSX");

export const SET_DEFAULT_ATTRIBUTES: unique symbol = Symbol("SET_DEFAULT_ATTRIBUTES");
export const SET_DEFAULT_CHILDREN: unique symbol = Symbol("SET_DEFAULT_CHILDREN");

export const JSX_INSERT_STRING: unique symbol = Symbol("JSX_INSERT_STRING");

export function escapeString(string:string) {
	return {[JSX_INSERT_STRING]:true, val:string};
}

export function jsx (type: string | any, config: Record<string,any>): Element {

	let element:Element;
	if ('children' in config && !(config.children instanceof Array)) config.children = [config.children];
	let { children = [], ...props } = config

	// _debug property to debug jsx
	if (props._debug) {
		delete props._debug;
		console.log(type,children,props,config)
	}

	for (let i=0; i<children.length; i++) {
		const child = children[i];
		if (typeof child == "string" && child.match(embeddedDatexStart)) {
			children = extractEmbeddedDatex(children, i);
		}
	}

	let set_default_children = true;
	let set_default_attributes = true;
	let allow_invalid_attributes = true;

	let shadow_root = false;
	if (props['shadow-root']) {
		shadow_root = props['shadow-root']==true?'open':props['shadow-root'];
		delete props['shadow-root'];
	}

	// replace ShadowRoot with shadow-root
	if (type === ShadowRoot) type = "shadow-root";
	
	if (typeof type === 'function') {

		// class component
		if (HTMLElement.isPrototypeOf(type) || type === DocumentFragment || DocumentFragment.isPrototypeOf(type)) {
			set_default_children = (type as any)[SET_DEFAULT_CHILDREN] ?? true;
			set_default_attributes = (type as any)[SET_DEFAULT_ATTRIBUTES] ?? true;
			if (set_default_children) delete config.children;

			element = new type(props) // uix component
		}
		// function component
		else {
			set_default_children = (type as any)[SET_DEFAULT_CHILDREN];
			set_default_attributes = (type as any)[SET_DEFAULT_ATTRIBUTES];
			if (set_default_children) delete config.children;

			element = type(config) 
		}
	}


	else {
		allow_invalid_attributes = false;
		
		// convert shadow-root to template
		if (type == "shadow-root") {
			type = "template"
			props.shadowrootmode = props.mode ?? "open";
			delete props.mode
		}
		
		element = HTMLUtils.createElement(type);
	}

	if (set_default_attributes) {
		let module = (<Record<string,any>>props)['module'] ?? (<Record<string,any>>props)['uix-module'];
		// ignore module of is explicitly module===null, otherwise fallback to getCallerFile
		// TODO: optimize don't call getCallerFile for each nested jsx element, pass on from parent?
		if (module === undefined) {
			module = getCallerFile();
		}
		
		for (const [attr,val] of Object.entries(props)) {
			if (attr == "style" && (element as HTMLElement).style) HTMLUtils.setCSS(element as HTMLElement, <any> val);
			else {
				const valid_attr = HTMLUtils.setElementAttribute(element, attr, <any>val, module);
				if (!allow_invalid_attributes && !valid_attr) logger.warn(`Element attribute "${attr}" is not allowed for <${element.tagName.toLowerCase()}>`)
			}
		}
	}

	if (set_default_children) {
		if (shadow_root) {
			const template = jsx("template", {children, shadowrootmode:shadow_root});
			HTMLUtils.appendDynamic(element, template);
		}
		else {
			HTMLUtils.appendDynamic(element, children);
		}
		
	}

	// !important, cannot return directly because of stack problems, store in ptr variable first
	const ptr = $$(element);
	return ptr;
}

export function Fragment({children}:{children:Element[]}) {
	const fragment = new DocumentFragment();
	HTMLUtils.appendNew(fragment, children);
	// @ts-ignore remember uix children array
	if (Datex.Pointer.isReference(children)) fragment._uix_children = children;
	return fragment;
}
 

const embeddedDatexStart = /\#\(/;
const embeddedDatexEnd = /\)/;

function extractEmbeddedDatex(children:any[], startIndex = 0) {
	logger.warn("DATEX injections with #(...) are experimental")

	const newChildren = children.slice(0, startIndex);

	let [start, dx] = (children[startIndex] as string).split(embeddedDatexStart);
	newChildren.push(start);

	const dxData = [];
	let currentIndex = startIndex+1;
	for (currentIndex; currentIndex < children.length; currentIndex++) {
		const child = children[currentIndex];
		if (typeof child == "string") {
			if (child.match(embeddedDatexEnd)) {
				const [dxEnd, end] = child.split(embeddedDatexEnd);
				children[currentIndex] = end;
				dx += dxEnd;
				break;
			}
			else dx += child;
		}
		else {
			dx += Datex.INSERT_MARK;
			// safely injected string
			dxData.push(child?.[JSX_INSERT_STRING] ? child.val : child);
		}
	}
	const placeholder = document.createElement("div");
	newChildren.push(placeholder)
	newChildren.push(...children.slice(currentIndex));

	// TODO: DATEX spec, always create a new 'always' pointer if two pointers are added, multiplied, ...?
	dx = `always(${dx})`;

	logger.debug("DATEX injected in JSX:",dx,dxData);

	// execute datex and set result as html content
	datex(dx, dxData).then(res=>{
		placeholder.replaceWith(UIX.HTMLUtils.valuesToDOMElement(res))
	});

	return newChildren;
}


// jsx.Fragment = jsxFragment
// jsx.TextNode = jsxTextNode
// jsx.customAttributes = ['children', 'key', 'props']

// TODO: handle separate
export const jsxs = jsx;

// @ts-ignore global jsx (required to work in standalone mode)
globalThis._jsx = jsx;

type DomElement = Element

declare global {
	namespace JSX {
		// JSX node definition
		type Element = DomElement

		// type ElementClass = typeof Element

		type Fragment = number;

		// Property that will hold the HTML attributes of the Component
		interface ElementAttributesProperty {
			props: Record<string,string>;
		}

		// Property in 'props' that will hold the children of the Component
		interface ElementChildrenAttribute {
			children: Element[]|Element
		}

		type singleChild = Datex.RefOrValue<Element|DocumentFragment|string|number|boolean|bigint|null|undefined>;
		type singleOrMultipleChildren = singleChild|singleChild[]|Map<number, singleChild>;
		type childrenOrChildrenPromise = singleOrMultipleChildren|Promise<singleOrMultipleChildren>
		// enable as workaround to allow {...[elements]} type checking to work correctly
		// type childrenOrChildrenPromise = _childrenOrChildrenPromise|_childrenOrChildrenPromise[]

		type htmlAttrs<T extends Record<string,unknown>, allowPromises extends boolean = false> = DatexValueObject<Omit<Partial<T>, 'children'|'style'>, allowPromises>

		// Common attributes of the standard HTML elements and JSX components
		type IntrinsicAttributes = {
			style?: Datex.RefOrValue<string|Record<string,Datex.RefOrValue<string|number|undefined>>>,
		} & htmlAttrs<validHTMLElementAttrs>

		// Common attributes of the UIX components only
		interface IntrinsicClassAttributes<C extends UIXComponent> {}

		type DatexValueObject<T extends Record<string|symbol,unknown>, allowPromises extends boolean = false> = {
			[key in keyof T]: T[key] extends (...args:any)=>any ? T[key] : Datex.RefOrValue<T[key]>|(allowPromises extends true ? Promise<Datex.RefOrValue<T[key]>> : never)
		}
		
		type IntrinsicElements = 
		// html elements
		{
			readonly [key in keyof HTMLElementTagNameMap]: IntrinsicAttributes & {children?: childrenOrChildrenPromise|childrenOrChildrenPromise[]} & htmlAttrs<validHTMLElementSpecificAttrs<key>, true>
		} 
		// svg elements
		& {
			readonly [key in keyof SVGElementTagNameMap]: IntrinsicAttributes & {children?: childrenOrChildrenPromise|childrenOrChildrenPromise[]} & htmlAttrs<validSVGElementSpecificAttrs<key>, true>
		} 
		// other custom elements
		& {
			'shadow-root': {children?: childrenOrChildrenPromise|childrenOrChildrenPromise[]} & {[key in keyof IntrinsicAttributes]: never} & {mode?:'open'|'closed'}
			'light-root': {children?: childrenOrChildrenPromise|childrenOrChildrenPromise[]} & {[key in keyof IntrinsicAttributes]: never}
		}
	}
  }
