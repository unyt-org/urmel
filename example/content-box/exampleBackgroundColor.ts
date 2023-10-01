import { ContentBox } from "../../rendering/ContentBox.ts";
import { FullscreenContentBox } from "../../rendering/FullscreenContentBox.ts";
import { Renderer } from "../../rendering/Renderer.ts";

const renderer = Renderer.getDefaultRenderer();
// create content boxes
const rootBox = new FullscreenContentBox(renderer.window);
rootBox.markedChars.fill(0);
const box1 = new ContentBox(5, 5, 5, 12).fillParam("background-color" ,"dodgerblue");
box1.charAt(7,6).value = "H";
box1.charAt(8,6).value = "e";
box1.charAt(9,6).value = "l";
box1.charAt(10,6).value = "l";
box1.charAt(11,6).value = "o";
box1.charAt(7,7).value = "U";
box1.charAt(8,7).value = "R";
box1.charAt(9,7).value = "M";
box1.charAt(10,7).value = "E";
box1.charAt(11,7).value = "L";
box1.charAt(12,7).value = "!";

rootBox.appendChild(box1)
rootBox.appendChild(new ContentBox(8, 10, 6, 19).fillParam("background-color" ,"limegreen"))


setInterval(()=>{
	renderer.renderAll()
}, 300)

renderer.setRoot(rootBox)
renderer.start();