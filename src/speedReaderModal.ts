import { App, Modal, Notice } from 'obsidian';
import { SpeedReaderSettings, WordData } from './types';
import { calculateBaseDelay, parseText } from './wordProcessor';

export class SpeedReaderModal extends Modal {
    private words: WordData[] = [];
    private currentIndex = 0;
    private isPlaying = false;
    private timeoutId: number | null = null;
    private settings: SpeedReaderSettings;
    private currentWpm: number;
    private focusMode = false;
    private onSettingsChange: (wpm: number) => void;

    // DOM elements (initialized in onOpen)
    private wordContainer!: HTMLElement;
    private progressBarContainer!: HTMLElement;
    private progressBarFill!: HTMLElement;
    private statsEl!: HTMLElement;
    private controlsEl!: HTMLElement;

    constructor(
        app: App,
        text: string,
        settings: SpeedReaderSettings,
        onSettingsChange?: (wpm: number) => void
    ) {
        super(app);
        this.settings = settings;
        this.currentWpm = settings.wpm;
        this.words = parseText(text);
        this.onSettingsChange = onSettingsChange ?? (() => { });
    }

    onOpen() {
        const { contentEl, modalEl } = this;

        modalEl.addClass('speed-reader-modal');
        contentEl.empty();
        contentEl.addClass('speed-reader-content');

        // Word display container
        this.wordContainer = contentEl.createDiv({ cls: 'speed-reader-word-container' });

        // Stats row (WPM + time remaining)
        this.statsEl = contentEl.createDiv({ cls: 'speed-reader-stats' });

        // Progress bar
        this.progressBarContainer = contentEl.createDiv({ cls: 'speed-reader-progress-bar' });
        this.progressBarFill = this.progressBarContainer.createDiv({ cls: 'speed-reader-progress-fill' });

        // Make progress bar clickable
        this.progressBarContainer.addEventListener('click', (e) => this.onProgressClick(e));

        // Controls hint
        this.controlsEl = contentEl.createDiv({ cls: 'speed-reader-controls' });

        this.registerKeyboardHandlers();
        this.renderCurrentWord();
        this.updateStats();
        this.updateControls();
        this.play();
    }

    onClose() {
        this.pause();
        // Save WPM if changed
        if (this.currentWpm !== this.settings.wpm) {
            this.onSettingsChange(this.currentWpm);
        }
        this.contentEl.empty();
    }

    private registerKeyboardHandlers() {
        // Space key - use ' ' not 'Space'
        this.scope.register([], ' ', (e) => {
            e.preventDefault();
            this.togglePlayPause();
            return false;
        });

        this.scope.register([], 'ArrowLeft', (e) => {
            e.preventDefault();
            this.rewind(10);
            return false;
        });

        this.scope.register([], 'ArrowRight', (e) => {
            e.preventDefault();
            this.fastForward(10);
            return false;
        });

        // WPM adjustment
        this.scope.register([], 'ArrowUp', (e) => {
            e.preventDefault();
            this.adjustWpm(25);
            return false;
        });

        this.scope.register([], 'ArrowDown', (e) => {
            e.preventDefault();
            this.adjustWpm(-25);
            return false;
        });

        // Focus mode toggle
        this.scope.register([], 'f', (e) => {
            e.preventDefault();
            this.toggleFocusMode();
            return false;
        });

        this.scope.register([], 'Escape', (e) => {
            e.preventDefault();
            this.close();
            return false;
        });
    }

    private renderCurrentWord() {
        if (this.words.length === 0) {
            this.wordContainer.setText('No text to display');
            return;
        }

        if (this.currentIndex >= this.words.length) {
            this.pause();
            this.wordContainer.empty();
            const doneEl = this.wordContainer.createDiv({ cls: 'speed-reader-done' });
            doneEl.createSpan({ text: '✓', cls: 'speed-reader-done-icon' });
            doneEl.createSpan({ text: 'Finished', cls: 'speed-reader-done-text' });
            this.updateProgressBar();
            return;
        }

        const wordData = this.words[this.currentIndex];
        if (!wordData) return;

        const { word, orpIndex, punctuation } = wordData;
        const before = word.slice(0, orpIndex);
        const orp = word.charAt(orpIndex);
        const after = word.slice(orpIndex + 1);

        this.wordContainer.empty();
        const wordWrapper = this.wordContainer.createDiv({ cls: 'speed-reader-word' });

        wordWrapper.createSpan({ cls: 'speed-reader-left', text: before });
        wordWrapper.createSpan({ cls: 'speed-reader-orp', text: orp });
        wordWrapper.createSpan({ cls: 'speed-reader-right', text: after + punctuation });

        this.updateProgressBar();
        this.updateStats();
    }

    private updateProgressBar() {
        const progress = this.words.length > 0
            ? (this.currentIndex / this.words.length) * 100
            : 0;
        this.progressBarFill.style.width = `${Math.min(progress, 100)}%`;
    }

