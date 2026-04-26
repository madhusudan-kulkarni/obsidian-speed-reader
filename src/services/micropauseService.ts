import { SpeedReaderSettings, WordData } from '../types';

const BASE_PAUSES = {
	sentence: 2.0,
	clause: 1.5,
	numbers: 1.8,
	longWords: 1.2
};

export class MicropauseService {
	private settings: SpeedReaderSettings;

	constructor(settings: SpeedReaderSettings) {
		this.settings = settings;
	}

	updateSettings(settings: SpeedReaderSettings) {
		this.settings = settings;
	}

	getWordMultiplier(word: WordData): number {
		if (!this.settings.enableMicropause) {
			return 1;
		}

		const intensity = this.settings.micropauseIntensity;
		const raw = word.raw;

		const sentenceEnding = /[.!?]["')\]]*$/.test(raw);
		if (sentenceEnding) {
			return 1 + (BASE_PAUSES.sentence - 1) * intensity;
		}

		const clauseEnding = /[,;:]["')\]]*$/.test(raw);
		if (clauseEnding) {
			return 1 + (BASE_PAUSES.clause - 1) * intensity;
		}

		if (/\d/.test(raw)) {
			return 1 + (BASE_PAUSES.numbers - 1) * intensity;
		}

		if (word.word.length > 8) {
			return 1 + (BASE_PAUSES.longWords - 1) * intensity;
		}

		return 1;
	}
}