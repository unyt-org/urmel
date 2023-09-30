import "../app/context.ts";
import { logger } from "datex-core-js-legacy/datex_all.ts";
import { Element } from "../uix-dom/dom/mod.ts";
import { fitText } from "../rendering/fitText.ts";
import { hideCursor, showCursor } from "https://denopkg.com/iamnathanj/cursor@v2.2.0/mod.ts";


export class TerminalView {

	DEFAULT_WIDTH = 140

	constructor(public element: Element) {
		// logger.info("creating new terminal view",element)

	}

	show() {
		// hideCursor();
		this.render()

		Deno.addSignalListener("SIGWINCH", () => {
			this.render()
	   	});
	}

	get width() {
		try {
			return Math.min(Deno.consoleSize().columns, this.DEFAULT_WIDTH);
		} 
		catch {
			return this.DEFAULT_WIDTH
		}
	}

	render() {
		this.clearScreen();

		const rendered = fitText(this.element.childNodes[0].textContent, {
			lineWidth: this.width,
			paddingLeft: 2,
			paddingRight: 2,
			lineStartMark: "│ ",
			lineEndMark: " │",
			strategy: "wrap",
			wordWrap: "break"
		})

		// render with borders
		console.log("┌" + "─".repeat(this.width-2)+"┐")
		console.log("│" + " ".repeat(this.width-2)+"│")
		console.log(rendered)
		console.log("│" + " ".repeat(this.width-2)+"│")
		console.log("└" + "─".repeat(this.width-2)+"┘")
	}

	clearScreen() {
		console.log("\x1b[2J");
		console.log("\x1bc");
	}
}