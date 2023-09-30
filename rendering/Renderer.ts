import { clearScreen } from "https://deno.land/x/ansi@1.0.1/clear.ts";
import { ContentBox } from "./ContentBox.ts";
import { InputHandler, KeyDownEvent } from "./input/InputHandler.ts";
import { clearTerminal, cursorTo, link } from "https://deno.land/x/ansi@1.0.1/mod.ts";
import { ESC } from "https://deno.land/x/ansi@1.0.1/constants.ts";
import { cursorHide } from "https://deno.land/x/ansi@1.0.1/cursor.ts";
import { hideCursor } from "https://denopkg.com/iamnathanj/cursor@v2.2.0/mod.ts";


export type RendererOptions = {
	fullscreen?: boolean
}

enum RenderMode {
	DEFAULT,
	DIRTY_CHARS
}

export class Renderer {

	private inputHandler?: InputHandler

	private allowDebugging = true;
	private freeze = false;
	private debugMode = false;
	private renderMode = RenderMode.DEFAULT;
	private get offsetTop() {
		return this.debugMode ? 5 : 0;
	}

	constructor(protected output: typeof Deno.stdout, protected input?: typeof Deno.stdin, protected options: RendererOptions = {}) {
		if (this.options.fullscreen == undefined) this.options.fullscreen = true;
		if (this.input) this.inputHandler = new InputHandler(this.input)
	}

	private sigwinchListener = () => {
		this.renderAll()
	}

	private keyDownListener = (e:KeyDownEvent) => {

		if (this.allowDebugging) {
			// ctrl+d
			if (e.data.key == "d" && e.data.ctrlKey) {
				this.debugMode = !this.debugMode
			}
			if (this.debugMode) {
				// ctrl+d
				if (e.data.key == "r" && e.data.ctrlKey) {
					this.renderMode = (this.renderMode+1) % 2;
				}
				// ctrl+space
				else if (e.data.keyCode == 0 && e.data.ctrlKey) {
					this.freeze = !this.freeze;
				}
			}
			
		}
		// console.log("key down",e)
	}

	frame = 0;

	root?: ContentBox;

	start() {
		this.enableListeners();
		hideCursor();
		this.renderAll();
	}

	stop() {
		this.disableListeners()
	}

	enableListeners() {
		this.inputHandler?.listen();
		Deno.addSignalListener("SIGWINCH", this.sigwinchListener);
		this.inputHandler?.addEventListener("keydown", this.keyDownListener)
	}

	disableListeners() {
		this.inputHandler?.stopListen();

		Deno.removeSignalListener("SIGWINCH", this.sigwinchListener);
		this.inputHandler?.removeEventListener("keydown", this.keyDownListener)
	}

	renderAll() {
		if (!this.root) throw new Error("Cannot render, not root set");
		if (this.freeze) return;
		this.frame++;
		if (this.options.fullscreen) {
			// clearTerminal()
			// clearScreen()
			console.log("\x1b[2J");
			console.log("\x1bc");
		}
		if (this.debugMode) {
			console.log("URMEL beta [Frame #"+this.frame+"]")
			console.log("  [CTRL+D] Exit debug mode   [CTRL+R] Switch render mode")
			console.log("  [CTRL+SPACE] Pause/continue rendering")
			console.log("")
		}

		if (this.renderMode == RenderMode.DIRTY_CHARS) {
			this.renderContentBoxDirtyChars(this.root);
		}
		else {
			this.renderContentBox(this.root);
		}

	}

	renderContentBox(box: ContentBox) {
		const dirtyChars = box.getBubbledDirtyChars();
		for (const [y,x,dirty] of dirtyChars) {
			if (!dirty) continue;
			else {
				const char = box.getDirtyCharAt(y, x);
				// if (char) {
					console.log(y,x,char?.value)
					// this.write(ESC + (1) + ";" + (x + 1) + "H"+"O")
					// cursorTo(x, y);
					this.write(ESC + (y + this.offsetTop + 1) + ";" + (x + 1) + "H")
					this.write(char?.value??"?")
				// }
			}
		}
	}

	write(text:string) {
		this.output.write(new TextEncoder().encode(text))
	}

	renderContentBoxDirtyChars(box: ContentBox) {
		const dirtyChars = box.getBubbledDirtyChars();
		console.log(dirtyChars.toString())
	}



	log() {

	}

	setRoot(root: ContentBox) {
		this.root = root;
	}

	static getDefaultRenderer() {
		return new Renderer(Deno.stdout, Deno.stdin)
	}
}