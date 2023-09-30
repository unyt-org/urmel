import { ContentBox } from "../../rendering/ContentBox.ts";
import { FullscreenContentBox } from "../../rendering/FullscreenContentBox.ts";
import { Renderer } from "../../rendering/Renderer.ts";

const renderer = Renderer.getDefaultRenderer();

// create content boxes
const rootBox = new FullscreenContentBox();
rootBox.markedChars.fill(0);
rootBox.appendChild(new ContentBox(5, 5, 5, 12).fillParam("background-color" ,"green"))
rootBox.appendChild(new ContentBox(8, 10, 6, 19))


setInterval(()=>{
	renderer.renderAll()
}, 300)

renderer.setRoot(rootBox)
renderer.start();