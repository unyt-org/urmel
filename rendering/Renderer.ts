import { Char, ContentBox } from "./ContentBox.ts";
import { InputHandler, KeyEvent, MouseEvent } from "./input/InputHandler.ts";
import { ESC } from "https://deno.land/x/ansi@1.0.1/constants.ts";
import { CSI, CTRLSEQ } from "./control-sequences.ts";
import { onExit } from "./exit-handling.ts";
import { Window } from "./Window.ts";
import { fitText } from "./fitText.ts";
import { CommandLineOptions } from "https://cdn.unyt.org/command-line-args/main.ts"
import { getColorControlSequence } from "./color-codes.ts";

const options = new CommandLineOptions("URMEL Renderer", "HTML Renderer for text-based terminals");
// declare options and get their values
const debugDefault = options.option("debug", {type: "boolean", default: false, description:"Enable debug mode on startup", aliases: ["d"]})


export type RendererOptions = {
	fullscreen?: boolean,
	alternateWindowBuffer?: boolean
}

enum RenderMode {
	DEFAULT,
	DIRTY_CHARS
}

export class Renderer {

	private inputHandler?: InputHandler

	frame = 0;
	frameTransmissionSize = 0;

	root?: ContentBox;

	private rendering = false;
	private logBuffer:unknown[][] = []
	private allowDebugging = true;
	private freeze = false;
	private debugMode = false;
	private renderMode = RenderMode.DEFAULT;
	#logsHeight = 8;
	private movingLogsWindow = false;
	#window: Window

	private mouseData: {
		row: number,
		col: number,
		pressed: boolean
	} | null = null

