export class BitMatrix implements Iterable<[number, number, number]> {

	#rows: number;
	#cols: number;
	#data = 0n;

	constructor(rows: number, cols: number, data?: bigint) {
		this.#rows = rows;
		this.#cols = cols;
		if (data!=undefined) this.#data = data;
	}

	get cols() {return this.#cols}
	get rows() {return this.#rows}

	// returns 2d matrix
	toString(formatted = true){
		if (formatted) {
			let string = "";
			for (let row = 0; row<this.#rows; row++) {
				for (let col = 0; col<this.#cols; col++) {
					string += this.get(row, col);
				}
				string += "\n"
			}
			return string;
		}
		else return this.#data.toString(2)
 	}

	#index(row: number, col: number) {
		return BigInt((row*this.#cols)+col);
	}

	get(row: number, col: number) {
		if (row < 0 || row >= this.#rows || col < 0 || col >= this.#cols) return 0;
		return (this.#data >> this.#index(row, col)) & 1n
	}

	set(row: number, col: number, val:0|1|true|false) {
		if (row < 0 || row >= this.#rows || col < 0 || col >= this.#cols) return;
		if (val) this.#data |= (1n << this.#index(row, col));
		else this.#data &= ~(1n << this.#index(row, col));
	}

	getData() {
		return this.#data;
	}

	// shift down and right
	getDataShiftedAndResized(x: number, y: number, fillWidth = this.cols + x) {
		let newRows = this.#rows;
		const xRight = fillWidth - (this.cols + x);
		if (xRight < 0) throw new Error("invalid shift + resize, cannot get smaller")

		// add 000 at the end
		let newData = this.#data << BigInt(y*this.#cols);
		newRows += y;
	
		// insert 000 every n bits
		if (x + xRight > 0) {
			const rowMask = (1n << BigInt(this.#cols)) - 1n; // 0b1111
			const newCols = BigInt(this.#cols + x + xRight);
			const buffer = newData;
			let newBuffer = 0n;

			for (let rowIndex = 0; rowIndex<newRows; rowIndex++) {
				const newRow = ((buffer >> BigInt((newRows-rowIndex-1)*this.#cols)) & rowMask) << BigInt(x);
				newBuffer = ((newBuffer << newCols) | newRow);
			}
			newData = newBuffer;
		}

		return newData;
	}

	getDataInverted() {
		return ~this.#data;
	}

	/**
	 * - Shift the matrix right and down by x and y.
	 * - Set the full width and height for the matrix (gets added on the bottom and right)
	 * @param x 
	 * @param y 
	 * @param width 
	 * @param height 
	 * @returns 
	 */
	shiftAndResize(x = 0, y = 0, width = this.cols + x, height = this.rows + y) {
		this.#data = this.getDataShiftedAndResized(x, y, width);

		this.#rows = height;
		this.#cols = width;

		return this;
	}

	shift(x = 0, y = 0) {
		return this.shiftAndResize(x, y);
	} 

	resize(width = this.cols, height = this.rows) {
		return this.shiftAndResize(0,0, width, height);
	} 

	invert() {
		this.#data = this.getDataInverted()
		return this;
	}

	fill(value: 0|1|true|false) {
		if (!value) this.#data = 0n;
		else this.#data = (1n << BigInt(this.#cols*this.#rows)) - 1n;
		return this;
	}


	static or(...matrices: (BitMatrix|bigint)[]) {
		return matrices.map(m=>typeof m == "bigint" ? m : m.getData()).reduce((p,c) => p|c, 0n);
	}

	static and(...matrices: (BitMatrix|bigint)[]) {
		const data = matrices.map(m=>typeof m == "bigint" ? m : m.getData());
		return data.reduce((p,c) => p&c, data[0]??0n);
	}


	*[Symbol.iterator]() {
		for (let row = 0; row<this.#rows; row++) {
			for (let col = 0; col<this.#cols; col++) {
				yield [row, col, Number(this.get(row, col))] as const;
			}
		}
	}

}