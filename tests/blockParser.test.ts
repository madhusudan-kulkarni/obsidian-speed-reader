import { describe, it, expect } from 'vitest';
import { extractBlocks } from '../src/services/blockParser';
import { parseDocument } from '../src/services/textParser';

describe('extractBlocks', () => {
	it('extracts a fenced code block with language', () => {
		const result = extractBlocks('Before\n```js\nconst x = 1;\n```\nAfter');
		expect(result.blocks.length).toBe(1);
		expect(result.blocks[0]!.type).toBe('code');
		expect(result.blocks[0]!.language).toBe('js');
		expect(result.blocks[0]!.content).toContain('const x = 1;');
		expect(result.text).not.toContain('```');
	});

	it('extracts block math', () => {
		const result = extractBlocks('Before\n$$\nx^2 + y^2\n$$\nAfter');
		expect(result.blocks.length).toBe(1);
		expect(result.blocks[0]!.type).toBe('math');
		expect(result.blocks[0]!.content).toContain('x^2');
		expect(result.text).not.toContain('$$');
	});

	it('extracts a markdown table', () => {
		const result = extractBlocks('| A | B |\n|---|---|\n| 1 | 2 |');
		expect(result.blocks.length).toBe(1);
		expect(result.blocks[0]!.type).toBe('table');
		expect(result.blocks[0]!.content).toContain('A');
		expect(result.text).not.toContain('|');
	});

	it('does not treat inline code or inline math as blocks', () => {
		const result = extractBlocks('Use `code` and $x$ here');
		expect(result.blocks.length).toBe(0);
	});

	it('does not treat dollar amounts as math blocks', () => {
		const result = extractBlocks('The cost is $50 total');
		expect(result.blocks.length).toBe(0);
	});

	it('does not treat $$ inside a code fence as math', () => {
		const result = extractBlocks('```\n$$\n```');
		expect(result.blocks.length).toBe(1);
		expect(result.blocks[0]!.type).toBe('code');
	});

	it('extracts multiple blocks in order', () => {
		const result = extractBlocks('```js\ncode\n```\ntext\n$$\nmath\n$$\n| A |\n|---|\n| 1 |');
		const types = result.blocks.map((b) => b.type);
		expect(types).toEqual(['code', 'math', 'table']);
	});
});

describe('parseDocument block word indices', () => {
	it('maps a mid-document code block to the following word index', () => {
		const doc = parseDocument('Intro\n```js\nconst x = 1;\n```\nAfter');
		expect(doc.blocks.length).toBe(1);
		expect(doc.blocks[0]!.type).toBe('code');
		expect(doc.blocks[0]!.wordIndex).toBe(1);
		expect(doc.words.map((w) => w.word)).toEqual(['Intro', 'After']);
	});

	it('maps a leading block to word index 0', () => {
		const doc = parseDocument('```\ncode\n```\nIntro');
		expect(doc.blocks.length).toBe(1);
		expect(doc.blocks[0]!.wordIndex).toBe(0);
		expect(doc.words.map((w) => w.word)).toEqual(['Intro']);
	});

	it('maps a trailing block to word index equal to word count', () => {
		const doc = parseDocument('Intro\n```\ncode\n```');
		expect(doc.blocks.length).toBe(1);
		expect(doc.blocks[0]!.wordIndex).toBe(1);
		expect(doc.words.map((w) => w.word)).toEqual(['Intro']);
	});

	it('maps a table between text segments', () => {
		const doc = parseDocument('Before\n| A | B |\n|---|---|\n| 1 | 2 |\nAfter');
		expect(doc.blocks.length).toBe(1);
		expect(doc.blocks[0]!.type).toBe('table');
		expect(doc.blocks[0]!.wordIndex).toBe(1);
		expect(doc.words.map((w) => w.word)).toEqual(['Before', 'After']);
	});

	it('orders multiple blocks by word index', () => {
		const doc = parseDocument('A\n```\nc1\n```\nB\n$$\nm1\n$$\nC');
		expect(doc.blocks.map((b) => b.type)).toEqual(['code', 'math']);
		expect(doc.blocks[0]!.wordIndex).toBe(1);
		expect(doc.blocks[1]!.wordIndex).toBe(2);
	});
});
