import { App, PluginSettingTab, Setting } from 'obsidian';
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

		new Setting(containerEl)
			.setName('Reading speed')
			.setDesc('Set your reading speed in words per minute.')
			.addSlider(slider => slider
				.setLimits(100, 1000, 25)
				.setValue(this.plugin.settings.wpm)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.wpm = value;
					await this.plugin.saveSettings();
				}))
			.addText(text => text
				.setValue(String(this.plugin.settings.wpm))
				.onChange(async (value) => {
					const numValue = parseInt(value, 10);
					if (!isNaN(numValue) && numValue >= 100 && numValue <= 1000) {
						this.plugin.settings.wpm = numValue;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setDesc('Start with 200-300 words per minute and gradually increase.');
	}
}
