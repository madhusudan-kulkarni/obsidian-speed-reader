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

function stripMarkdown(text: string): string {
	let result = text;

	result = result.replace(/^---[\s\S]*?---\n?/gm, '');

	result = result.replace(/^```[\s\S]*?^```/gm, '');
	result = result.replace(/```[\s\S]*?```/g, '');

	result = result.replace(/`([^`]+)`/g, '$1');

	result = result.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');

	result = result.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');

	result = result.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match: string, target: string, display: string) => {
		return display ?? target;
	});

	result = result.replace(/^(#{1,6})\s+/gm, '');

	result = result.replace(/\*\*\*([^*]+)\*\*\*/g, '$1');
	result = result.replace(/___([^_\n]+)___/g, '$1');
	result = result.replace(/\*\*([^*]+)\*\*/g, '$1');
	result = result.replace(/(?<!\w)__([^_\n]+)__(?!\w)/g, '$1');
	result = result.replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, '$1');
	result = result.replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, '$1');

	result = result.replace(/~~([^~]+)~~/g, '$1');
	result = result.replace(/==([^=]+)==/g, '$1');
	result = result.replace(/%%([^%]+)%%/g, '');

	result = result.replace(/^[-*+]\s+/gm, ' ');
	result = result.replace(/^\d+\.\s+/gm, ' ');
	result = result.replace(/^>\s+/gm, '');

	result = result.replace(/^---+\s*$/gm, '');
	result = result.replace(/^-{3,}\s*$/gm, '');

	return result;
}

function tokenize(text: string): { raw: string; start: number }[] {
	const tokens: { raw: string; start: number }[] = [];
	const pattern = /\S+/g;
	let match = pattern.exec(text);

	while (match !== null) {
		tokens.push({ raw: match[0], start: match.index });
		match = pattern.exec(text);
	}

	return tokens;
}

function stripLeadingPunctuation(word: string): { clean: string; leading: string } {
	const match = word.match(/^([([{'"(]+)(.+)$/);
	if (match && match[1] && match[2]) {
		return { clean: match[2], leading: match[1] };
	}
	return { clean: word, leading: '' };
}

function parseWords(strippedText: string): WordData[] {
	const words: WordData[] = [];
	const tokens = tokenize(strippedText);

	for (const token of tokens) {
		const { raw, start } = token;
		let displayWord = raw;
		let punctuation = '';

		if (raw.startsWith('(') && raw.endsWith(')') && raw.length > 2) {
			displayWord = raw.slice(1, -1);
			const inner = stripTrailingPunctuation(displayWord);
			displayWord = inner.clean.length > 0 ? inner.clean : displayWord;
			punctuation = inner.punctuation;
		} else {
			const leadingStripped = stripLeadingPunctuation(raw);
			const trailingStripped = stripTrailingPunctuation(leadingStripped.clean);
			displayWord = trailingStripped.clean.length > 0 ? trailingStripped.clean : leadingStripped.clean;
			punctuation = trailingStripped.punctuation;
		}

		words.push({
			raw,
			word: displayWord,
			punctuation,
			orpIndex: calculateORP(displayWord),
			start,
			end: start + raw.length
		});
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
	const strippedText = stripMarkdown(text);
	const words = parseWords(strippedText);
	const headings = extractHeadings(text, words);
	const boundedStartOffset = Math.max(0, startOffset);
	const startWordIndex = findWordIndexAtOffset(words, boundedStartOffset);

	return {
		words,
		headings,
		startWordIndex
	};
}

export { stripMarkdown };