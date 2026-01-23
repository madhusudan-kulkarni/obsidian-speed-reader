import { MarkdownView, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, SpeedReaderSettings, SpeedReaderSettingTab } from './settings';
import { SpeedReaderModal } from './speedReaderModal';

export default class SpeedReaderPlugin extends Plugin {
	settings!: SpeedReaderSettings;

	async onload() {
		await this.loadSettings();

		// Add ribbon icon for quick access
		this.addRibbonIcon('book-open', 'Speed read current note', () => {
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (view) {
				this.startSpeedReading(view);
			} else {
				new Notice('Open a note first');
			}
		});

		// Command: Start speed reading
		this.addCommand({
			id: 'start-speed-reading',
			name: 'Start speed reading',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						this.startSpeedReading(markdownView);
					}
					return true;
				}
				return false;
			}
		});

		// Command: Speed read selection
		this.addCommand({
			id: 'speed-read-selection',
			name: 'Speed read selected text',
			editorCheckCallback: (checking, editor) => {
				const selection = editor.getSelection();
				if (selection && selection.length > 0) {
					if (!checking) {
						this.openSpeedReader(selection);
					}
					return true;
				}
				return false;
			}
		});

		this.addSettingTab(new SpeedReaderSettingTab(this.app, this));
	}

	onunload() { }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<SpeedReaderSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private startSpeedReading(view: MarkdownView) {
		const editor = view.editor;
		let text = editor.getSelection();

		if (!text || text.length === 0) {
			text = editor.getValue();
		}

		if (!text || text.trim().length === 0) {
			new Notice('No text to speed read');
			return;
		}

		this.openSpeedReader(text);
	}

	private openSpeedReader(text: string) {
		const modal = new SpeedReaderModal(
			this.app,
			text,
			this.settings,
			(newWpm) => {
				this.settings.wpm = newWpm;
				void this.saveSettings();
			}
		);
		modal.open();
	}
}
