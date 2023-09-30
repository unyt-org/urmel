import { logger } from "unyt_core/datex_all.ts";
import { TerminalView } from "../terminal/TerminalView.ts";

const div = 
	<div id="Hello UIX DOM" style={{color:"unyt_skyblue"}}>
		<a href="https://unyt.org">Hello unyt</a>
		<a href="./">Hello UIX DOM</a>
	</div>


// console.log(div)
// logger.info(div)

new TerminalView(div).show()

// import { Datex } from "datex-core-js-legacy";
// import { Path } from "uix/utils/path.ts";
// await Datex.Supranet.init()
// Datex.Compiler.exportValue(div, new Path("./dom-export.dx"), Datex.FILE_TYPE.DATEX_SCRIPT, true, true)