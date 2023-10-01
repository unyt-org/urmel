Deno.addSignalListener("SIGINT", ()=>Deno.exit(1));
Deno.addSignalListener("SIGTERM", ()=>Deno.exit(1));

export function onExit(handler:()=>void) {
	globalThis.addEventListener("unload", handler)
	// globalThis.addEventListener("unhandledrejection", handler)
}