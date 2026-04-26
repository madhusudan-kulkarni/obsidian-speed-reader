import { HeadingInfo, ReaderState, SpeedReaderSettings, WordData } from '../types';
import { MicropauseService } from '../services/micropauseService';
import { parseDocument } from '../services/textParser';

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

export class RSVPEngine {
	private words: WordData[] = [];
	private headings: HeadingInfo[] = [];
	private currentIndex = 0;
	private isPlaying = false;
	private timeoutId: number | null = null;
	private settings: SpeedReaderSettings;
	private onStateChange: (state: ReaderState) => void;
	private onComplete: () => void;
	private micropauseService: MicropauseService;

	constructor(
		settings: SpeedReaderSettings,
		onStateChange: (state: ReaderState) => void,
		onComplete: () => void
	) {
		this.settings = settings;
		this.onStateChange = onStateChange;
		this.onComplete = onComplete;
		this.micropauseService = new MicropauseService(settings);
	}

	loadText(text: string, startOffset = 0) {
		const parsed = parseDocument(text, startOffset);
		this.words = parsed.words;
		this.headings = parsed.headings;
		this.currentIndex = clamp(parsed.startWordIndex, 0, Math.max(this.words.length - 1, 0));
		this.emitState(false);
	}

	setSettings(settings: SpeedReaderSettings) {
		this.settings = settings;
		this.micropauseService.updateSettings(settings);
		this.emitState(false);
	}

	getSettings(): SpeedReaderSettings {
		return this.settings;
	}

	getHeadings(): HeadingInfo[] {
		return this.headings;
	}

	play() {
		if (this.words.length === 0) {
			this.emitState(false);
			return;
		}

		if (this.currentIndex >= this.words.length) {
			this.currentIndex = 0;
		}

		if (this.isPlaying) {
			return;
		}

		this.isPlaying = true;
		this.runLoop();
	}

	pause() {
		if (this.timeoutId !== null) {
			window.clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
		this.isPlaying = false;
		this.emitState(false);
	}

	togglePlayPause() {
		if (this.isPlaying) {
			this.pause();
		} else {
			this.play();
		}
	}

	rewind(count: number) {
		this.seekToIndex(this.currentIndex - count);
	}

	fastForward(count: number) {
		this.seekToIndex(this.currentIndex + count);
	}

	seekToIndex(index: number) {
		const last = Math.max(this.words.length - 1, 0);
		this.currentIndex = clamp(index, 0, last);
		this.emitState(false);

		if (this.isPlaying) {
			if (this.timeoutId !== null) {
				window.clearTimeout(this.timeoutId);
				this.timeoutId = null;
			}
			this.runLoop();
		}
	}

	seekToPercent(percent: number) {
		const clamped = clamp(percent, 0, 1);
		this.seekToIndex(Math.floor(clamped * this.words.length));
	}

	jumpToHeading(headingWordIndex: number) {
		this.seekToIndex(headingWordIndex);
	}

	adjustWpm(delta: number): number {
		this.settings.wpm = clamp(this.settings.wpm + delta, 50, 5000);
		this.emitState(false);
		return this.settings.wpm;
	}

	getContext(contextWords: number): { before: string[]; after: string[] } {
		const chunkEnd = Math.min(this.currentIndex + this.settings.chunkSize, this.words.length);
		const beforeStart = Math.max(0, this.currentIndex - contextWords);
		const afterEnd = Math.min(this.words.length, chunkEnd + contextWords);

		const before = this.words.slice(beforeStart, this.currentIndex).map((word) => `${word.word}${word.punctuation}`);
		const after = this.words.slice(chunkEnd, afterEnd).map((word) => `${word.word}${word.punctuation}`);

		return { before, after };
	}

	private runLoop() {
		if (!this.isPlaying) {
			return;
		}

		if (this.currentIndex >= this.words.length) {
			this.isPlaying = false;
			this.emitState(true);
			this.onComplete();
			return;
		}

		this.emitState(false);

		const delay = this.getCurrentDelay();
		this.timeoutId = window.setTimeout(() => {
			this.currentIndex += this.settings.chunkSize;
			this.timeoutId = null;
			this.runLoop();
		}, delay);
	}

	private getCurrentChunk(): WordData[] {
		if (this.currentIndex >= this.words.length) {
			return [];
		}

		const end = Math.min(this.currentIndex + this.settings.chunkSize, this.words.length);
		return this.words.slice(this.currentIndex, end);
	}

	private getCurrentDelay(): number {
		const chunk = this.getCurrentChunk();
		if (chunk.length === 0) {
			return 0;
		}

		const baseDelay = 60000 / this.settings.wpm;
		let multiplier = 1;

		for (const word of chunk) {
			multiplier = Math.max(multiplier, this.micropauseService.getWordMultiplier(word));
		}

		if (this.settings.enableMicropause && this.crossesParagraphBoundary(chunk)) {
			multiplier = Math.max(multiplier, 1 + (2.2 - 1) * this.settings.micropauseIntensity);
		}

		if (this.settings.enableMicropause && this.startsAtHeading(this.currentIndex)) {
			multiplier = Math.max(multiplier, 1 + (1.8 - 1) * this.settings.micropauseIntensity);
		}

		return baseDelay * multiplier;
	}

	private crossesParagraphBoundary(chunk: WordData[]): boolean {
		for (let i = 0; i < chunk.length - 1; i++) {
			const current = chunk[i];
			const next = chunk[i + 1];
			if (current && next) {
				const gap = next.start - current.end;
				if (gap >= 2) {
					return true;
				}
			}
		}

		const lastChunkWord = chunk[chunk.length - 1];
		const nextWord = this.words[this.currentIndex + chunk.length];
		if (lastChunkWord && nextWord) {
			const gap = nextWord.start - lastChunkWord.end;
			return gap >= 2;
		}

		return false;
	}

	private startsAtHeading(index: number): boolean {
		return this.headings.some((heading) => heading.wordIndex === index);
	}

	private getCurrentHeading(): HeadingInfo | null {
		let current: HeadingInfo | null = null;
		for (const heading of this.headings) {
			if (heading.wordIndex <= this.currentIndex) {
				current = heading;
			} else {
				break;
			}
		}
		return current;
	}

	private calculateRemainingMs(): number {
		if (this.currentIndex >= this.words.length) {
			return 0;
		}

		const baseDelay = 60000 / this.settings.wpm;
		let total = 0;

		for (let index = this.currentIndex; index < this.words.length; index += this.settings.chunkSize) {
			const chunk = this.words.slice(index, Math.min(index + this.settings.chunkSize, this.words.length));
			let multiplier = 1;
			for (const word of chunk) {
				multiplier = Math.max(multiplier, this.micropauseService.getWordMultiplier(word));
			}

			total += baseDelay * multiplier;
		}

		return total;
	}

	private emitState(finished: boolean) {
		const chunk = this.getCurrentChunk();
		const totalWords = this.words.length;
		const progress = totalWords > 0 ? Math.min((this.currentIndex / totalWords) * 100, 100) : 0;

		this.onStateChange({
			chunk,
			currentIndex: this.currentIndex,
			totalWords,
			progress,
			isPlaying: this.isPlaying,
			finished,
			currentWpm: this.settings.wpm,
			timeRemainingMs: this.calculateRemainingMs(),
			currentHeading: this.getCurrentHeading()
		});
	}
}