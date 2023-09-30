import { ContentBox } from "./ContentBox.ts";

export class FullscreenContentBox extends ContentBox {
	

	constructor() {
		super(0, 0, FullscreenContentBox.windowHeight-10, FullscreenContentBox.windowWidth);

		Deno.addSignalListener("SIGWINCH", () => {
			this.resize(FullscreenContentBox.windowHeight-10, FullscreenContentBox.windowWidth)
	   	});
	}

	static DEFAULT_WIDTH = 100
	static DEFAULT_HEIGHT = 80

	static get windowWidth() {
		try {
			return Deno.consoleSize().columns
		} 
		catch {
			return this.DEFAULT_WIDTH
		}
	}

	static get windowHeight() {
		try {
			return Deno.consoleSize().rows
		} 
		catch {
			return this.DEFAULT_WIDTH
		}
	}
}