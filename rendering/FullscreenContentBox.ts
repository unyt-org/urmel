import { ContentBox } from "./ContentBox.ts";
import { Window } from "./Window.ts";

export class FullscreenContentBox extends ContentBox {
	
	constructor(private window: Window) {
		super(0, 0, window.innerHeight-10, window.innerWidth);

		this.window.addEventListener("resize", ()=>{
			this.resize(this.window.innerHeight-10, this.window.innerWidth)
		})
	}
}