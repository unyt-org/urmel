import { Renderer } from "./Renderer.ts";

export class Window extends EventTarget {

	constructor(private renderer: Renderer) {
		super()
	}

	get innerWidth() {
		return this.renderer.windowWidth
	}
	get innerHeight() {
		return this.renderer.windowHeight
	}

}
