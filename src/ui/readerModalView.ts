import { App, Modal, Notice, Platform } from 'obsidian';
import { RSVPEngine } from '../engine/rsvpEngine';
import { HeadingInfo, ReaderState, SpeedReaderSettings, WordData } from '../types';
import { fitWordFont, FIT_SAFETY, MIN_WORD_FONT_SIZE } from '../services/fontFitter';

/** A non-zero window max width below this (px) would render an unusable reader, so it is floored. */
const MIN_MODAL_MAX_WIDTH = 400;
/** Mirror styles.css: the `.speed-reader-word` gap and the halves'/ORP letter-spacing. */
const WORD_GAP_REM = 0.45;
const LETTER_SPACING_EM = 0.02;
/** Mirror styles.css font weights: the halves render at 500, the ORP glyph at 700. */
const HALF_WORD_WEIGHT = 500;
const ORP_WEIGHT = 700;

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
	private wasPlayingBeforeBlur = false;
	private boundVisibilityHandler: () => void;
	private boundBlurHandler: () => void;

	private ownerDoc!: Document;
	private wordContainer!: HTMLElement;
	private statsEl!: HTMLElement;
	private progressBarContainer!: HTMLElement;
	private progressBarFill!: HTMLElement;
	private controlsEl!: HTMLElement;
	private contextEl!: HTMLElement;
	private sectionSelect!: HTMLSelectElement;

	private measureCtx: CanvasRenderingContext2D | null = null;
	private availableWidth = 0;
	private remPx = 16;
	private fontFamily = '';
	private resizeObserver: ResizeObserver | null = null;
	private resizeScheduled = false;
	private lastMeasuredWidth = -1;

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
		this.boundVisibilityHandler = () => this.handleVisibilityChange();
		this.boundBlurHandler = () => this.handleWindowBlur();
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
		this.ownerDoc = this.containerEl.ownerDocument;
		const { contentEl, modalEl } = this;
		modalEl.addClass('speed-reader-modal');
		// On mobile, keep Obsidian's native (near full-screen) modal sizing.
		if (!Platform.isMobile) {
			// Obsidian's --modal-width custom property is not honored by every theme/version
			// (the modal then sizes to its content), so set width/max-width directly and with
			// priority so the configured size always wins.
			const modalWidth = `min(${this.settings.windowWidth}vw, calc(100vw - 4rem))`;
			const cappedMax = this.settings.windowMaxWidth > 0
				? Math.max(this.settings.windowMaxWidth, MIN_MODAL_MAX_WIDTH)
				: 0;
			modalEl.style.setProperty('width', modalWidth, 'important');
			modalEl.style.setProperty('max-width', cappedMax > 0 ? `${cappedMax}px` : 'none', 'important');
		}
		contentEl.empty();
		contentEl.addClass('speed-reader-content');
		contentEl.setAttr('tabindex', '-1');
		contentEl.focus();

		this.wordContainer = contentEl.createDiv({ cls: 'speed-reader-word-container' });
		this.wordContainer.style.setProperty('--speed-reader-font-size', `${this.settings.fontSize}px`);
		if (this.settings.orpColor) {
			this.wordContainer.style.setProperty('--speed-reader-orp-color', this.settings.orpColor);
		}
		this.contextEl = contentEl.createDiv({ cls: 'speed-reader-context' });
		this.statsEl = contentEl.createDiv({ cls: 'speed-reader-stats' });

		this.progressBarContainer = contentEl.createDiv({ cls: 'speed-reader-progress-bar' });
		this.progressBarFill = this.progressBarContainer.createDiv({ cls: 'speed-reader-progress-fill' });
		this.progressBarContainer.addEventListener('click', (event) => this.onProgressClick(event));

		this.controlsEl = contentEl.createDiv({ cls: 'speed-reader-controls' });

		this.refreshMetrics();
		this.resizeObserver = new ResizeObserver(() => this.onContainerResize());
		this.resizeObserver.observe(this.wordContainer);
		void this.ownerDoc.fonts?.ready.then(() => {
			if (this.contentEl.isConnected) {
				this.refreshMetrics();
				if (this.state) this.render();
			}
		});

		this.registerKeyboardHandlers();
		this.registerFocusHandlers();
		this.engine.loadText(this.sourceText, this.startOffset);
		this.buildHeadingSelector();
	}

	onClose() {
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		this.ownerDoc.removeEventListener('visibilitychange', this.boundVisibilityHandler);
		this.ownerDoc.defaultView?.removeEventListener('blur', this.boundBlurHandler);
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

		this.contentEl.addEventListener('keydown', (event) => {
			if (event.key === ' ') {
				event.preventDefault();
				this.engine.togglePlayPause();
			}
		});
	}

	private registerFocusHandlers() {
		this.ownerDoc.addEventListener('visibilitychange', this.boundVisibilityHandler);
		this.ownerDoc.defaultView?.addEventListener('blur', this.boundBlurHandler);
	}

	private handleVisibilityChange() {
		if (this.ownerDoc.hidden) {
			this.pauseIfPlaying();
		} else if (this.wasPlayingBeforeBlur) {
			this.wasPlayingBeforeBlur = false;
			this.engine.play();
		}
	}

	private handleWindowBlur() {
		if (!this.ownerDoc.hidden) {
			this.pauseIfPlaying();
		}
	}

	private pauseIfPlaying() {
		const state = this.state;
		if (state?.isPlaying) {
			this.wasPlayingBeforeBlur = true;
			this.engine.pause();
		}
	}

	private refocusContent() {
		const active = this.ownerDoc.activeElement;
		if (active instanceof HTMLButtonElement || active instanceof HTMLSelectElement) {
			this.contentEl.focus();
		}
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
			this.refocusContent();
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
		this.refocusContent();
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
		this.applyWordFit(wordWrapper, state.chunk);
		for (const word of state.chunk) {
			this.renderWordUnit(wordWrapper, word);
		}
	}

	private splitWord(word: WordData): { before: string; orp: string; after: string } {
		return {
			before: word.word.slice(0, word.orpIndex),
			orp: word.word.charAt(word.orpIndex),
			after: `${word.word.slice(word.orpIndex + 1)}${word.punctuation}`
		};
	}

	private renderWordUnit(parent: HTMLElement, word: WordData) {
		const unit = parent.createSpan({ cls: 'speed-reader-word-unit' });
		const { before, orp, after } = this.splitWord(word);

		unit.createSpan({ cls: 'speed-reader-left', text: before });
		unit.createSpan({ cls: 'speed-reader-orp', text: orp });
		unit.createSpan({ cls: 'speed-reader-right', text: after });
	}

	private refreshMetrics() {
		const cs = getComputedStyle(this.wordContainer);
		const padL = parseFloat(cs.paddingLeft) || 0;
		const padR = parseFloat(cs.paddingRight) || 0;
		this.availableWidth = this.wordContainer.clientWidth - padL - padR;
		this.fontFamily = cs.getPropertyValue('--font-text').trim() || 'sans-serif';
		this.remPx = parseFloat(getComputedStyle(this.ownerDoc.documentElement).fontSize) || 16;
		this.lastMeasuredWidth = this.wordContainer.clientWidth;
	}

	private onContainerResize() {
		if (this.resizeScheduled) return;
		this.resizeScheduled = true;
		requestAnimationFrame(() => {
			this.resizeScheduled = false;
			if (!this.resizeObserver || !this.wordContainer.isConnected) return;
			if (this.wordContainer.clientWidth === this.lastMeasuredWidth) return;
			this.refreshMetrics();
			if (this.state) this.render();
		});
	}

	private getMeasureCtx(): CanvasRenderingContext2D | null {
		if (!this.measureCtx) {
			this.measureCtx = this.ownerDoc.createElement('canvas').getContext('2d');
		}
		return this.measureCtx;
	}

	private measurePart(text: string, weight: number): number {
		const ctx = this.getMeasureCtx();
		if (!ctx) return 0;
		ctx.font = `${weight} ${this.settings.fontSize}px ${this.fontFamily}`;
		const styled = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
		styled.letterSpacing = `${LETTER_SPACING_EM * this.settings.fontSize}px`;
		return ctx.measureText(text).width;
	}

	private measureWordParts(word: WordData): { left: number; orp: number; right: number } {
		const { before, orp, after } = this.splitWord(word);
		return {
			left: this.measurePart(before, HALF_WORD_WEIGHT),
			orp: this.measurePart(orp, ORP_WEIGHT),
			right: this.measurePart(after, HALF_WORD_WEIGHT)
		};
	}

	private applyWordFit(wordWrapper: HTMLElement, chunk: WordData[]) {
		const shared = {
			baseFontSize: this.settings.fontSize,
			availableWidth: this.availableWidth,
			// Height is not constrained: the modal is content-sized and grows to
			// fit, so width is the only fit axis.
			availableHeight: 0,
			lineHeight: 0,
			minFontSize: MIN_WORD_FONT_SIZE,
			safety: FIT_SAFETY
		};

		if (chunk.length === 1) {
			const word = chunk[0];
			if (!word) return;
			const parts = this.measureWordParts(word);
			const fit = fitWordFont({
				...shared,
				leftWidth: parts.left,
				orpWidth: parts.orp,
				rightWidth: parts.right,
				gap: 0,
				pinned: true
			});
			wordWrapper.style.fontSize = `${fit.fontSize}px`;
			wordWrapper.toggleClass('is-pinned', !fit.wrap);
			wordWrapper.toggleClass('is-wrapping', fit.wrap);
			return;
		}

		let totalTextWidth = 0;
		for (const word of chunk) {
			const parts = this.measureWordParts(word);
			totalTextWidth += parts.left + parts.orp + parts.right;
		}
		const gapPx = WORD_GAP_REM * this.remPx * (chunk.length - 1);
		const fit = fitWordFont({
			...shared,
			leftWidth: totalTextWidth,
			orpWidth: 0,
			rightWidth: 0,
			gap: gapPx,
			pinned: false
		});
		wordWrapper.style.fontSize = `${fit.fontSize}px`;
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
		playPause.addEventListener('click', () => {
			this.engine.togglePlayPause();
			this.refocusContent();
		});

		const speedGroup = this.statsEl.createDiv({ cls: 'speed-reader-speed-control' });
		const decrease = speedGroup.createEl('button', { cls: 'speed-reader-speed-btn', text: '−' });
		decrease.addEventListener('click', () => { this.adjustWpm(-25); this.refocusContent(); });
		speedGroup.createSpan({ cls: 'speed-reader-wpm', text: String(Math.round(state.currentWpm)) });
		speedGroup.createSpan({ cls: 'speed-reader-wpm-label', text: 'WPM' });
		const increase = speedGroup.createEl('button', { cls: 'speed-reader-speed-btn', text: '+' });
		increase.addEventListener('click', () => { this.adjustWpm(25); this.refocusContent(); });

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
