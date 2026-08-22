import { describe, expect, test } from 'vitest';
import { isRTL } from '../src/utils/rtl';

describe('isRTL', () => {
	test('detects Arabic text', () => {
		expect(isRTL('المعلقة')).toBe(true);
	});

	test('detects Hebrew text', () => {
		expect(isRTL('שָׁלוֹם')).toBe(true);
	});

	test('detects Persian text', () => {
		expect(isRTL('سلام')).toBe(true);
	});

	test('returns false for Latin text', () => {
		expect(isRTL('hello')).toBe(false);
	});

	test('returns false for empty string', () => {
		expect(isRTL('')).toBe(false);
	});

	test('returns false for numbers', () => {
		expect(isRTL('12345')).toBe(false);
	});

	test('detects mixed text with RTL characters', () => {
		expect(isRTL('hello السلام')).toBe(true);
	});

	test('detects Urdu text', () => {
		expect(isRTL('اردو')).toBe(true);
	});

	test('single Arabic character', () => {
		expect(isRTL('ا')).toBe(true);
	});

	test('single Hebrew character', () => {
		expect(isRTL('א')).toBe(true);
	});
});