    private updateStats() {
        const current = Math.min(this.currentIndex + 1, this.words.length);
        const total = this.words.length;
        const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
        const timeRemaining = this.calculateTimeRemaining();
        const status = this.isPlaying ? '⏸' : '▶';

        this.statsEl.empty();

        // Clickable play/pause button
        const playPauseBtn = this.statsEl.createEl('button', {
            cls: 'speed-reader-play-btn',
            text: status
        });
        playPauseBtn.addEventListener('click', () => this.togglePlayPause());

        // Speed control group
        const speedGroup = this.statsEl.createDiv({ cls: 'speed-reader-speed-control' });
        const decreaseBtn = speedGroup.createEl('button', { cls: 'speed-reader-speed-btn', text: '−' });
        decreaseBtn.addEventListener('click', () => this.adjustWpm(-25));
        speedGroup.createSpan({ cls: 'speed-reader-wpm', text: `${this.currentWpm}` });
        speedGroup.createSpan({ cls: 'speed-reader-wpm-label', text: 'WPM' });
        const increaseBtn = speedGroup.createEl('button', { cls: 'speed-reader-speed-btn', text: '+' });
        increaseBtn.addEventListener('click', () => this.adjustWpm(25));

        // Progress info group
        const progressInfo = this.statsEl.createDiv({ cls: 'speed-reader-progress-info' });
        progressInfo.createSpan({ cls: 'speed-reader-count', text: `${percentage}%` });
        progressInfo.createSpan({ cls: 'speed-reader-separator', text: '·' });
        progressInfo.createSpan({ cls: 'speed-reader-time', text: timeRemaining });
    }

    private calculateTimeRemaining(): string {
        const baseDelayMs = 60000 / this.currentWpm;
        let totalMs = 0;

        for (let i = this.currentIndex; i < this.words.length; i++) {
            const word = this.words[i];
            if (word) {
                totalMs += baseDelayMs * word.delayMultiplier;
            }
        }

        const totalSeconds = Math.ceil(totalMs / 1000);
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

    private updateControls() {
        this.controlsEl.empty();

        if (this.focusMode) {
            this.controlsEl.addClass('speed-reader-focus-mode');
            this.controlsEl.createSpan({ text: 'Focus mode • ', cls: 'speed-reader-focus-label' });
            this.createKeyHint('F', 'exit');
            return;
        }

        this.controlsEl.removeClass('speed-reader-focus-mode');
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

    private onProgressClick(e: MouseEvent) {
        const rect = this.progressBarContainer.getBoundingClientRect();
        const percentage = (e.clientX - rect.left) / rect.width;
        const newIndex = Math.floor(percentage * this.words.length);
        this.currentIndex = Math.max(0, Math.min(newIndex, this.words.length - 1));
        this.renderCurrentWord();

        if (this.isPlaying) {
            if (this.timeoutId !== null) {
                window.clearTimeout(this.timeoutId);
            }
            this.scheduleNextWord();
        }
    }

    private adjustWpm(delta: number) {
        const newWpm = Math.max(100, Math.min(1000, this.currentWpm + delta));
        if (newWpm !== this.currentWpm) {
            this.currentWpm = newWpm;
            this.updateStats();

            const wpmEl = this.statsEl.querySelector('.speed-reader-wpm');
            if (wpmEl) {
                wpmEl.removeClass('speed-reader-wpm-changed');
                void (wpmEl as HTMLElement).offsetWidth;
                wpmEl.addClass('speed-reader-wpm-changed');
            }

            new Notice(`Speed: ${this.currentWpm} WPM`);
        }
    }

    private toggleFocusMode() {
        this.focusMode = !this.focusMode;
        this.contentEl.toggleClass('speed-reader-focus-active', this.focusMode);
        this.updateControls();
    }

    private play() {
        if (this.currentIndex >= this.words.length) {
            this.currentIndex = 0;
        }
        this.isPlaying = true;
        this.updateStats();
        this.scheduleNextWord();
    }

    private pause() {
        this.isPlaying = false;
        if (this.timeoutId !== null) {
            window.clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        this.updateStats();
    }

    private togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    private scheduleNextWord() {
        if (!this.isPlaying || this.currentIndex >= this.words.length) {
            if (this.currentIndex >= this.words.length) {
                this.renderCurrentWord();
            }
            return;
        }

        const wordData = this.words[this.currentIndex];
        if (!wordData) return;

        const baseDelay = calculateBaseDelay(this.currentWpm);
        const delay = baseDelay * wordData.delayMultiplier;

        this.timeoutId = window.setTimeout(() => {
            this.currentIndex++;
            this.renderCurrentWord();
            this.scheduleNextWord();
        }, delay);
    }

    private rewind(count: number) {
        this.currentIndex = Math.max(0, this.currentIndex - count);
        this.renderCurrentWord();
        if (this.isPlaying) {
            if (this.timeoutId !== null) {
                window.clearTimeout(this.timeoutId);
            }
            this.scheduleNextWord();
        }
    }

    private fastForward(count: number) {
        this.currentIndex = Math.min(this.words.length - 1, this.currentIndex + count);
        this.renderCurrentWord();
        if (this.isPlaying) {
            if (this.timeoutId !== null) {
                window.clearTimeout(this.timeoutId);
            }
            this.scheduleNextWord();
        }
    }
}
