import { SpeedReaderSettings, WordData } from '../types';

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

		const raw = word.raw;
		const sentenceEnding = /[.!?]["')\]]*$/.test(raw);
		if (sentenceEnding) {
			return this.settings.micropauseSentence;
		}

		const clauseEnding = /[,;:]["')\]]*$/.test(raw);
		if (clauseEnding) {
			return this.settings.micropauseClause;
		}

		if (/\d/.test(raw)) {
			return this.settings.micropauseNumbers;
		}

		if (word.word.length > 8) {
			return this.settings.micropauseLongWords;
		}

		return 1;
	}
}
