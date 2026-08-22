export const MIN_WORD_FONT_SIZE = 20;
export const FIT_SAFETY = 0.98;

export interface FontFitInput {
	/** px @ baseFontSize, weight 500 (before-ORP text). For non-pinned rows, the whole row's natural text width. */
	leftWidth: number;
	/** px @ baseFontSize, weight 700 (ORP glyph). 0 when non-pinned. */
	orpWidth: number;
	/** px @ baseFontSize, weight 500 (after-ORP text + trailing punctuation). 0 when non-pinned. */
	rightWidth: number;
	/** total inter-column/inter-unit gap px @ baseFontSize. 0 for the single pinned unit. */
	gap: number;
	/** user Font size setting == measurement base == hard cap. */
	baseFontSize: number;
	/** content-box px of the word container. */
	availableWidth: number;
	/** content-box px; <= 0 or non-finite => height ignored. */
	availableHeight: number;
	/** line-height multiplier; <= 0 => height ignored. */
	lineHeight: number;
	/** floor before wrapping. */
	minFontSize: number;
	/** e.g. 0.98; <= 0 treated as 1. */
	safety: number;
	/** true = single-word ORP pin (equal columns); false = centered group row. */
	pinned: boolean;
}

export interface FontFitResult {
	fontSize: number;
	wrap: boolean;
}

function safeWidth(n: number): number {
	return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Pure font-fit calculation. No DOM/canvas — inputs are already-measured pixel
 * widths at baseFontSize; output is the final font size and whether the word
 * must wrap (it is too long to fit even at the floor).
 */
export function fitWordFont(input: FontFitInput): FontFitResult {
	// Guarantees the cap is never exceeded and handles base <= min misconfig.
	const floor = Math.min(input.minFontSize, input.baseFontSize);

	if (!Number.isFinite(input.availableWidth) || input.availableWidth <= 0) {
		return { fontSize: floor, wrap: true };
	}

	const left = safeWidth(input.leftWidth);
	const orp = safeWidth(input.orpWidth);
	const right = safeWidth(input.rightWidth);
	const gap = safeWidth(input.gap);

	// Pinned: left & right are equal flex columns, so each must fit the LARGER
	// side to keep the ORP centered -> 2*max(L,R)+orp, NOT L+orp+R.
	const neededAtBase = input.pinned
		? 2 * Math.max(left, right) + orp + gap
		: left + orp + right + gap;

	const usableW = input.availableWidth * (input.safety > 0 ? input.safety : 1);
	// Advance width is linear in px, so measure-at-base-and-scale is exact.
	const widthSize = neededAtBase > 0 ? input.baseFontSize * (usableW / neededAtBase) : input.baseFontSize;

	if (widthSize < floor) {
		// Too long to fit even at the floor -> wrap this single word instead.
		return { fontSize: floor, wrap: true };
	}

	// Height cap only ever shrinks; wrapping would only worsen height.
	const heightSize = Number.isFinite(input.availableHeight) && input.availableHeight > 0 && input.lineHeight > 0
		? input.availableHeight / input.lineHeight
		: Infinity;

	let size = Math.floor(Math.min(input.baseFontSize, widthSize, heightSize));
	if (size < floor) size = floor;
	return { fontSize: size, wrap: false };
}
