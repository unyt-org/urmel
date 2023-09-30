import { ContentBox } from "../../rendering/ContentBox.ts";
import { Renderer } from "../../rendering/Renderer.ts";

const renderer = Renderer.getDefaultRenderer();

const width = 40;
const height = 20;

// create content boxes
const rootBox = new ContentBox(0, 0, height, width);
rootBox.markedChars.fill(0);
rootBox.appendChild(new ContentBox(5, 5, 5, 12))
rootBox.appendChild(new ContentBox(8, 10, 6, 19))

let x = 0;
let y = 0;

setInterval(()=>{
	rootBox.markedChars.set(y%height,(x++)%width,1);
	renderer.renderAll()
	if (x%width == 0) y++;
}, 40)

renderer.setRoot(rootBox)
renderer.start();