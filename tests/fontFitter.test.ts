import { describe, it, expect } from 'vitest';
import { fitWordFont, FontFitInput, MIN_WORD_FONT_SIZE } from '../src/services/fontFitter';

const base = (o: Partial<FontFitInput> = {}): ReturnType<typeof fitWordFont> => fitWordFont({
	leftWidth: 0, orpWidth: 0, rightWidth: 0, gap: 0, baseFontSize: 64,
	availableWidth: 600, availableHeight: 10000, lineHeight: 1.2,
	minFontSize: MIN_WORD_FONT_SIZE, safety: 1, pinned: true, ...o,
});

describe('fitWordFont', () => {
	it('fits at full size', () => expect(base({ leftWidth: 100, orpWidth: 30, rightWidth: 120 })).toEqual({ fontSize: 64, wrap: false }));
	it('exactly fits at boundary', () => expect(base({ leftWidth: 100, orpWidth: 30, rightWidth: 120, availableWidth: 270 })).toEqual({ fontSize: 64, wrap: false }));
	it('shrinks on width', () => expect(base({ leftWidth: 300, orpWidth: 40, rightWidth: 400 })).toEqual({ fontSize: 45, wrap: false }));
	it('shrinks to just above floor', () => expect(base({ leftWidth: 300, orpWidth: 40, rightWidth: 400, availableWidth: 276 })).toEqual({ fontSize: 21, wrap: false }));
	it('below floor -> wrap', () => expect(base({ leftWidth: 300, orpWidth: 40, rightWidth: 400, availableWidth: 200 })).toEqual({ fontSize: 20, wrap: true }));
	it('asymmetric proves 2*max not sum', () => expect(base({ leftWidth: 200, orpWidth: 16, rightWidth: 10, availableWidth: 300 })).toEqual({ fontSize: 46, wrap: false }));
	it('zero available guard', () => expect(base({ leftWidth: 100, orpWidth: 30, rightWidth: 120, availableWidth: 0 })).toEqual({ fontSize: 20, wrap: true }));
	it('NaN available guard', () => expect(base({ leftWidth: 100, orpWidth: 30, rightWidth: 120, availableWidth: NaN })).toEqual({ fontSize: 20, wrap: true }));
	it('empty word', () => expect(base({ availableWidth: 300 })).toEqual({ fontSize: 64, wrap: false }));
	it('base<=min never upscales', () => expect(base({ leftWidth: 100, orpWidth: 16, rightWidth: 100, baseFontSize: 20, availableWidth: 100, minFontSize: 24 })).toEqual({ fontSize: 20, wrap: true }));
	it('safety margin shrinks boundary word', () => expect(base({ leftWidth: 100, rightWidth: 100, availableWidth: 200, safety: 0.98 })).toEqual({ fontSize: 62, wrap: false }));
	it('height cap binds', () => expect(base({ leftWidth: 10, orpWidth: 20, rightWidth: 10, baseFontSize: 200, availableWidth: 1000, availableHeight: 96 })).toEqual({ fontSize: 80, wrap: false }));
	it('height ignored when zero', () => expect(base({ leftWidth: 10, orpWidth: 20, rightWidth: 10, baseFontSize: 200, availableWidth: 1000, availableHeight: 0 })).toEqual({ fontSize: 200, wrap: false }));
	it('non-pinned group uses straight sum', () => expect(base({ leftWidth: 700, gap: 14, availableWidth: 600, pinned: false })).toEqual({ fontSize: 53, wrap: false }));
});
