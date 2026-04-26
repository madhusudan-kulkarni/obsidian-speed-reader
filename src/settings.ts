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

		this.addSliderWithInput(containerEl, 'Sentence pause', 'Multiplier for ., ! and ?', 1, 3, 0.1, this.plugin.settings.micropauseSentence, async (value) => {
			this.plugin.settings.micropauseSentence = value;
			await this.plugin.saveSettings();
		});

		this.addSliderWithInput(containerEl, 'Clause pause', 'Multiplier for commas and semicolons', 1, 3, 0.1, this.plugin.settings.micropauseClause, async (value) => {
			this.plugin.settings.micropauseClause = value;
			await this.plugin.saveSettings();
		});

		this.addSliderWithInput(containerEl, 'Number pause', 'Multiplier for numbers and dates', 1, 3, 0.1, this.plugin.settings.micropauseNumbers, async (value) => {
			this.plugin.settings.micropauseNumbers = value;
			await this.plugin.saveSettings();
		});

		this.addSliderWithInput(containerEl, 'Long word pause', 'Multiplier for words longer than 8 characters', 1, 2, 0.1, this.plugin.settings.micropauseLongWords, async (value) => {
			this.plugin.settings.micropauseLongWords = value;
			await this.plugin.saveSettings();
		});

		this.addSliderWithInput(containerEl, 'Paragraph pause', 'Multiplier when crossing paragraph boundaries', 1, 5, 0.1, this.plugin.settings.micropauseParagraph, async (value) => {
			this.plugin.settings.micropauseParagraph = value;
			await this.plugin.saveSettings();
		});

		this.addSliderWithInput(containerEl, 'Heading pause', 'Multiplier when a section heading appears', 1, 4, 0.1, this.plugin.settings.micropauseHeading, async (value) => {
			this.plugin.settings.micropauseHeading = value;
			await this.plugin.saveSettings();
		});

		new Setting(containerEl)
			.setName('Slow start')
			.setDesc('Start slightly slower for the first few words.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.enableSlowStart)
				.onChange(async (value) => {
					this.plugin.settings.enableSlowStart = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Acceleration')
			.setDesc('Increase reading speed gradually over time.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.enableAcceleration)
				.onChange(async (value) => {
					this.plugin.settings.enableAcceleration = value;
					await this.plugin.saveSettings();
				}));

		this.addSliderWithInput(containerEl, 'Acceleration duration', 'Seconds to reach target speed', 10, 180, 5, this.plugin.settings.accelerationDuration, async (value) => {
			this.plugin.settings.accelerationDuration = value;
			await this.plugin.saveSettings();
		});

		this.addSliderWithInput(containerEl, 'Acceleration target', 'Target WPM while acceleration is enabled', 50, 5000, 25, this.plugin.settings.accelerationTargetWpm, async (value) => {
			this.plugin.settings.accelerationTargetWpm = value;
			await this.plugin.saveSettings();
		});

		new Setting(containerEl).setName('Display').setHeading();

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

		new Setting(containerEl)
			.setName('Show context')
			.setDesc('Display surrounding words around the active chunk.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.showContext)
				.onChange(async (value) => {
					this.plugin.settings.showContext = value;
					await this.plugin.saveSettings();
				}));

		this.addSliderWithInput(containerEl, 'Context words', 'How many words to show before and after', 1, 10, 1, this.plugin.settings.contextWords, async (value) => {
			this.plugin.settings.contextWords = value;
			await this.plugin.saveSettings();
		});

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
		const rounded = Math.round(clamped / step) * step;
		if (step < 1) {
			return Number(rounded.toFixed(1));
		}
		return Math.round(rounded);
	}
}
