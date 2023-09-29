import { domUtils } from "../app/context.ts";
import { enableJSX } from "../uix-dom/jsx/mod.ts";
import * as denoDomContext from "../uix-dom/dom/mod.ts";

const {jsx:_jsx, jsxs:_jsxs, Fragment:_Fragment} = enableJSX(denoDomContext, domUtils);

export const jsx = _jsx;
export const jsxs = _jsxs;
export const Fragment = _Fragment;