	private get logsHeight() {return this.#logsHeight}
	private set logsHeight(height: number) {
		this.#logsHeight = height;
		this.chromeMargins.bottom = this.#logsHeight;
	}

	private get windowMouseData() {
		if (!this.mouseData) return null;
		return {
			row: this.mouseData.row - this.windowOffsetTop,
			col: this.mouseData.col - this.windowOffsetLeft
		}
	}

	get window() {return this.#window}

	constructor(protected output: typeof Deno.stdout, protected input?: typeof Deno.stdin, protected options: RendererOptions = {}) {
		if (this.options.fullscreen == undefined) this.options.fullscreen = true;
		if (this.options.alternateWindowBuffer == undefined) this.options.alternateWindowBuffer = true;
		if (this.input) this.inputHandler = new InputHandler(this.output, this.input, (...data)=>this.log(...data))
		this.#window = new Window(this);
		if (debugDefault) this.enableDebugMode();
		this.updateFullWidth()
		this.updateFullHeight();
	}

	private sigwinchListener = () => {
		this.window.dispatchEvent(new CustomEvent("resize"))
		this.updateFullWidth()
		this.updateFullHeight();
		this.renderAll()
	}

	private keyDownListener = (e:KeyEvent) => {

		if (this.allowDebugging) {
			// ctrl+d
			if (e.data.key == "d" && e.data.ctrlKey) {
				if (!this.debugMode) this.enableDebugMode();
				else this.disableDebugMode()
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
	}

	enableDebugMode() {
		this.debugMode = true;
		this.chromeMargins.left = 1;
		this.chromeMargins.right = 1;
		this.chromeMargins.top = 5;
		this.chromeMargins.bottom = this.logsHeight;
	}

	disableDebugMode() {
		this.debugMode = false;
		this.chromeMargins.left = 0;
		this.chromeMargins.right = 0;
		this.chromeMargins.top = 0;
		this.chromeMargins.bottom = 0;
	}

	private mouseListener = (e:MouseEvent) => {

		if (this.allowDebugging) {
			if (!this.mouseData) this.mouseData = {
				row: e.data.row,
				col: e.data.col,
				pressed: false
			}
			else {
				this.mouseData.col = e.data.col;
				this.mouseData.row = e.data.row;
			}

			if (e.type == "mousemove") {
				// handle logs window resize
				if (this.movingLogsWindow) {
					if (this.mouseData.row > this.chromeMargins.top) {
						this.logsHeight = this.fullHeight-this.mouseData.row+1;
						this.renderAll()
					}
				}
			}
			else if (e.type == "mousedown") {
				this.log("mousedown",e.data);
				this.mouseData.pressed = true
				// handle logs window resize
				if (this.mouseData.row == this.fullHeight-this.logsHeight+1) {
					this.movingLogsWindow = true;
				}
			}
			else if (e.type == "mouseup") {
				this.mouseData.pressed = false
				this.movingLogsWindow = false;
			}
			

			this.renderAll()
		}
	}



	start() {

		this.enableListeners();
		this.updateFullWidth()
		this.updateFullHeight();

		if (this.options.fullscreen) {
			if (this.options.alternateWindowBuffer)
				this.enableAlternateScreenBuffer();
			this.#writeText(CTRLSEQ.RESET)
			this.#writeText(CTRLSEQ.CLEAR_SCREEN)
			this.#writeText(CTRLSEQ.HOME)
		}


		this.hideCursor();

		this.renderAll();
	}

	hideCursor() {
		this.#writeText(CTRLSEQ.HIDE_CURSOR);
		onExit(()=>this.#writeText(CTRLSEQ.SHOW_CURSOR))
	}

	enableAlternateScreenBuffer() {
		this.#writeText(CTRLSEQ.ENABLE_ALTERNATE_SCREEN_BUFFER);
		onExit(()=>this.#writeText(CTRLSEQ.DISABLE_ALTERNATE_SCREEN_BUFFER));
	}

	stop() {
		this.disableListeners()
	}

	enableListeners() {
		this.inputHandler?.listen();
		Deno.addSignalListener("SIGWINCH", this.sigwinchListener);
		this.inputHandler?.addEventListener("keydown", this.keyDownListener)
		this.inputHandler?.addEventListener("mousemove", this.mouseListener)
		this.inputHandler?.addEventListener("mouseup", this.mouseListener)
		this.inputHandler?.addEventListener("mousedown", this.mouseListener)
	}

	disableListeners() {
		this.inputHandler?.stopListen();

		Deno.removeSignalListener("SIGWINCH", this.sigwinchListener);
		this.inputHandler?.removeEventListener("keydown", this.keyDownListener)
		this.inputHandler?.removeEventListener("mousemove", this.mouseListener)
		this.inputHandler?.removeEventListener("mouseup", this.mouseListener)
		this.inputHandler?.removeEventListener("mousedown", this.mouseListener)
	}

	renderAll() {
		this.rendering = true;
		if (this.debugMode) this.frameTransmissionSize = 0;

		if (!this.root) throw new Error("Cannot render, not root set");
		if (this.freeze) return;
		this.frame++;
		if (this.options.fullscreen) {
			this.#writeText(CTRLSEQ.CLEAR_SCREEN)
			this.#writeText(CTRLSEQ.HOME)	
		}

		if (this.renderMode == RenderMode.DIRTY_CHARS) {
			this.renderContentBoxDirtyChars(this.root);
		}
		else {
			this.renderContentBox(this.root);
		}

		if (this.debugMode) {
			this.renderDebugOverlay();
			this.renderDebugWindow()
		}

		this.rendering = false;
	}

	renderDebugWindow() {
		this.cursorTo(1, 0);

		const frameTransmissionSize = this.frameTransmissionSize;

		this.#writeText(CTRLSEQ.INVERT + " ".repeat(this.fullWidth))
		this.#writeText(fitText(`${CTRLSEQ.BOLD}URMEL${CTRLSEQ.RESET_BOLD} beta`, {
			lineWidth: this.fullWidth,
			lineEndMark: `[Frame #${this.frame}]  `,
			paddingLeft: 2,
			paddingRight: 2
		})!)

		this.#writeText(fitText(`WINDOW = ${this.windowWidth}x${this.windowHeight}${this.windowMouseData ? `   MOUSE = (col:${this.windowMouseData.col} row:${this.windowMouseData.row})`:''}   FRAME_TS = ${frameTransmissionSize}`, {
			lineWidth: this.fullWidth,
			paddingLeft: 2,
			paddingRight: 2
		})!)

		this.#writeText(fitText("[CTRL+D] Toggle debug mode   [CTRL+R] Switch render mode", {
			lineWidth: this.fullWidth,
			paddingLeft: 2,
			paddingRight: 2
		})!)
		this.#writeText(" ".repeat(this.fullWidth))

		// this.getCursorPosition()
		let headerHeight = 5;

		for (let line = headerHeight+1; line < this.fullHeight; line++) {
			this.cursorTo(1, line);
			this.#writeText(" ")
			this.cursorTo(this.fullWidth, line)
			this.#writeText(" ")
		}
		this.cursorTo(1, this.fullHeight);
		this.#writeText(" ".repeat(this.fullWidth))

		this.cursorTo(1, this.fullHeight-this.logsHeight+1);
		if (this.movingLogsWindow) this.#writeText(CSI+'90m');
		this.#writeText(("  Logs"+" ".repeat(this.fullWidth/2 - 6)+"━").padEnd(this.fullWidth, " "))
		if (this.movingLogsWindow) this.#writeText(CSI+'0m');

		const logsInnerHeight = this.logsHeight-2;
		for (const log of this.logBuffer.length<logsInnerHeight ? this.logBuffer : this.logBuffer.slice(this.logBuffer.length-logsInnerHeight)) {
			this.#writeText(CTRLSEQ.INVERT + " ")
			this.#writeText(CTRLSEQ.RESET_INVERT)
			console.log(...log)
		}
	}

	getCursorPosition() {
		if (!this.inputHandler) throw new Error("Cannot get cursor position, no input available")
		return new Promise<{row:number,col:number}>(resolve=>{
			this.inputHandler!.cursorPositionHandler = (row, col)=>{
				resolve({row, col})
			}
			this.#writeText(CTRLSEQ.GET_CURSOR_POSITION);
		})
	}

	renderDebugOverlay() {
		// show mouse pos
		if (this.mouseData) {
			const bg = this.root!.charAt(this.mouseData.col-this.windowOffsetLeft, this.mouseData.row-this.windowOffsetTop)?.params['background-color']
			this.printChar(this.mouseData.col, this.mouseData.row, new Char(this.mouseData.pressed ? "✜" : '✛', {"background-color": bg}), 0, 0)
		}
	}

	renderContentBox(box: ContentBox) {
		const markedChars = box.getBubbledMarkedChars()
		this.log("box size",box.markedChars.cols, box.markedChars.rows)
		this.printChars([...markedChars]
			.filter(([_,__,dirty])=>dirty)
			.map(([y,x,_])=>[y,x,box.getDirtyCharAt(y, x)] as const)
			.filter(([_,__,char])=>!!char) as [y:number, x:number, char:Char][]
		)
	}

	renderContentBoxDirtyChars(box: ContentBox) {
		const dirtyChars = box.getBubbledMarkedChars();
		this.printChars([...dirtyChars].map(([x,y,dirty]) => [x,y,new Char(' ', {
			'background-color': dirty ? 'magenta' : 'cyan'
		})]));
	}

	printChar(x:number, y:number, char:Char, offsetLeft = this.windowOffsetLeft, offsetTop = this.windowOffsetTop) {
		this.cursorTo(x+offsetLeft, y+offsetTop);
		const controlSeqs = ('background-color' in char.params || 'color' in char.params) ? getColorControlSequence(char.params['color'] as string, char.params['background-color'] as string) : '';
		
		this.#writeText(controlSeqs + char.value + "\u001b[0m")
	}

	printChars(chars:[y:number, x:number, char:Char][], offsetLeft = this.windowOffsetLeft, offsetTop = this.windowOffsetTop) {
		this.cursorTo(chars[0][1]+offsetLeft, chars[0][0]+offsetTop);
		let currentColor:string|undefined;
		let currentBG:string|undefined;
		let lastX:number = chars[0][1]-1;
		let lastY:number = chars[0][0];
		// TODO return buffer, write only once to out stream
		for (const [y,x,char] of chars) {
			if (x == lastX+1 && y == lastY) {
				// no need to update pos
			}
			else {
				this.cursorTo(x+offsetLeft,y+offsetTop)
			}
			let controlSeqs = ""
			if (currentColor != char.params['color'] || currentBG != char.params['background-color']) {
				controlSeqs = 
					('background-color' in char.params || 'color' in char.params) ? 
						(getColorControlSequence(char.params['color'] as string, char.params['background-color'] as string)) ?? "\u001b[0m"
						 : "\u001b[0m";
			}

			this.#writeText(controlSeqs + char.value)

			currentColor = char.params['color'] as string;
			currentBG = char.params['background-color'] as string;
			lastX = x;
			lastY = y;
		}

		this.#writeText("\u001b[0m");
	}

	cursorTo(x:number, y:number) {
		this.#writeText(ESC + y + ";" + x + "H")
	}


	#textEncoder = new TextEncoder()

	#writeText(text: string) {
		if (this.debugMode) this.frameTransmissionSize += text.length;
		this.output.writeSync(this.#textEncoder.encode(text))
	}





	log(...data:unknown[]) {
		const date = new Date()
		this.logBuffer.push([`[${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}]`, ...data]);
		if (this.logBuffer.length > 50) this.logBuffer.splice(1, 1);
		if (!this.rendering) this.renderAll() // prevent endless loop when logging during render
	}

	setRoot(root: ContentBox) {
		this.root = root;
	}


	DEFAULT_WIDTH = 100
	DEFAULT_HEIGHT = 80

	fullWidth = this.DEFAULT_WIDTH; 
	fullHeight = this.DEFAULT_HEIGHT;

	// margins for the browser chrome (debug headers, logs, menus)
	private chromeMargins = {
		top: 0,
		bottom: 0,
		left: 0,
		right: 0
	}

	private updateFullWidth() {
		try {
			this.fullWidth = Deno.consoleSize().columns
		} 
		catch {}
	}

	private updateFullHeight() {
		try {
			this.fullHeight = Deno.consoleSize().rows
		} 
		catch {}
	}

	get windowWidth() {
		return this.fullWidth-this.chromeMargins.left-this.chromeMargins.right
	}

	get windowHeight() {
		return this.fullHeight-this.chromeMargins.top-this.chromeMargins.bottom
	}

	get windowOffsetTop() {
		return this.chromeMargins.top
	}
	get windowOffsetLeft() {
		return this.chromeMargins.left
	}
	
	

	static getDefaultRenderer() {
		return new Renderer(Deno.stdout, Deno.stdin)
	}

}