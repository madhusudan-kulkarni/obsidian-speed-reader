import { HeadingInfo, ParsedDocument, WordData } from '../types';

function calculateORP(word: string): number {
	const len = word.length;
	if (len <= 1) return 0;
	if (len <= 5) return 1;
	if (len <= 9) return 2;
	return 3;
}

function stripTrailingPunctuation(word: string): { clean: string; punctuation: string } {
	const match = word.match(/^(.+?)([.,!?;:)}\]"']+)$/);
	if (match && match[1] && match[2]) {
		return { clean: match[1], punctuation: match[2] };
	}
	return { clean: word, punctuation: '' };
}

function parseWords(text: string): WordData[] {
	const words: WordData[] = [];
	const matcher = /\S+/g;
	let match = matcher.exec(text);

	while (match !== null) {
		const raw = match[0];
		const start = match.index;
		const end = start + raw.length;
		const stripped = stripTrailingPunctuation(raw);
		const displayWord = stripped.clean.length > 0 ? stripped.clean : raw;

		words.push({
			raw,
			word: displayWord,
			punctuation: stripped.punctuation,
			orpIndex: calculateORP(displayWord),
			start,
			end
		});

		match = matcher.exec(text);
	}

	return words;
}

function findWordIndexAtOffset(words: WordData[], offset: number): number {
	if (words.length === 0) return 0;
	const firstWord = words[0];
	if (!firstWord) return 0;
	if (offset <= firstWord.start) return 0;

	let left = 0;
	let right = words.length - 1;

	while (left <= right) {
		const mid = Math.floor((left + right) / 2);
		const word = words[mid];
		if (!word) {
			break;
		}

		if (offset < word.start) {
			right = mid - 1;
		} else if (offset > word.end) {
			left = mid + 1;
		} else {
			return mid;
		}
	}

	if (left >= words.length) {
		return words.length - 1;
	}

	return left;
}

function extractHeadings(text: string, words: WordData[]): HeadingInfo[] {
	const headings: HeadingInfo[] = [];
	const lines = text.split(/\r?\n/);
	let offset = 0;

	for (const line of lines) {
		const match = line.match(/^\s{0,3}(#{1,6})\s+(.+)$/);
		if (match && match[1] && match[2]) {
			const level = match[1].length;
			const title = match[2].trim();
			if (title.length > 0) {
				const wordIndex = findWordIndexAtOffset(words, offset);
				headings.push({ level, text: title, wordIndex });
			}
		}

		offset += line.length + 1;
	}

	return headings;
}

export function parseDocument(text: string, startOffset = 0): ParsedDocument {
	const words = parseWords(text);
	const headings = extractHeadings(text, words);
	const boundedStartOffset = Math.max(0, startOffset);
	const startWordIndex = findWordIndexAtOffset(words, boundedStartOffset);

	return {
		words,
		headings,
		startWordIndex
	};
}
