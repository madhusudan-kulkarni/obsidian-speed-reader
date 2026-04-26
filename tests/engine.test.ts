/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RSVPEngine } from '../src/engine/rsvpEngine';
import { DEFAULT_SETTINGS } from '../src/types';
import type { SpeedReaderSettings, ReaderState } from '../src/types';

describe('RSVPEngine', () => {
	let engine: RSVPEngine;
	let stateChanges: ReaderState[];
	let Completes: number[];
	const settings: SpeedReaderSettings = { ...DEFAULT_SETTINGS };

	beforeEach(() => {
		vi.useFakeTimers();
		stateChanges = [];
		Completes = [];
		engine = new RSVPEngine(
			settings,
			(state) => stateChanges.push(state),
			() => Completes.push(1)
		);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('loads text and parses words', () => {
		engine.loadText('Hello world');
		expect(stateChanges.length).toBeGreaterThan(0);
		expect(stateChanges[0]!.totalWords).toBe(2);
	});

	it('starts playing when play() is called', () => {
		engine.loadText('One two three');
		engine.play();
		expect(stateChanges[stateChanges.length - 1]!.isPlaying).toBe(true);
	});

	it('pauses when pause() is called', () => {
		engine.loadText('One two three');
		engine.play();
		engine.pause();
		expect(stateChanges[stateChanges.length - 1]!.isPlaying).toBe(false);
	});

	it('toggles play/pause', () => {
		engine.loadText('One two three');
		engine.togglePlayPause();
		expect(stateChanges[stateChanges.length - 1]!.isPlaying).toBe(true);
		engine.togglePlayPause();
		expect(stateChanges[stateChanges.length - 1]!.isPlaying).toBe(false);
	});

	it('advances words on timeout', () => {
		engine.loadText('One two three four five');
		engine.play();
		const initialIndex = stateChanges[0]!.currentIndex;
		vi.advanceTimersByTime(2000);
		const laterIndex = stateChanges[stateChanges.length - 1]!.currentIndex;
		expect(laterIndex).toBeGreaterThan(initialIndex);
	});

	it('resumes from beginning after finishing', () => {
		engine.loadText('One');
		engine.play();
		vi.advanceTimersByTime(1000);
		expect(stateChanges.some(s => s.finished)).toBe(true);
		engine.play();
		expect(stateChanges[stateChanges.length - 1]!.currentIndex).toBe(0);
	});

	it('adjusts WPM', () => {
		engine.loadText('Hello');
		const newWpm = engine.adjustWpm(50);
		expect(newWpm).toBe(DEFAULT_SETTINGS.wpm + 50);
	});

	it('clamps WPM to min 50', () => {
		engine.loadText('Hello');
		const newWpm = engine.adjustWpm(-500);
		expect(newWpm).toBe(50);
	});

	it('clamps WPM to max 5000', () => {
		engine.loadText('Hello');
		const newWpm = engine.adjustWpm(5000);
		expect(newWpm).toBe(5000);
	});

	it('rewinds by word count', () => {
		engine.loadText('One two three four five');
		engine.play();
		vi.advanceTimersByTime(500);
		engine.pause();
		const beforeRewind = stateChanges[stateChanges.length - 1]!.currentIndex;
		engine.rewind(2);
		const afterRewind = stateChanges[stateChanges.length - 1]!.currentIndex;
		expect(afterRewind).toBeLessThan(beforeRewind);
	});

	it('fast forwards by word count', () => {
		engine.loadText('One two three four five');
		engine.fastForward(2);
		expect(stateChanges[stateChanges.length - 1]!.currentIndex).toBe(2);
	});

	it('seeks to percentage', () => {
		engine.loadText('One two three four five six seven eight nine ten');
		engine.seekToPercent(0.5);
		expect(stateChanges[stateChanges.length - 1]!.currentIndex).toBe(5);
	});

	it('updates settings', () => {
		engine.loadText('Hello');
		const newSettings = { ...settings, wpm: 500 };
		engine.setSettings(newSettings);
		expect(engine.getSettings().wpm).toBe(500);
	});

	it('returns headings', () => {
		engine.loadText('# Title\nSome text\n## Section\nMore text');
		const headings = engine.getHeadings();
		expect(headings.length).toBe(2);
		expect(headings[0]!.level).toBe(1);
		expect(headings[0]!.text).toBe('Title');
		expect(headings[1]!.level).toBe(2);
	});

	it('getContext returns surrounding words', () => {
		engine.loadText('One two three four five');
		engine.seekToIndex(2);
		const context = engine.getContext(1);
		expect(context.before).toContain('two');
		expect(context.after).toContain('four');
	});

	it('handles empty text', () => {
		engine.loadText('');
		expect(stateChanges[0]!.totalWords).toBe(0);
	});

	it('calculates progress', () => {
		engine.loadText('One two three four five');
		engine.seekToIndex(2);
		const progress = stateChanges[stateChanges.length - 1]!.progress;
		expect(progress).toBe(40);
	});

	it('engine starts paused after loadText', () => {
		engine.loadText('One two three');
		expect(stateChanges[stateChanges.length - 1]!.isPlaying).toBe(false);
	});
});

describe('Visibility change auto-pause logic', () => {
	it('should pause when document becomes hidden and resume on return', () => {
		let wasPlayingBeforeBlur = false;
		const isPlaying = { value: false };

		const mockEngine = {
			pause: vi.fn(() => { isPlaying.value = false; }),
			play: vi.fn(() => { isPlaying.value = true; }),
		};

		isPlaying.value = true;

		const visibilityHandler = () => {
			if (document.hidden) {
				if (isPlaying.value) {
					wasPlayingBeforeBlur = true;
					mockEngine.pause();
				}
			} else {
				if (wasPlayingBeforeBlur) {
					wasPlayingBeforeBlur = false;
					mockEngine.play();
				}
			}
		};

		Object.defineProperty(document, 'hidden', { value: true, configurable: true });
		visibilityHandler();
		expect(mockEngine.pause).toHaveBeenCalledTimes(1);
		expect(wasPlayingBeforeBlur).toBe(true);

		Object.defineProperty(document, 'hidden', { value: false, configurable: true });
		visibilityHandler();
		expect(mockEngine.play).toHaveBeenCalledTimes(1);
		expect(wasPlayingBeforeBlur).toBe(false);
	});

	it('should not resume if not playing before blur', () => {
		let wasPlayingBeforeBlur = false;
		const isPlaying = { value: false };
		const mockEngine = {
			pause: vi.fn(),
			play: vi.fn(),
		};

		const visibilityHandler = () => {
			if (document.hidden) {
				if (isPlaying.value) {
					wasPlayingBeforeBlur = true;
					mockEngine.pause();
				}
			} else {
				if (wasPlayingBeforeBlur) {
					wasPlayingBeforeBlur = false;
					mockEngine.play();
				}
			}
		};

		Object.defineProperty(document, 'hidden', { value: true, configurable: true });
		visibilityHandler();
		expect(mockEngine.pause).not.toHaveBeenCalled();

		Object.defineProperty(document, 'hidden', { value: false, configurable: true });
		visibilityHandler();
		expect(mockEngine.play).not.toHaveBeenCalled();
	});

	});