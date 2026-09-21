import { ReadingBlock } from '../types';

/**
 * A block extracted from the raw note, augmented with the sentinel token that
 * replaces it in the masked text. The sentinel survives `stripMarkdown` and
 * tokenization so its position can be mapped back to a word index.
 */
export interface ExtractedBlock extends ReadingBlock {
	placeholder: string;
}

export interface BlockExtractionResult {
	/** Source text with each block replaced by a unique sentinel token. */
	text: string;
	blocks: ExtractedBlock[];
}

const CODE_FENCE_RE = /```([^\n`]*)\n([\s\S]*?)```/g;
const MATH_BLOCK_RE = /\$\$([\s\S]*?)\$\$/g;
const TABLE_RE = /^[ \t]*\|[^\n]*\n[ \t]*\|?[ \t]*:?-{2,}:?[ \t]*(?:\|[ \t]*:?-{2,}:?[ \t]*)*\|?[ \t]*(?:\n[ \t]*\|[^\n]*)*/gm;

function makePlaceholder(index: number): string {
	// NUL is non-whitespace (survives tokenization) and is left untouched by
	// every stripMarkdown regex (no backticks, $, |, *, _, ~, %, <>, [], or ---).
	return `\u0000SRBLOCK${index}\u0000`;
}

function codeLanguage(info: string): string | undefined {
	const first = info.trim().split(/\s+/)[0];
	return first && first.length > 0 ? first : undefined;
}

/**
 * Scans the raw note and replaces fenced code blocks, block math ($$...$$), and
 * markdown tables with sentinel tokens, recording each block's raw source.
 *
 * Passes run in priority order so a `$$` inside a code fence or a pipe inside a
 * math block is never mistaken for a separate block.
 */
export function extractBlocks(text: string): BlockExtractionResult {
	const blocks: ExtractedBlock[] = [];
	let counter = 0;

	// Pass 1: fenced code blocks.
	let result = text.replace(CODE_FENCE_RE, (match, info: string) => {
		const placeholder = makePlaceholder(counter);
		blocks.push({
			type: 'code',
			content: match,
			language: codeLanguage(info),
			wordIndex: -1,
			placeholder
		});
		counter++;
		return placeholder;
	});

	// Pass 2: block math.
	result = result.replace(MATH_BLOCK_RE, (match) => {
		const placeholder = makePlaceholder(counter);
		blocks.push({ type: 'math', content: match, wordIndex: -1, placeholder });
		counter++;
		return placeholder;
	});

	// Pass 3: markdown tables.
	result = result.replace(TABLE_RE, (match) => {
		const placeholder = makePlaceholder(counter);
		blocks.push({ type: 'table', content: match, wordIndex: -1, placeholder });
		counter++;
		return placeholder;
	});

	return { text: result, blocks };
}
