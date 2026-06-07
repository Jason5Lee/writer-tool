import { App, Modal, Setting } from 'obsidian';

export interface LogEntry {
	timestamp: string;
	level: 'info' | 'error';
	message: string;
}

type LogListener = () => void;

export class WriterToolLogger {
	private entries: LogEntry[] = [];
	private listeners = new Set<LogListener>();

	log(message: string): void {
		this.add('info', message);
	}

	error(message: string): void {
		this.add('error', message);
	}

	clear(): void {
		this.entries = [];
		this.emit();
	}

	getEntries(): LogEntry[] {
		return [...this.entries];
	}

	subscribe(listener: LogListener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private add(level: LogEntry['level'], message: string): void {
		this.entries = [
			...this.entries,
			{
				timestamp: new Date().toLocaleTimeString(),
				level,
				message,
			},
		].slice(-300);
		this.emit();
	}

	private emit(): void {
		for (const listener of this.listeners) {
			listener();
		}
	}
}

export class WriterToolLogModal extends Modal {
	private unsubscribe: (() => void) | null = null;

	constructor(
		app: App,
		private readonly logger: WriterToolLogger,
		private readonly isTaskRunning: () => boolean,
		private readonly cancelTask: () => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle('Writer tool log');
		this.unsubscribe = this.logger.subscribe(() => this.render());
		this.render();
	}

	onClose(): void {
		this.unsubscribe?.();
		this.unsubscribe = null;
		this.contentEl.empty();
	}

	private render(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('writer-tool-log-modal');

		new Setting(contentEl)
			.setName('Task log')
			.addButton((button) =>
				button.setButtonText('Clear').onClick(() => this.logger.clear()),
			)
			.addButton((button) =>
				button
					.setButtonText('Cancel task')
					.setDisabled(!this.isTaskRunning())
					.onClick(() => this.cancelTask()),
			);

		const logEl = contentEl.createEl('div', { cls: 'writer-tool-log' });
		const entries = this.logger.getEntries();

		if (entries.length === 0) {
			logEl.createEl('div', {
				cls: 'writer-tool-log-empty',
				text: 'No log entries yet.',
			});
			return;
		}

		for (const entry of entries) {
			const row = logEl.createEl('div', {
				cls: `writer-tool-log-entry writer-tool-log-entry-${entry.level}`,
			});
			row.createEl('span', {
				cls: 'writer-tool-log-time',
				text: entry.timestamp,
			});
			row.createEl('span', {
				cls: 'writer-tool-log-message',
				text: entry.message,
			});
		}

		logEl.scrollTop = logEl.scrollHeight;
	}
}
