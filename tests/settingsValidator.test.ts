import { describe, it, expect } from 'vitest';
import { validateSettings } from '../src/services/settingsValidator';
import { DEFAULT_SETTINGS } from '../src/types';

describe('validateSettings window width', () => {
	it('defaults when missing', () => {
		const s = validateSettings({});
		expect(s.windowWidth).toBe(95);
		expect(s.windowMaxWidth).toBe(780);
	});

	it('clamps windowWidth to [40,100] and rounds', () => {
		expect(validateSettings({ windowWidth: 10 }).windowWidth).toBe(40);
		expect(validateSettings({ windowWidth: 999 }).windowWidth).toBe(100);
		expect(validateSettings({ windowWidth: 72.6 }).windowWidth).toBe(73);
	});

	it('clamps windowMaxWidth to [0,3000], preserves 0 = no limit', () => {
		expect(validateSettings({ windowMaxWidth: -5 }).windowMaxWidth).toBe(0);
		expect(validateSettings({ windowMaxWidth: 0 }).windowMaxWidth).toBe(0);
		expect(validateSettings({ windowMaxWidth: 99999 }).windowMaxWidth).toBe(3000);
	});

	it('coerces non-numbers to defaults', () => {
		expect(validateSettings({ windowWidth: 'x' as unknown as number }).windowWidth).toBe(95);
		expect(validateSettings({ windowMaxWidth: null as unknown as number }).windowMaxWidth).toBe(780);
	});

	it('leaves DEFAULT_SETTINGS values intact', () => {
		expect(DEFAULT_SETTINGS.windowWidth).toBe(95);
		expect(DEFAULT_SETTINGS.windowMaxWidth).toBe(780);
	});
});
