import { DEFAULT_SETTINGS, SpeedReaderSettings } from '../types';

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

function toNumber(value: unknown, fallback: number): number {
	if (typeof value === 'number' && !Number.isNaN(value)) {
		return value;
	}
	return fallback;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
	if (typeof value === 'boolean') {
		return value;
	}
	return fallback;
}

function toString(value: unknown, fallback: string): string {
	if (typeof value === 'string') {
		return value;
	}
	return fallback;
}

function toFontFamily(value: unknown): 'default' | 'monospace' | 'sans-serif' {
	if (value === 'monospace' || value === 'sans-serif' || value === 'default') {
		return value;
	}
	return DEFAULT_SETTINGS.fontFamily;
}

export function validateSettings(raw: Partial<SpeedReaderSettings> | null | undefined): SpeedReaderSettings {
	const settings = { ...DEFAULT_SETTINGS, ...(raw ?? {}) };

	return {
		wpm: clamp(Math.round(toNumber(settings.wpm, DEFAULT_SETTINGS.wpm)), 50, 5000),
		chunkSize: clamp(Math.round(toNumber(settings.chunkSize, DEFAULT_SETTINGS.chunkSize)), 1, 5),
		fontSize: clamp(Math.round(toNumber(settings.fontSize, DEFAULT_SETTINGS.fontSize)), 24, 200),
		windowWidth: clamp(Math.round(toNumber(settings.windowWidth, DEFAULT_SETTINGS.windowWidth)), 40, 100),
		windowMaxWidth: clamp(Math.round(toNumber(settings.windowMaxWidth, DEFAULT_SETTINGS.windowMaxWidth)), 0, 3000),
		fontFamily: toFontFamily(settings.fontFamily),
		orpColor: toString(settings.orpColor, DEFAULT_SETTINGS.orpColor),
		showContext: toBoolean(settings.showContext, DEFAULT_SETTINGS.showContext),
		contextWords: clamp(Math.round(toNumber(settings.contextWords, DEFAULT_SETTINGS.contextWords)), 1, 10),
		showProgress: toBoolean(settings.showProgress, DEFAULT_SETTINGS.showProgress),
		showStats: toBoolean(settings.showStats, DEFAULT_SETTINGS.showStats),
		enableMicropause: toBoolean(settings.enableMicropause, DEFAULT_SETTINGS.enableMicropause),
		micropauseIntensity: clamp(toNumber(settings.micropauseIntensity, DEFAULT_SETTINGS.micropauseIntensity), 1, 3),
		enableRampUp: toBoolean(settings.enableRampUp, DEFAULT_SETTINGS.enableRampUp),
		pauseForCodeBlocks: toBoolean(settings.pauseForCodeBlocks, DEFAULT_SETTINGS.pauseForCodeBlocks),
		pauseForMathBlocks: toBoolean(settings.pauseForMathBlocks, DEFAULT_SETTINGS.pauseForMathBlocks),
		pauseForTableBlocks: toBoolean(settings.pauseForTableBlocks, DEFAULT_SETTINGS.pauseForTableBlocks)
	};
}