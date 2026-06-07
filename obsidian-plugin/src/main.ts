import { Editor, MarkdownFileInfo, MarkdownView, Notice, Plugin } from 'obsidian';
import { WriterToolLogModal, WriterToolLogger } from './logger';
import { runTask } from './runner';
import { normalizeSettings } from './settings';
import { WriterToolSettingTab } from './settings-tab';
import { WriterToolTaskModal } from './task-modal';
import type { TaskRequest, WriterToolSettings } from './types';
import { loadWriterToolWasm, type WriterToolWasm } from './wasm';

interface ActiveTask {
	label: string;
	cancel(): void;
}

export default class WriterToolPlugin extends Plugin {
	settings!: WriterToolSettings;
	readonly logger = new WriterToolLogger();
	private activeTask: ActiveTask | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addRibbonIcon('pencil', 'Start writer tool task', () => {
			this.openTaskModalForActiveEditor();
		});

		this.addCommand({
			id: 'start-task',
			name: 'Start task',
			editorCallback: (editor: Editor, _ctx: MarkdownView | MarkdownFileInfo) => {
				new WriterToolTaskModal(this.app, this, editor).open();
			},
		});

		this.addCommand({
			id: 'show-log',
			name: 'Show log',
			callback: () => this.openLog(),
		});

		this.addCommand({
			id: 'cancel-task',
			name: 'Cancel current task',
			checkCallback: (checking) => {
				if (!this.activeTask) {
					return false;
				}
				if (!checking) {
					this.cancelActiveTask();
				}
				return true;
			},
		});

		this.addSettingTab(new WriterToolSettingTab(this.app, this));
	}

	onunload(): void {
		this.cancelActiveTask();
	}

	async loadSettings(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	getWasm(): Promise<WriterToolWasm> {
		return loadWriterToolWasm(this);
	}

	async runTask(editor: Editor, request: TaskRequest): Promise<void> {
		await runTask(this, editor, request);
	}

	openLog(): void {
		new WriterToolLogModal(
			this.app,
			this.logger,
			() => this.isTaskRunning(),
			() => this.cancelActiveTask(),
		).open();
	}

	isTaskRunning(): boolean {
		return this.activeTask !== null;
	}

	setActiveTask(task: ActiveTask): void {
		this.activeTask = task;
		this.logger.log(`${task.label}.`);
	}

	clearActiveTask(task: ActiveTask): void {
		if (this.activeTask === task) {
			this.activeTask = null;
		}
	}

	cancelActiveTask(): void {
		if (!this.activeTask) {
			return;
		}

		this.activeTask.cancel();
	}

	private openTaskModalForActiveEditor(): void {
		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!markdownView) {
			new Notice('Open a Markdown note before starting writer tool.');
			return;
		}

		new WriterToolTaskModal(this.app, this, markdownView.editor).open();
	}
}
