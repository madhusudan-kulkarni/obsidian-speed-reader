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

export function validateSettings(raw: Partial<SpeedReaderSettings> | null | undefined): SpeedReaderSettings {
	const settings = { ...DEFAULT_SETTINGS, ...(raw ?? {}) };

	return {
		wpm: clamp(Math.round(toNumber(settings.wpm, DEFAULT_SETTINGS.wpm)), 50, 5000),
		chunkSize: clamp(Math.round(toNumber(settings.chunkSize, DEFAULT_SETTINGS.chunkSize)), 1, 5),
		fontSize: clamp(Math.round(toNumber(settings.fontSize, DEFAULT_SETTINGS.fontSize)), 24, 200),
		showContext: toBoolean(settings.showContext, DEFAULT_SETTINGS.showContext),
		contextWords: clamp(Math.round(toNumber(settings.contextWords, DEFAULT_SETTINGS.contextWords)), 1, 10),
		showProgress: toBoolean(settings.showProgress, DEFAULT_SETTINGS.showProgress),
		showStats: toBoolean(settings.showStats, DEFAULT_SETTINGS.showStats),
		enableMicropause: toBoolean(settings.enableMicropause, DEFAULT_SETTINGS.enableMicropause),
		micropauseSentence: clamp(toNumber(settings.micropauseSentence, DEFAULT_SETTINGS.micropauseSentence), 1, 3),
		micropauseClause: clamp(toNumber(settings.micropauseClause, DEFAULT_SETTINGS.micropauseClause), 1, 3),
		micropauseNumbers: clamp(toNumber(settings.micropauseNumbers, DEFAULT_SETTINGS.micropauseNumbers), 1, 3),
		micropauseLongWords: clamp(toNumber(settings.micropauseLongWords, DEFAULT_SETTINGS.micropauseLongWords), 1, 2),
		micropauseParagraph: clamp(toNumber(settings.micropauseParagraph, DEFAULT_SETTINGS.micropauseParagraph), 1, 5),
		micropauseHeading: clamp(toNumber(settings.micropauseHeading, DEFAULT_SETTINGS.micropauseHeading), 1, 4),
		enableSlowStart: toBoolean(settings.enableSlowStart, DEFAULT_SETTINGS.enableSlowStart),
		enableAcceleration: toBoolean(settings.enableAcceleration, DEFAULT_SETTINGS.enableAcceleration),
		accelerationDuration: clamp(Math.round(toNumber(settings.accelerationDuration, DEFAULT_SETTINGS.accelerationDuration)), 10, 180),
		accelerationTargetWpm: clamp(Math.round(toNumber(settings.accelerationTargetWpm, DEFAULT_SETTINGS.accelerationTargetWpm)), 50, 5000)
	};
}
