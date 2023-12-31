
export const CSI = '\u001b['
export const CTRLSEQ = {
	ENABLE_MOUSE_TRACKING: 				CSI + '?1000h',
	ENABLE_MOUSE_TRACKING_DECIMAL_1: 	CSI + '?1006h',
	ENABLE_MOUSE_TRACKING_DECIMAL_2: 	CSI + '?1015h',
	ENABLE_MOUSE_TRACKING_EXTENDED: 	CSI + '?1003h',
	DISABLE_MOUSE_TRACKING: 			CSI + '?1000l',

	SHOW_CURSOR:						CSI + '?25h',
	HIDE_CURSOR: 						CSI + '?25l',

	ENABLE_ALTERNATE_SCREEN_BUFFER: 	CSI + '?1049h',
	DISABLE_ALTERNATE_SCREEN_BUFFER: 	CSI + '?1049l',

	CLEAR_SCREEN:						CSI + '2J',
	RESET:								CSI + 'c',
	HOME:								CSI + 'H',

	INVERT:								CSI + '7m',
	RESET_INVERT:						CSI + '27m',
	BOLD:								CSI + '1m',
	RESET_BOLD:							CSI + '22m',
	RESET_FORMAT:						CSI + '0m',

	GET_CURSOR_POSITION:				CSI + '6n',	
} as const;