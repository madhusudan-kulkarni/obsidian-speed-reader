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
	showContext: boolean;
	contextWords: number;
	showProgress: boolean;
	showStats: boolean;
	enableMicropause: boolean;
	micropauseSentence: number;
	micropauseClause: number;
	micropauseNumbers: number;
	micropauseLongWords: number;
	micropauseParagraph: number;
	micropauseHeading: number;
	enableSlowStart: boolean;
	enableAcceleration: boolean;
	accelerationDuration: number;
	accelerationTargetWpm: number;
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
	showContext: false,
	contextWords: 3,
	showProgress: true,
	showStats: true,
	enableMicropause: true,
	micropauseSentence: 2.0,
	micropauseClause: 1.5,
	micropauseNumbers: 1.8,
	micropauseLongWords: 1.2,
	micropauseParagraph: 2.2,
	micropauseHeading: 1.8,
	enableSlowStart: true,
	enableAcceleration: false,
	accelerationDuration: 30,
	accelerationTargetWpm: 500
};
