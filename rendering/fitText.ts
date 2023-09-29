function characterLength(text: string) {
	// deno-lint-ignore no-control-regex
	return text.replace(/(\x1b\[(\d+;?)+m|\u200B|\u00AD)/gm, "").length
}

type normalizedFitTextOptions = {
	lineWidth: number|((lineNr:number)=>number)
	paddingLeft: number|((lineNr:number)=>number)
	paddingRight: number|((lineNr:number)=>number)
	lineStartMark: string|((lineNr:number)=>string)
	lineEndMark: string|((lineNr:number)=>string)
	trimLineStart: boolean
	wordWrap: "break"|"normal",
	newLineCharacter: string
	strategy: "trim"|"ellipsis"|"wrap",
}

type lineSpecificOptions = {
	lineWidth: number
	paddingLeft: number
	paddingRight: number
	lineStartMark: string
	lineEndMark: string,
	innerWidth: number
}

type fitTextOptions = Partial<normalizedFitTextOptions> & {lineWidth: number}


export function fitText(text:string, options: fitTextOptions) {

	options.strategy ??= "wrap";	
	options.paddingLeft ??= 0;
	options.paddingRight ??= 0;
	options.trimLineStart ??= true;
	options.wordWrap ??= "normal";
	options.lineStartMark ??= ""
	options.lineEndMark ??= ""
	options.newLineCharacter ??= "\n";


	if (options.strategy == "trim") 
		return trimText(text, options as normalizedFitTextOptions);
	if (options.strategy == "ellipsis") 
		return trimText(text, options as normalizedFitTextOptions, "...");
	else if (options.strategy == "wrap") 
		return wrapText(text, options as normalizedFitTextOptions);
	
}

function getLineOptions(options: normalizedFitTextOptions, lineNr: number) {
	const lineOptions = {
		lineWidth: typeof options.lineWidth == "number" ? options.lineWidth : options.lineWidth?.(lineNr),
		paddingLeft: typeof options.paddingLeft == "number" ? options.paddingLeft : options.paddingLeft?.(lineNr),
		paddingRight: typeof options.paddingRight == "number" ? options.paddingRight : options.paddingRight?.(lineNr),
		lineStartMark: typeof options.lineStartMark == "string" ? options.lineStartMark : options.lineStartMark?.(lineNr),
		lineEndMark: typeof options.lineEndMark == "string" ? options.lineEndMark : options.lineEndMark?.(lineNr),
	} as lineSpecificOptions;

	if (lineOptions.lineWidth==undefined) throw new Error("lineWidth required");
	if (lineOptions.lineWidth <= 0) throw new Error("lineWidth must be > 0");
	if (!isFinite(lineOptions.lineWidth)) throw new Error("lineWidth must be finite");

	// |---------------------------------lineWidth---------------------------------|
	// |lineStartMark.length-paddingLeft-innerWidth-paddingRight-lineEndMark.length|

	const lineStartMarkPadding = characterLength(lineOptions.lineStartMark) ?? 0
	const lineEndMarkPadding = characterLength(lineOptions.lineEndMark) ?? 0

	lineOptions.innerWidth = 
		lineOptions.lineWidth
		- lineStartMarkPadding
		- lineOptions.paddingLeft
		- lineOptions.paddingRight
		- lineEndMarkPadding;

	if (lineOptions.innerWidth <= 0) {
		throw new Error("lineWidth-paddingLeft-paddingRight must be > 0");
	}

	return lineOptions;
}


function padEnd(text: string, maxLength: number, fillString = " ") {
	const missingPadding = maxLength - characterLength(text)
	if (missingPadding > 0) return text + fillString.repeat(missingPadding);
	else return text;
}

function createLine(lineContent: string, options:normalizedFitTextOptions, lineOptions: lineSpecificOptions, isEnd = true) {
	const {paddingLeft, paddingRight, lineStartMark, lineEndMark} = lineOptions
	const {newLineCharacter} = options;

	return (
		(lineStartMark??"") 
		+ " ".repeat(paddingLeft) 
		+ padEnd(lineContent, lineOptions.innerWidth)
		+ " ".repeat(paddingRight) 
		+ (lineEndMark??"") 	
		+ (!isEnd ? newLineCharacter : "")
	)
}

function wrapText(text: string, options:normalizedFitTextOptions) {

	let mappedText = ""
	let lineNr = 0;
	while (text.length) {
		let line = text;
		if (options.trimLineStart) {
			line = line.trimStart();
		}
		text = "";
		const lineOptions = getLineOptions(options, lineNr);

		// too long for this line, split into new line+remaining
		if (characterLength(line) > lineOptions.innerWidth) {

			let shift = 0;
			let hyphen = "";
			// make sure words are not split
			if (options.wordWrap == "normal") {
				let wrapChar = line[lineOptions.innerWidth-1];
				while (wrapChar != " " && wrapChar != "\u200B" && wrapChar != "\u00AD") {
					// word does not fit in line, need to break
					if (lineOptions.innerWidth-1-shift < 0 ) {
						shift = 0;
						break;
					}
					
					shift++;
					wrapChar = line[lineOptions.innerWidth-1-shift];
				} 
				// is invisible hyphen, insert hyphen
				if (wrapChar == "\u200B" || wrapChar == "\u00AD") {
					hyphen = "-"
					// lineOptions.innerWidth++;
				}

			}

			// TODO: fix slice - better: implement wrapping without color/ANSI codes + apply afterwards
			text = line.slice(lineOptions.innerWidth-shift)
			line = (line).slice(0, lineOptions.innerWidth-shift)+hyphen;

		}
		// create content for this line
		mappedText += createLine(line, options, lineOptions, !text.length);
		lineNr++;
	}
	
	return mappedText

}


function trimText(text: string, options:normalizedFitTextOptions, ellipsis = "") {
	const lineOptions = getLineOptions(options, 0);

	if (characterLength(text) < lineOptions.innerWidth) return createLine(text, options, lineOptions)
	else return createLine(text.slice(0, lineOptions.innerWidth-characterLength(ellipsis)) + ellipsis, options, lineOptions)
}