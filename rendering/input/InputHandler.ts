import { Keypress, readKeypress } from "https://deno.land/x/keypress@0.0.11/mod.ts";


export class KeyDownEvent extends Event {
	data: Keypress
    constructor(data:Keypress) {
        super("keydown");
        this.data = data;
    }
}

export class InputHandler extends EventTarget {

	constructor(private input: typeof Deno.stdin) {
		super()
	}

	#listening = false;
	
	async listen() {
		this.#listening = true;
		for await (const keypress of readKeypress()) {
			if (!this.#listening) return;
			this.dispatchEvent(new KeyDownEvent(keypress));
		
			if (keypress.ctrlKey && keypress.key === 'c') {
				Deno.exit(0);
			}
		}
	}

	stopListen() {
		this.#listening = false;
	}

	declare addEventListener:(
		type: "keydown",
		listener: (this: InputHandler, ev: KeyDownEvent) => any,
		options?: boolean | AddEventListenerOptions,
	) => void;

	declare removeEventListener:(
		type: "keydown",
		listener: (this: InputHandler, ev: KeyDownEvent) => any,
		options?: boolean | AddEventListenerOptions,
	) => void;
}