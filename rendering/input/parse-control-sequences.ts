import { CSI } from "../control-sequences.ts";

const GENERAL_CSI_SEQUENCE = /\u001B\[([<])?((?:\d*;?)*)([A-Za-z])/;

export type ControlSequenceData<Prefix extends string = string, Suffix extends string = string> = {
	prefix?: Prefix,
	args: number[],
	suffix?: Suffix
}

export function parseControlSequence(text: string):[data?:ControlSequenceData, before?:string, after?:string] {
	const match = text.match(GENERAL_CSI_SEQUENCE);
	// console.log("CSI", text.replace(CSI, "CSI"))
	if (!match) return [undefined, undefined, text];

	const [before, after] = text.split(match[0], 2);
	const data = {
		prefix: match[1],
		args: match[2].split(";").map(Number),
		suffix: match[3]
	};

	return [data, before, after]
}