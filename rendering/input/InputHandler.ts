// deno-lint-ignore-file no-control-regex
import { decodeKeypress, Keypress } from "https://deno.land/x/keypress@0.0.11/mod.ts";
import { CTRLSEQ } from "../control-sequences.ts";
import { ControlSequenceData, parseControlSequence } from "./parse-control-sequences.ts";
import { onExit } from "../exit-handling.ts";

export class KeyEvent extends Event {
	declare type: "keydown"

	constructor(type: "keydown", public data:Keypress) {
        super(type);
    }
}

export class MouseEvent extends Event {
	declare type: "mousedown"|"mouseup"|"mousemove"

    constructor(type: "mousedown"|"mouseup"|"mousemove", public data:{row:number, col:number}) {
        super(type);
    }
}


export class MouseWheelEvent extends Event {
    constructor(type: "wheel", public data:{row:number, col:number, delta:number}) {
        super(type);
    }
}

export class InputHandler extends EventTarget {

	constructor(private output: typeof Deno.stdout, private input: typeof Deno.stdin, private log?:(...data:unknown[])=>void) {
		super()
	}

	#listening = false;
	#textEncoder = new TextEncoder()
	#textDecoder = new TextDecoder()

	listen() {
		this.#listening = true;
		this.#listenForInput()
	}

	cursorPositionHandler?: (row: number, col:number) => void


	async #listenForInput() {
		this.#writeText(
			CTRLSEQ.ENABLE_MOUSE_TRACKING
			+ CTRLSEQ.ENABLE_MOUSE_TRACKING_DECIMAL_1
			+ CTRLSEQ.ENABLE_MOUSE_TRACKING_DECIMAL_2
			+ CTRLSEQ.ENABLE_MOUSE_TRACKING_EXTENDED
		);
		onExit(()=>this.#writeText(CTRLSEQ.DISABLE_MOUSE_TRACKING));

		this.input.setRaw(true, {cbreak: false});
		onExit(()=>this.input.setRaw(false));

		for await (const input of this.input.readable) {
			try {

				const text = this.#textDecoder.decode(input);
				// ctrl+c
				if (text.match(/\x03/g)) {
					Deno.exit(0)
				}

				const [data, pre, suf] = parseControlSequence(text);

				if (data) {
					// mouse events
					if (data.prefix == "<" && data.suffix?.toLowerCase() == "m") 
						this.#handleMouseEvent(data as ControlSequenceData<"<">)

					// return requested cursor pos
					if (data.suffix == "R") 
						this.cursorPositionHandler?.(data.args[0], data.args[1])
				}
				
				

				// key presses
				if (suf) {
					const keyEventData = decodeKeypress(input);
					for (const data of keyEventData) {
						this.dispatchEvent(new KeyEvent("keydown", data))
					}
				}

				
			}
			catch (e) {
				console.error(e)
			}
		}
		
	}

	#handleMouseEvent(data: ControlSequenceData<"<">) {
		// move
		if (data.suffix == "M" && (data.args[0] == 35 || data.args[0] == 32)) {
			this.dispatchEvent(new MouseEvent("mousemove", {
				row: data.args[2],
				col: data.args[1]
			}))
		}
		// wheel up
		else if (data.suffix == "M" && data.args[0] == 64) {
			this.dispatchEvent(new MouseWheelEvent("wheel", {
				delta: 1,
				row: data.args[2],
				col: data.args[1]
			}))
		}
		else if (data.suffix == "M" && data.args[0] == 65) {
			this.dispatchEvent(new MouseWheelEvent("wheel", {
				delta: -1,
				row: data.args[2],
				col: data.args[1]
			}))
		}

		// down
		else if (data.suffix == "M") {
			this.dispatchEvent(new MouseEvent("mousedown", {
				row: data.args[2],
				col: data.args[1]
			}))
		}
		// up
		else if (data?.prefix == "<" && data?.suffix == "m") {
			this.dispatchEvent(new MouseEvent("mouseup", {
				row: data.args[2],
				col: data.args[1]
			}))
		}
	}
	
	
	#writeText(text: string) {
		this.output.writeSync(this.#textEncoder.encode(text))
	}

	stopListen() {
		this.#listening = false;
	}


}

declare interface InputHandlerEvent {
	"mousedown": MouseEvent;
	"mouseup": MouseEvent;
	"mousemove": MouseEvent;
	"keydown": KeyEvent;
	"wheel": MouseWheelEvent;
 }

export interface InputHandler {
	addEventListener<
		K extends keyof InputHandlerEvent,
	>(
		type: K,
		listener: (this: Window, ev: InputHandlerEvent[K]) => any,
		options?: boolean | AddEventListenerOptions,
	): void;

	removeEventListener<
		K extends keyof InputHandlerEvent,
	>(
		type: K,
		listener: (this: Window, ev: InputHandlerEvent[K]) => any,
	): void;
}