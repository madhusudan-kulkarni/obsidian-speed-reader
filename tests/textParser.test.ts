import { describe, it, expect } from 'vitest';
import { stripMarkdown, parseDocument } from '../src/services/textParser';

describe('stripMarkdown', () => {
	it('strips YAML frontmatter', () => {
		const input = '---\ntitle: My Note\ntags: [test]\n---\nHello world';
		expect(stripMarkdown(input)).not.toContain('---');
		expect(stripMarkdown(input)).toContain('Hello world');
	});

	it('strips fenced code blocks', () => {
		const input = 'Before\n```js\nconst x = 1;\n```\nAfter';
		const result = stripMarkdown(input);
		expect(result).not.toContain('```');
		expect(result).not.toContain('const');
		expect(result).toContain('Before');
		expect(result).toContain('After');
	});

	it('strips inline code', () => {
		expect(stripMarkdown('Use `console.log` here')).toBe('Use console.log here');
	});

	it('strips bold markers', () => {
		expect(stripMarkdown('This is **bold** text')).toBe('This is bold text');
		expect(stripMarkdown('This is __bold__ text')).toBe('This is bold text');
	});

	it('strips italic markers', () => {
		expect(stripMarkdown('This is *italic* text')).toBe('This is italic text');
		expect(stripMarkdown('This is _italic_ text')).toBe('This is italic text');
	});

	it('strips bold+italic markers', () => {
		expect(stripMarkdown('This is ***bold italic*** text')).toBe('This is bold italic text');
	});

	it('strips strikethrough', () => {
		expect(stripMarkdown('This is ~~deleted~~ text')).toBe('This is deleted text');
	});

	it('strips highlights', () => {
		expect(stripMarkdown('This is ==highlighted== text')).toBe('This is highlighted text');
	});

	it('strips comments', () => {
		expect(stripMarkdown('This is %%hidden%% text')).toBe('This is  text');
	});

	it('strips markdown links keeping display text', () => {
		expect(stripMarkdown('[Click here](https://example.com)')).toBe('Click here');
	});

	it('strips image syntax keeping alt text', () => {
		expect(stripMarkdown('![Photo](image.png)')).toBe('Photo');
	});

	it('strips wiki links with display text', () => {
		expect(stripMarkdown('See [[Some Note|Display Text]]')).toBe('See Display Text');
	});

	it('strips wiki links without display text', () => {
		expect(stripMarkdown('See [[Some Note]]')).toBe('See Some Note');
	});

	it('strips heading markers', () => {
		expect(stripMarkdown('# Heading 1')).toBe('Heading 1');
		expect(stripMarkdown('## Heading 2')).toBe('Heading 2');
		expect(stripMarkdown('### Heading 3')).toBe('Heading 3');
	});

	it('strips unordered list markers', () => {
		expect(stripMarkdown('- Item one')).toBe(' Item one');
		expect(stripMarkdown('* Item two')).toBe(' Item two');
		expect(stripMarkdown('+ Item three')).toBe(' Item three');
	});

	it('strips ordered list markers', () => {
		expect(stripMarkdown('1. First item')).toBe(' First item');
		expect(stripMarkdown('42. Some item')).toBe(' Some item');
	});

	it('strips blockquote markers', () => {
		expect(stripMarkdown('> Quoted text')).toBe('Quoted text');
	});

	it('handles plain text unchanged', () => {
		expect(stripMarkdown('Hello world')).toBe('Hello world');
	});

	it('handles mixed markdown content', () => {
		const input = '# Title\n\nThis is **bold** and *italic* with `code`.\n\n- Item one\n- Item two';
		const result = stripMarkdown(input);
		expect(result).not.toContain('#');
		expect(result).not.toContain('**');
		expect(result).not.toContain('*');
		expect(result).not.toContain('`');
		expect(result).toContain('Title');
		expect(result).toContain('bold');
		expect(result).toContain('italic');
		expect(result).toContain('code');
	});
});

