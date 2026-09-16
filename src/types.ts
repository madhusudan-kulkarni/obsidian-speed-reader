export interface WordData {
	raw: string;
	word: string;
	punctuation: string;
	orpIndex: number;
	start: number;
	end: number;
}

export interface HeadingInfo {
	level: number;
	text: string;
	wordIndex: number;
}

export type FontFamilyOption = 'default' | 'monospace' | 'sans-serif';

export type BlockType = 'code' | 'math' | 'table';

export interface ReadingBlock {
	type: BlockType;
	/** Raw markdown source used to render the block as-is (e.g. fenced code, $$...$$, table rows). */
	content: string;
	/** Code fence language, when known. */
	language?: string;
	/** Index of the first word read after this block; the block is displayed just before it. */
	wordIndex: number;
}

export interface SpeedReaderSettings {
	wpm: number;
	chunkSize: number;
	fontSize: number;
	windowWidth: number;
	windowMaxWidth: number;
	fontFamily: FontFamilyOption;
	orpColor: string;
	showContext: boolean;
	contextWords: number;
	showProgress: boolean;
	showStats: boolean;
	enableMicropause: boolean;
	micropauseIntensity: number;
	enableRampUp: boolean;
	pauseForCodeBlocks: boolean;
	pauseForMathBlocks: boolean;
	pauseForTableBlocks: boolean;
	autoResumeSeconds: number;
}

export interface ReaderState {
	chunk: WordData[];
	currentIndex: number;
	totalWords: number;
	progress: number;
	isPlaying: boolean;
	finished: boolean;
	currentWpm: number;
	timeRemainingMs: number;
	elapsedTimeMs: number;
	currentHeading: HeadingInfo | null;
	activeBlock: ReadingBlock | null;
}

export interface ParsedDocument {
	words: WordData[];
	headings: HeadingInfo[];
	blocks: ReadingBlock[];
	startWordIndex: number;
}

export const DEFAULT_SETTINGS: SpeedReaderSettings = {
	wpm: 300,
	chunkSize: 1,
	fontSize: 64,
	windowWidth: 95,
	windowMaxWidth: 780,
	fontFamily: 'default',
	orpColor: '',
	showContext: false,
	contextWords: 3,
	showProgress: true,
	showStats: true,
	enableMicropause: true,
	micropauseIntensity: 1.5,
	enableRampUp: true,
	pauseForCodeBlocks: true,
	pauseForMathBlocks: true,
	pauseForTableBlocks: true,
	autoResumeSeconds: 0
};