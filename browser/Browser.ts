import "../app/context.ts";
import { getCallerDir } from "unyt_core/utils/caller_metadata.ts";
import { Path } from "uix/utils/path.ts";
import { DOMParser } from "../uix-dom/dom/mod.ts";
import { logger } from "unyt_core/datex_all.ts";
import { Renderer } from "../rendering/Renderer.ts";
import { Datex } from "datex-core-js-legacy";
import { ContentBox } from "../rendering/ContentBox.ts";

export class Browser {

	constructor(public renderer = Renderer.getDefaultRenderer()) {

		const documentBox = new ContentBox(0, 0, 20, 40);
		documentBox.dirtyChars.fill(0);
		documentBox.dirtyChars.set(0,0,1);
		documentBox.appendChild(new ContentBox(5, 5, 5, 12))
		documentBox.appendChild(new ContentBox(8, 10, 6, 19))

		let x = 0;
		let y = 0;
		setInterval(()=>{
			documentBox.dirtyChars.set(y%20,(x++)%40,1);
			renderer.renderAll()
			if (x%40 == 0) y++;
		}, 40)

		renderer.setRoot(documentBox)
		renderer.start();
	}

	async open(url: string|URL) {
		const path = Path.pathIsURL(url) ? new Path(url) : new Path(url, getCallerDir());
		console.log("opening " + path);
		const content = await path.getTextContent();
		
		const doc = new DOMParser().parseFromString(content, "text/html");

		this.debug(doc?.childNodes[1])
	}

	async debug(value:any) {
		await Datex.Supranet.init()
		Datex.Compiler.exportValue(value, new Path("../example/dom-export.dx"), Datex.FILE_TYPE.DATEX_SCRIPT, true, true)
	}
}