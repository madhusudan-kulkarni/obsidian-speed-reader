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
}

export interface ParsedDocument {
	words: WordData[];
	headings: HeadingInfo[];
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
	enableRampUp: true
};