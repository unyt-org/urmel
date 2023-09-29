import "../app/context.ts";
import { TerminalView } from "../terminal/TerminalView.ts";

const div = 
	<div id="helloWorld" style={{color:"green"}}>
		URMEL • Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor 
		incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud 
		exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. 
		Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu 
		fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in 
		culpa qui officia deserunt mollit anim id est laborum.
	</div>

new TerminalView(div).show();

// import { Datex } from "datex-core-js-legacy";
// import { Path } from "uix/utils/path.ts";
// await Datex.Supranet.init()
// Datex.Compiler.exportValue(div, new Path("./dom-export.dx"), Datex.FILE_TYPE.DATEX_SCRIPT, true, true)