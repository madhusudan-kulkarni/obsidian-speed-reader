import { App, PluginSettingTab, Setting, TextComponent } from 'obsidian';
import type SpeedReaderPlugin from './main';
import type { SpeedReaderSettings } from './types';
import { DEFAULT_SETTINGS } from './types';

export { DEFAULT_SETTINGS };
export type { SpeedReaderSettings };

export class SpeedReaderSettingTab extends PluginSettingTab {
	plugin: SpeedReaderPlugin;

	constructor(app: App, plugin: SpeedReaderPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl).setName('Reading').setHeading();

		this.addSliderWithInput(
			containerEl,
			'Reading speed',
			'Set your reading speed in words per minute.',
			50,
			5000,
			25,
			this.plugin.settings.wpm,
			async (value) => {
				this.plugin.settings.wpm = value;
				await this.plugin.saveSettings();
			}
		);

		this.addSliderWithInput(
			containerEl,
			'Words per step',
			'Number of words shown together.',
			1,
			5,
			1,
			this.plugin.settings.chunkSize,
			async (value) => {
				this.plugin.settings.chunkSize = value;
				await this.plugin.saveSettings();
			}
		);

		new Setting(containerEl)
			.setName('Orp color')
			.setDesc('Color for the optimal recognition point highlight. Leave empty to use the theme accent color.')
			.addText((text) => text
				.setValue(this.plugin.settings.orpColor)
				.setPlaceholder('Hex color')
				.onChange(async (value) => {
					this.plugin.settings.orpColor = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl).setName('Pacing').setHeading();

		new Setting(containerEl)
			.setName('Enable micropause')
			.setDesc('Adjust word timing based on punctuation and content.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.enableMicropause)
				.onChange(async (value) => {
					this.plugin.settings.enableMicropause = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Soft start')
			.setDesc('Gradually ramp up speed on start or resume to help eyes adjust.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.enableRampUp)
				.onChange(async (value) => {
					this.plugin.settings.enableRampUp = value;
					await this.plugin.saveSettings();
				}));

		this.addSliderWithInput(
			containerEl,
			'Pause intensity',
			'Multiplier for all micropauses. Higher = longer pauses at punctuation, numbers, and long words.',
			1,
			3,
			0.1,
			this.plugin.settings.micropauseIntensity,
			async (value) => {
				this.plugin.settings.micropauseIntensity = value;
				await this.plugin.saveSettings();
			}
		);

		new Setting(containerEl).setName('Display').setHeading();

		new Setting(containerEl)
			.setName('Font family')
			.setDesc('Choose font style for the reading display.')
			.addDropdown((dropdown) => dropdown
				.addOption('default', 'Default')
				.addOption('monospace', 'Monospace (fixed pitch)')
				.addOption('sans-serif', 'Sans-serif')
				.setValue(this.plugin.settings.fontFamily)
				.onChange(async (value) => {
					this.plugin.settings.fontFamily = value as 'default' | 'monospace' | 'sans-serif';
					await this.plugin.saveSettings();
				}));

		this.addSliderWithInput(
			containerEl,
			'Font size',
			'Word font size in pixels.',
			24,
			200,
			2,
			this.plugin.settings.fontSize,
			async (value) => {
				this.plugin.settings.fontSize = value;
				await this.plugin.saveSettings();
			}
		);

		this.addSliderWithInput(
			containerEl,
			'Reading window width',
			'Width of the reading window as a percent of the app window. Applies on next open.',
			40,
			100,
			5,
			this.plugin.settings.windowWidth,
			async (value) => {
				this.plugin.settings.windowWidth = value;
				await this.plugin.saveSettings();
			}
		);

		this.addSliderWithInput(
			containerEl,
			'Reading window max width',
			'Upper limit in pixels that caps the width above, so the window never gets wider than this even at 100% (0 = no limit). Applies on next open.',
			0,
			3000,
			20,
			this.plugin.settings.windowMaxWidth,
			async (value) => {
				this.plugin.settings.windowMaxWidth = value;
				await this.plugin.saveSettings();
			}
		);

		new Setting(containerEl)
			.setName('Show context')
			.setDesc('Display surrounding words around the active chunk.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.showContext)
				.onChange(async (value) => {
					this.plugin.settings.showContext = value;
					await this.plugin.saveSettings();
				}));

		this.addSliderWithInput(
			containerEl,
			'Context words',
			'How many words to show before and after.',
			1,
			10,
			1,
			this.plugin.settings.contextWords,
			async (value) => {
				this.plugin.settings.contextWords = value;
				await this.plugin.saveSettings();
			}
		);

		new Setting(containerEl)
			.setName('Show progress bar')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.showProgress)
				.onChange(async (value) => {
					this.plugin.settings.showProgress = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show stats')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.showStats)
				.onChange(async (value) => {
					this.plugin.settings.showStats = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setDesc('Recommended range: 250-450 words per minute for regular reading, 450+ for scanning.');

		new Setting(containerEl).setName('Blocks').setHeading();

		new Setting(containerEl)
			.setName('Pause on code blocks')
			.setDesc('Stop and show fenced code blocks, then wait for you to continue.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.pauseForCodeBlocks)
				.onChange(async (value) => {
					this.plugin.settings.pauseForCodeBlocks = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Pause on math blocks')
			.setDesc('Stop and show LaTeX equations ($$...$$), then wait for you to continue.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.pauseForMathBlocks)
				.onChange(async (value) => {
					this.plugin.settings.pauseForMathBlocks = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Pause on tables')
			.setDesc('Stop and show Markdown tables, then wait for you to continue.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.pauseForTableBlocks)
				.onChange(async (value) => {
					this.plugin.settings.pauseForTableBlocks = value;
					await this.plugin.saveSettings();
				}));

		this.addSliderWithInput(
			containerEl,
			'Auto-continue after',
			'Seconds to wait before automatically resuming after a block (0 = wait for you to press a key or button).',
			0,
			60,
			1,
			this.plugin.settings.autoResumeSeconds,
			async (value) => {
				this.plugin.settings.autoResumeSeconds = value;
				await this.plugin.saveSettings();
			}
		);
	}

	private addSliderWithInput(
		containerEl: HTMLElement,
		name: string,
		description: string,
		min: number,
		max: number,
		step: number,
		value: number,
		onChange: (value: number) => Promise<void>
	) {
		const setting = new Setting(containerEl).setName(name).setDesc(description);
		let currentValue = value;
		let textComponent: TextComponent | null = null;

		setting.addText((component) => {
			textComponent = component;
			return component
			.setValue(String(currentValue))
			.onChange(async (inputValue) => {
				const parsed = Number.parseFloat(inputValue);
				if (Number.isNaN(parsed)) {
					return;
				}

				const normalized = this.normalizeValue(parsed, min, max, step);
				currentValue = normalized;
				component.setValue(String(normalized));
				await onChange(normalized);
			});
		});

		setting.addSlider((slider) => slider
			.setLimits(min, max, step)
			.setDynamicTooltip()
			.setValue(currentValue)
			.onChange(async (sliderValue) => {
				const normalized = this.normalizeValue(sliderValue, min, max, step);
				currentValue = normalized;
				textComponent?.setValue(String(normalized));
				await onChange(normalized);
			}));
	}

	private normalizeValue(value: number, min: number, max: number, step: number): number {
		const clamped = Math.max(min, Math.min(max, value));
		let rounded = Math.round(clamped / step) * step;
		// A strictly-positive value must not collapse to 0, which some settings use as a
		// sentinel (e.g. "no limit"); snap it up to the first real step instead.
		if (rounded === 0 && clamped > 0) {
			rounded = step;
		}
		if (step < 1) {
			return Number(rounded.toFixed(1));
		}
		return Math.round(rounded);
	}
}