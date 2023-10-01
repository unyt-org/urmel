import { BitMatrix } from "./BitMatrix.ts";

export type CharParams = Record<string,unknown>;

export class Char {
	value: string;
	params: CharParams;
	constructor(char: string|number = " ", params:CharParams = {}) {
		this.value = typeof char == "string" ? char : String.fromCharCode(char);
		this.params = params;
	}

	setParam<Name extends keyof CharParams>(name: Name, value:CharParams[Name]) {
		this.params[name] = value;
	}

}

export class ContentBox  {

	#x: number;
	#y: number;
	#rows: number;
	#cols: number;
	#chars: Char[][];
	#markedChars!: BitMatrix // 1 is dirty, 0 is unchanged
	#children:ContentBox[] = []

	#isDirty = true;

	constructor(y: number, x:number, rows: number, cols: number) {
		this.#x = x;
		this.#y = y;
		this.#rows = rows;
		this.#cols = cols;
		this.#chars = [];
		this.resize(this.#rows, this.#cols)
	}

	resize(rows: number, cols: number) {
		this.#rows = rows;
		this.#cols = cols;
		this.#markedChars = new BitMatrix(rows, cols).fill(1);

		for (let rowNr = 0; rowNr<rows; rowNr++) {
			const row = [];
			for (let colNr = 0; colNr<cols; colNr++) {
				row.push(new Char(" "))
			}
			this.#chars.push(row)
		}
	}

	get markedChars() {
		return this.#markedChars
	}

	charAt(windowX:number, windowY:number) {
		return this.#chars[windowY-this.y]?.[windowX-this.x]
	}

	appendChild(child: ContentBox) {
		if (this.#children.includes(child)) this.#children.splice(this.#children.indexOf(child), 1);
		this.#children.push(child)
	}

	getDirtyCharAt(windowY: number, windowX: number): Char|null {
		if (this.#markedChars.get(windowY-this.y, windowX-this.x)) return this.charAt(windowX,windowY)
		else {
			for (const child of this.#children) {
				const dirtyChar = child.getDirtyCharAt(windowY, windowX);
				if (dirtyChar) return dirtyChar;
			}
		}
		return null;
	}

	getBubbledMarkedChars(parentWidth = this.#x + this.#cols): BitMatrix {
		const childrenDirtyChars = this.#children.map(c=>c.getBubbledMarkedChars(parentWidth));

		// console.log("->\n"+childrenDirtyChars[0]);
		return new BitMatrix(
			this.#y + this.#rows,
			parentWidth,
			BitMatrix.or(...childrenDirtyChars, this.#markedChars.getDataShiftedAndResized(this.#x, this.#y, parentWidth))
		);
	}

	*iterateChars() {
		for (const chars of this.#chars) {
			for (const char of chars) {
				yield char;
			}
		}
	}


	fillParam<Name extends keyof CharParams>(name: Name, value:CharParams[Name]) {
		for (const char of this.iterateChars()) {
			char.setParam(name, value)
		}
		return this;
	}


	get isDirty() {
		return this.#isDirty;
	}

	set x(x:number) {
		this.#x = x;
		this.#isDirty = true
	}
	get x() {return this.#x}

	set y(y:number) {
		this.#y = y;
		this.#isDirty = true
	}
	get y() {return this.#y}

	set rows(rows:number) {
		this.#rows = rows;
		this.#isDirty = true
	}
	get rows() {return this.#rows}

	set cols(cols:number) {
		this.#cols = cols;
		this.#isDirty = true
	}
	get cols() {return this.#cols}

}