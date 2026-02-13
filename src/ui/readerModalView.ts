import { App, Modal, Notice } from 'obsidian';
import { RSVPEngine } from '../engine/rsvpEngine';
import { HeadingInfo, ReaderState, SpeedReaderSettings, WordData } from '../types';

function formatRemainingTime(milliseconds: number): string {
	const totalSeconds = Math.ceil(milliseconds / 1000);
	if (totalSeconds < 60) {
		return `${totalSeconds}s left`;
	}

	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	if (seconds === 0) {
		return `${minutes}m left`;
	}

	return `${minutes}m ${seconds}s left`;
}

function headingLabel(heading: HeadingInfo): string {
	return `${'#'.repeat(heading.level)} ${heading.text}`;
}

export class SpeedReaderModal extends Modal {
	private readonly sourceText: string;
	private settings: SpeedReaderSettings;
	private readonly onSettingsChange: (settings: SpeedReaderSettings) => void;
	private readonly startOffset: number;
	private engine: RSVPEngine;
	private focusMode = false;
	private state: ReaderState | null = null;

	private wordContainer!: HTMLElement;
	private statsEl!: HTMLElement;
	private progressBarContainer!: HTMLElement;
	private progressBarFill!: HTMLElement;
	private controlsEl!: HTMLElement;
	private contextEl!: HTMLElement;
	private sectionSelect!: HTMLSelectElement;

	constructor(
		app: App,
		text: string,
		settings: SpeedReaderSettings,
		onSettingsChange: (settings: SpeedReaderSettings) => void,
		startOffset = 0
	) {
		super(app);
		this.sourceText = text;
		this.settings = settings;
		this.onSettingsChange = onSettingsChange;
		this.startOffset = startOffset;
		this.engine = new RSVPEngine(
			this.settings,
			(state) => {
				this.state = state;
				this.render();
			},
			() => {
				this.render();
			}
		);
	}

	onOpen() {
		const { contentEl, modalEl } = this;
		modalEl.addClass('speed-reader-modal');
		contentEl.empty();
		contentEl.addClass('speed-reader-content');

		this.wordContainer = contentEl.createDiv({ cls: 'speed-reader-word-container' });
		this.contextEl = contentEl.createDiv({ cls: 'speed-reader-context' });
		this.statsEl = contentEl.createDiv({ cls: 'speed-reader-stats' });

		this.progressBarContainer = contentEl.createDiv({ cls: 'speed-reader-progress-bar' });
		this.progressBarFill = this.progressBarContainer.createDiv({ cls: 'speed-reader-progress-fill' });
		this.progressBarContainer.addEventListener('click', (event) => this.onProgressClick(event));

		this.controlsEl = contentEl.createDiv({ cls: 'speed-reader-controls' });

		this.registerKeyboardHandlers();
		this.engine.loadText(this.sourceText, this.startOffset);
		this.buildHeadingSelector();
		this.engine.play();
	}

	onClose() {
		this.engine.pause();
		this.onSettingsChange(this.settings);
		this.contentEl.empty();
	}

	private registerKeyboardHandlers() {
		this.scope.register([], ' ', (event) => {
			event.preventDefault();
			this.engine.togglePlayPause();
			return false;
		});

		this.scope.register([], 'ArrowLeft', (event) => {
			event.preventDefault();
			this.engine.rewind(10);
			return false;
		});

		this.scope.register([], 'ArrowRight', (event) => {
			event.preventDefault();
			this.engine.fastForward(10);
			return false;
		});

		this.scope.register([], 'ArrowUp', (event) => {
			event.preventDefault();
			this.adjustWpm(25);
			return false;
		});

		this.scope.register([], 'ArrowDown', (event) => {
			event.preventDefault();
			this.adjustWpm(-25);
			return false;
		});

		this.scope.register([], 'f', (event) => {
			event.preventDefault();
			this.focusMode = !this.focusMode;
			this.contentEl.toggleClass('speed-reader-focus-active', this.focusMode);
			this.renderControls();
			return false;
		});

		this.scope.register([], 'Escape', (event) => {
			event.preventDefault();
			this.close();
			return false;
		});
	}

	private buildHeadingSelector() {
		const wrapper = this.statsEl.createDiv({ cls: 'speed-reader-section-select-wrapper' });
		this.sectionSelect = wrapper.createEl('select', { cls: 'speed-reader-section-select' });
		this.sectionSelect.createEl('option', { text: 'Jump to section', value: '' });

		for (const heading of this.engine.getHeadings()) {
			this.sectionSelect.createEl('option', {
				text: headingLabel(heading),
				value: String(heading.wordIndex)
			});
		}

		this.sectionSelect.addEventListener('change', () => {
			const value = this.sectionSelect.value;
			if (value.length === 0) return;

			const wordIndex = Number.parseInt(value, 10);
			if (!Number.isNaN(wordIndex)) {
				this.engine.jumpToHeading(wordIndex);
			}

			this.sectionSelect.value = '';
		});
	}

	private adjustWpm(delta: number) {
		const newWpm = this.engine.adjustWpm(delta);
		this.settings = { ...this.settings, wpm: newWpm };
		this.engine.setSettings(this.settings);
		new Notice(`Speed: ${newWpm} WPM`);
	}

	private onProgressClick(event: MouseEvent) {
		const rect = this.progressBarContainer.getBoundingClientRect();
		if (rect.width <= 0) return;

		const percentage = (event.clientX - rect.left) / rect.width;
		this.engine.seekToPercent(percentage);
	}

	private render() {
		const state = this.state;
		if (!state) return;

		this.renderWord(state);
		this.renderStats(state);
		this.renderProgress(state);
		this.renderContext(state);
		this.renderControls();
		this.renderSectionVisibility();
	}