describe('parseDocument', () => {
	it('parses plain text into words', () => {
		const doc = parseDocument('Hello world');
		expect(doc.words.length).toBe(2);
		expect(doc.words[0]!.word).toBe('Hello');
		expect(doc.words[1]!.word).toBe('world');
	});

	it('strips markdown before tokenizing', () => {
		const doc = parseDocument('This is **bold** text');
		const boldWord = doc.words.find(w => w.word === 'bold');
		expect(boldWord).toBeDefined();
		expect(boldWord!.word).toBe('bold');
	});

	it('does not include raw markdown markers in words', () => {
		const doc = parseDocument('Read the **important** section');
		for (const word of doc.words) {
			expect(word.word).not.toContain('**');
			expect(word.raw).not.toContain('**');
		}
	});

	it('strips heading # markers from word stream', () => {
		const doc = parseDocument('# Introduction\nSome text here');
		const hashWord = doc.words.find(w => w.word === '#' || w.raw === '#');
		expect(hashWord).toBeUndefined();
	});

	it('still extracts headings with level info', () => {
		const doc = parseDocument('# Introduction\nSome text here');
		expect(doc.headings.length).toBe(1);
		expect(doc.headings[0]!.level).toBe(1);
		expect(doc.headings[0]!.text).toBe('Introduction');
	});

	it('handles wiki links in word stream', () => {
		const doc = parseDocument('See [[My Notes]] for details');
		const linkWord = doc.words.find(w => w.word.includes('[[') || w.word.includes(']]'));
		expect(linkWord).toBeUndefined();
		const displayWord = doc.words.find(w => w.word === 'My');
		expect(displayWord).toBeDefined();
	});

	it('handles YAML frontmatter - no frontmatter words in output', () => {
		const doc = parseDocument('---\ntitle: Test\ndate: 2024-01-01\n---\nContent here');
		const fmWords = doc.words.filter(w => w.word === 'title:' || w.word === 'date:' || w.word === '---');
		expect(fmWords.length).toBe(0);
		expect(doc.words.some(w => w.word === 'Content')).toBe(true);
	});

	it('strips code fences from word stream', () => {
		const doc = parseDocument('Before\n```\ncode here\n```\nAfter');
		const codeWords = doc.words.filter(w => w.word === '```');
		expect(codeWords.length).toBe(0);
	});

	it('handles inline code', () => {
		const doc = parseDocument('Use `console.log` for debugging');
		const codeWord = doc.words.find(w => w.word === 'console.log');
		expect(codeWord).toBeDefined();
		const backtickWord = doc.words.find(w => w.word.includes('`'));
		expect(backtickWord).toBeUndefined();
	});

	it('handles markdown links', () => {
		const doc = parseDocument('Click [here](https://example.com) now');
		const linkWord = doc.words.find(w => w.word === 'here');
		expect(linkWord).toBeDefined();
		const urlWord = doc.words.find(w => w.word.includes('https') || w.word.includes('example.com'));
		expect(urlWord).toBeUndefined();
	});

	it('preserves sentence-ending punctuation', () => {
		const doc = parseDocument('Hello world.');
		expect(doc.words[1]!.word).toBe('world');
		expect(doc.words[1]!.punctuation).toBe('.');
	});

	it('preserves comma punctuation', () => {
		const doc = parseDocument('Hello, world');
		expect(doc.words[0]!.word).toBe('Hello');
		expect(doc.words[0]!.punctuation).toBe(',');
	});

	it('calculates ORP correctly for short words', () => {
		const doc = parseDocument('I am here');
		expect(doc.words.find(w => w.word === 'I')!.orpIndex).toBe(0);
		expect(doc.words.find(w => w.word === 'am')!.orpIndex).toBe(1);
	});

	it('calculates ORP correctly for longer words', () => {
		const doc = parseDocument('important development');
		expect(doc.words.find(w => w.word === 'important')!.orpIndex).toBe(2);
		expect(doc.words.find(w => w.word === 'development')!.orpIndex).toBe(3);
	});

	it('respects startOffset', () => {
		const doc = parseDocument('Hello beautiful world', 8);
		expect(doc.startWordIndex).toBe(1);
	});

	it('handles empty text', () => {
		const doc = parseDocument('');
		expect(doc.words.length).toBe(0);
	});

	it('handles parenthetical words', () => {
		const doc = parseDocument('Hello (world) today');
		const parenWord = doc.words.find(w => w.raw.includes('world'));
		expect(parenWord).toBeDefined();
		expect(parenWord!.word).toBe('world');
	});

	it('extracts multiple headings', () => {
		const doc = parseDocument('# Title 1\nSome text\n## Title 2\nMore text\n### Title 3\nEnd');
		expect(doc.headings.length).toBe(3);
		expect(doc.headings[0]!.level).toBe(1);
		expect(doc.headings[1]!.level).toBe(2);
		expect(doc.headings[2]!.level).toBe(3);
	});

	it('handles image syntax - alt text appears in words', () => {
		const doc = parseDocument('Look at ![Photo](image.png) for reference');
		const altWord = doc.words.find(w => w.word === 'Photo');
		expect(altWord).toBeDefined();
		const urlWord = doc.words.find(w => w.word.includes('image.png'));
		expect(urlWord).toBeUndefined();
	});

	it('handles combined bold and italic', () => {
		const doc = parseDocument('This is ***both*** formats');
		const bothWord = doc.words.find(w => w.word === 'both');
		expect(bothWord).toBeDefined();
		expect(bothWord!.word).not.toContain('*');
	});

	it('handles strikethrough in word stream', () => {
		const doc = parseDocument('This is ~~deleted~~ text');
		const delWord = doc.words.find(w => w.word === 'deleted');
		expect(delWord).toBeDefined();
		expect(delWord!.word).not.toContain('~~');
	});

	it('does not split hyphenated words - tokenized as single tokens', () => {
		const doc = parseDocument('Jean-Claude ran the marathon');
		const hyphenated = doc.words.find(w => w.raw === 'Jean-Claude');
		expect(hyphenated).toBeDefined();
		expect(hyphenated!.word).toBe('Jean-Claude');
	});

	it('preserves underscores in variable-like words', () => {
		const doc = parseDocument('Use my_variable to store data');
		const varWord = doc.words.find(w => w.word === 'my_variable');
		expect(varWord).toBeDefined();
		expect(varWord!.word).toBe('my_variable');
	});

	it('preserves underscores in snake_case identifiers', () => {
		const doc = parseDocument('Access my_long_variable_name here');
		const varWord = doc.words.find(w => w.word === 'my_long_variable_name');
		expect(varWord).toBeDefined();
	});

	it('still strips underscores used for italic markup', () => {
		const doc = parseDocument('This is _italic_ text');
		const italicWord = doc.words.find(w => w.word === 'italic');
		expect(italicWord).toBeDefined();
		const underWord = doc.words.find(w => w.raw === '_italic_');
		expect(underWord).toBeUndefined();
	});

	it('preserves numbers with trailing punctuation', () => {
		const doc = parseDocument('The count was 42.');
		const numWord = doc.words.find(w => w.word === '42');
		expect(numWord).toBeDefined();
		expect(numWord!.punctuation).toBe('.');
	});

	it('handles words inside parentheses - strips parens for display', () => {
		const doc = parseDocument('Hello (aside) world');
		const asideWord = doc.words.find(w => w.raw === '(aside)');
		expect(asideWord).toBeDefined();
		expect(asideWord!.word).toBe('aside');
	});

	it('handles markdown link with nested formatting', () => {
		const doc = parseDocument('[**bold link**](url) text');
		const linkWord = doc.words.find(w => w.raw.includes('bold'));
		expect(linkWord).toBeDefined();
		expect(linkWord!.word).not.toContain('**');
		expect(linkWord!.word).not.toContain('[');
	});

	it('handles multiple wiki links', () => {
		const doc = parseDocument('See [[Note A]] and [[Note B|Display B]] here');
		const bracketWords = doc.words.filter(w => w.word.includes('[[') || w.word.includes(']]'));
		expect(bracketWords.length).toBe(0);
	});

	it('strips list markers and preserves content', () => {
		const doc = parseDocument('- First item\n- Second item\n1. Numbered item');
		const firstWord = doc.words.find(w => w.word === 'First');
		expect(firstWord).toBeDefined();
		const dashWord = doc.words.find(w => w.word === '-');
		expect(dashWord).toBeUndefined();
	});

	it('strips leading parentheses from individual words', () => {
		const doc = parseDocument('The result was (surprising) to everyone');
		const parenWord = doc.words.find(w => w.word === 'surprising');
		expect(parenWord).toBeDefined();
		expect(parenWord!.word).not.toContain('(');
		expect(parenWord!.word).not.toContain(')');
	});

	it('strips leading quote marks from words', () => {
		const doc = parseDocument('"Quoted text" is here');
		const quoteWord = doc.words.find(w => w.word === 'Quoted');
		expect(quoteWord).toBeDefined();
		expect(quoteWord!.word).not.toContain('"');
	});

	it('handles multi-word parenthetical text', () => {
		const doc = parseDocument('Words (in this aside) appear here');
		const asideIn = doc.words.find(w => w.word.includes('('));
		expect(asideIn).toBeUndefined();
	});

	it('strips leading bracket from wiki link remnant tokens', () => {
		const doc = parseDocument('See [[My Note]] for details');
		const bracketWord = doc.words.find(w => w.word.includes('[') || w.word.includes(']'));
		expect(bracketWord).toBeUndefined();
	});
});