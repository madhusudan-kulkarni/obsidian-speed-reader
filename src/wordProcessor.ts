import { WordData } from './types';

/**
 * Calculate the Optimal Recognition Point (ORP) index for a word.
 * The ORP is approximately the middle of the word, slightly left-biased.
 *
 * Word Length | ORP Position
 * 1           | 0 (1st letter)
 * 2-3         | 1 (2nd letter)
 * 4-5         | 1 (2nd letter)
 * 6-7         | 2 (3rd letter)
 * 8-9         | 2 (3rd letter)
 * 10+         | 3 (4th letter)
 */
export function calculateORP(word: string): number {
    const len = word.length;
    if (len <= 1) return 0;
    if (len <= 5) return 1;
    if (len <= 9) return 2;
    return 3;
}

/**
 * Determine the delay multiplier based on word content.
 *
 * Rules:
 * - Sentence end (. ! ?) → 2.0x delay
 * - Clause break (, ;) → 1.5x delay
 * - Long word (> 8 chars) → 1.2x delay
 * - Default → 1.0x delay
 */
export function getDelayMultiplier(word: string): number {
    const lastChar = word.slice(-1);

    // Sentence endings get the longest pause
    if (['.', '!', '?'].includes(lastChar)) {
        return 2.0;
    }

    // Clause breaks get a medium pause
    if ([',', ';'].includes(lastChar)) {
        return 1.5;
    }

    // Long words need more reading time
    if (word.length > 8) {
        return 1.2;
    }

    return 1.0;
}

/**
 * Strip trailing punctuation from a word for cleaner display.
 * Returns the clean word and the stripped punctuation.
 */
function stripPunctuation(word: string): { clean: string; punctuation: string } {
    const match = word.match(/^(.+?)([.,!?;:)}\]"']+)$/);
    if (match && match[1] && match[2]) {
        return { clean: match[1], punctuation: match[2] };
    }
    return { clean: word, punctuation: '' };
}

/**
 * Parse text into an array of WordData objects with RSVP metadata.
 * Splits on whitespace and calculates ORP + timing for each word.
 */
export function parseText(text: string): WordData[] {
    const words = text.split(/\s+/).filter(word => word.length > 0);

    return words.map(word => {
        const { clean, punctuation } = stripPunctuation(word);
        return {
            word: clean,
            orpIndex: calculateORP(clean),
            delayMultiplier: getDelayMultiplier(word),
            punctuation
        };
    });
}

/**
 * Calculate the base delay in milliseconds for a given WPM.
 * Formula: 60000ms / WPM = ms per word
 */
export function calculateBaseDelay(wpm: number): number {
    return 60000 / wpm;
}