	private renderWord(state: ReaderState) {
		this.wordContainer.empty();

		if (state.totalWords === 0) {
			this.wordContainer.setText('No text to display');
			return;
		}

		if (state.finished || state.chunk.length === 0) {
			const doneEl = this.wordContainer.createDiv({ cls: 'speed-reader-done' });
			doneEl.createSpan({ text: '✓', cls: 'speed-reader-done-icon' });
			doneEl.createSpan({ text: 'Finished', cls: 'speed-reader-done-text' });
			return;
		}

		const wordWrapper = this.wordContainer.createDiv({ cls: 'speed-reader-word' });
		for (const word of state.chunk) {
			this.renderWordUnit(wordWrapper, word);
		}
	}

	private renderWordUnit(parent: HTMLElement, word: WordData) {
		const unit = parent.createSpan({ cls: 'speed-reader-word-unit' });
		const before = word.word.slice(0, word.orpIndex);
		const orp = word.word.charAt(word.orpIndex);
		const after = word.word.slice(word.orpIndex + 1);

		unit.createSpan({ cls: 'speed-reader-left', text: before });
		unit.createSpan({ cls: 'speed-reader-orp', text: orp });
		unit.createSpan({ cls: 'speed-reader-right', text: `${after}${word.punctuation}` });
	}

	private renderStats(state: ReaderState) {
		this.statsEl.toggleClass('is-hidden', !this.settings.showStats);
		if (!this.settings.showStats) {
			return;
		}

		this.statsEl.querySelectorAll(':scope > :not(.speed-reader-section-select-wrapper)').forEach((el) => el.remove());

		const playPause = this.statsEl.createEl('button', {
			cls: 'speed-reader-play-btn',
			text: state.isPlaying ? '⏸' : '▶'
		});
		playPause.addEventListener('click', () => this.engine.togglePlayPause());

		const speedGroup = this.statsEl.createDiv({ cls: 'speed-reader-speed-control' });
		const decrease = speedGroup.createEl('button', { cls: 'speed-reader-speed-btn', text: '−' });
		decrease.addEventListener('click', () => this.adjustWpm(-25));
		speedGroup.createSpan({ cls: 'speed-reader-wpm', text: String(Math.round(state.currentWpm)) });
		speedGroup.createSpan({ cls: 'speed-reader-wpm-label', text: 'WPM' });
		const increase = speedGroup.createEl('button', { cls: 'speed-reader-speed-btn', text: '+' });
		increase.addEventListener('click', () => this.adjustWpm(25));

		const progressInfo = this.statsEl.createDiv({ cls: 'speed-reader-progress-info' });
		const currentWord = Math.min(state.currentIndex + 1, state.totalWords);
		const percentage = Math.round(state.progress);
		progressInfo.createSpan({ cls: 'speed-reader-count', text: `${currentWord}/${state.totalWords}` });
		progressInfo.createSpan({ cls: 'speed-reader-separator', text: '·' });
		progressInfo.createSpan({ cls: 'speed-reader-count', text: `${percentage}%` });
		progressInfo.createSpan({ cls: 'speed-reader-separator', text: '·' });
		progressInfo.createSpan({ cls: 'speed-reader-time', text: formatRemainingTime(state.timeRemainingMs) });

		if (state.currentHeading) {
			const headingBadge = this.statsEl.createSpan({ cls: 'speed-reader-heading-badge' });
			headingBadge.setText(headingLabel(state.currentHeading));
		}
	}

	private renderProgress(state: ReaderState) {
		this.progressBarContainer.toggleClass('is-hidden', !this.settings.showProgress);
		if (!this.settings.showProgress) {
			return;
		}

		this.progressBarFill.style.width = `${Math.min(state.progress, 100)}%`;
	}

	private renderContext(state: ReaderState) {
		this.contextEl.toggleClass('is-hidden', !this.settings.showContext);
		if (!this.settings.showContext || state.finished) {
			this.contextEl.empty();
			return;
		}

		const context = this.engine.getContext(this.settings.contextWords);
		this.contextEl.empty();

		this.contextEl.createSpan({
			cls: 'speed-reader-context-before',
			text: context.before.join(' ')
		});
		this.contextEl.createSpan({ cls: 'speed-reader-context-current', text: ' • ' });
		this.contextEl.createSpan({
			cls: 'speed-reader-context-after',
			text: context.after.join(' ')
		});
	}

	private renderSectionVisibility() {
		const hasHeadings = this.engine.getHeadings().length > 0;
		if (!this.sectionSelect) return;

		const wrapper = this.sectionSelect.closest('.speed-reader-section-select-wrapper');
		if (!wrapper) return;

		wrapper.toggleClass('is-hidden', !hasHeadings);
	}

	private renderControls() {
		this.controlsEl.empty();
		if (this.focusMode) {
			this.controlsEl.createSpan({ text: 'Focus mode • ' });
			this.createKeyHint('F', 'exit');
			return;
		}

		this.createKeyHint('Space', 'play/pause');
		this.controlsEl.createSpan({ text: ' • ' });
		this.createKeyHint('←/→', 'skip');
		this.controlsEl.createSpan({ text: ' • ' });
		this.createKeyHint('↑/↓', 'speed');
		this.controlsEl.createSpan({ text: ' • ' });
		this.createKeyHint('F', 'focus');
	}

	private createKeyHint(key: string, action: string) {
		const kbd = this.controlsEl.createEl('kbd');
		kbd.setText(key);
		this.controlsEl.createSpan({ text: ` ${action}` });
	}
}
