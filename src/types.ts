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

export interface SpeedReaderSettings {
	wpm: number;
	chunkSize: number;
	fontSize: number;
	orpColor: string;
	showContext: boolean;
	contextWords: number;
	showProgress: boolean;
	showStats: boolean;
	enableMicropause: boolean;
	micropauseIntensity: number;
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
	orpColor: '',
	showContext: false,
	contextWords: 3,
	showProgress: true,
	showStats: true,
	enableMicropause: true,
	micropauseIntensity: 1.5
};