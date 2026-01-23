/**
 * Represents a processed word with RSVP metadata
 */
export interface WordData {
    /** The word text for display (punctuation stripped) */
    word: string;
    /** Index of the Optimal Recognition Point (middle letter) */
    orpIndex: number;
    /** Delay multiplier based on punctuation/length (1.0, 1.2, 1.5, or 2.0) */
    delayMultiplier: number;
    /** Trailing punctuation to show after the word */
    punctuation: string;
}

/**
 * Plugin settings interface
 */
export interface SpeedReaderSettings {
    /** Words per minute reading speed */
    wpm: number;
}

/**
 * Default plugin settings
 */
export const DEFAULT_SETTINGS: SpeedReaderSettings = {
    wpm: 300
};
