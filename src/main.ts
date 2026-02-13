import { Editor, MarkdownView, Menu, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, SpeedReaderSettings, SpeedReaderSettingTab } from './settings';
import { SpeedReaderModal } from './speedReaderModal';
import { validateSettings } from './services/settingsValidator';

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

		this.addCommand({
			id: 'read-entire-note',
			name: 'Read entire note from cursor',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						this.startSpeedReading(markdownView, true);
					}
					return true;
				}
				return false;
			}
		});

		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor) => {
				const selection = editor.getSelection();
				if (!selection || selection.trim().length === 0) {
					return;
				}

				menu.addItem((item) => {
					item
						.setTitle('Read with speed reader')
						.setIcon('book-open')
						.onClick(() => {
							this.openSpeedReader(selection, 0);
						});
				});
			})
		);

		this.addSettingTab(new SpeedReaderSettingTab(this.app, this));
	}

	onunload() { }

	async loadSettings() {
		const raw = await this.loadData() as Partial<SpeedReaderSettings> | null;
		this.settings = validateSettings(Object.assign({}, DEFAULT_SETTINGS, raw));
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private startSpeedReading(view: MarkdownView, forceWholeNote = false) {
		const editor = view.editor;
		let text = editor.getSelection();
		let startOffset = 0;

		if (forceWholeNote || !text || text.length === 0) {
			text = editor.getValue();
			startOffset = editor.posToOffset(editor.getCursor());
		}

		if (!text || text.trim().length === 0) {
			new Notice('No text to speed read');
			return;
		}

		this.openSpeedReader(text, startOffset);
	}

	private openSpeedReader(text: string, startOffset = 0) {
		const modal = new SpeedReaderModal(
			this.app,
			text,
			{ ...this.settings },
			(newSettings) => {
				this.settings = validateSettings(newSettings);
				void this.saveSettings();
			},
			startOffset
		);
		modal.open();
	}
}
