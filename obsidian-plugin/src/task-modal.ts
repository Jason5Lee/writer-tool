import { App, Editor, Modal, Notice, Setting } from 'obsidian';
import {
	profileHasTranslation,
	validateProfileForTask,
} from './profile-config';
import type WriterToolPlugin from './main';
import type { TaskMode, WriterProfile } from './types';

export class WriterToolTaskModal extends Modal {
	private mode: TaskMode = 'write';
	private profileId: string | null;
	private outputOriginalForWrite: boolean;
	private errorEl: HTMLElement | null = null;

	constructor(
		app: App,
		private readonly plugin: WriterToolPlugin,
		private readonly editor: Editor,
	) {
		super(app);
		this.profileId = plugin.settings.lastProfileId;
		this.outputOriginalForWrite = plugin.settings.outputOriginalForWrite;
	}

	onOpen(): void {
		this.setTitle('Start writer tool task');
		this.render();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private render(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('writer-tool-task-modal');

		const profiles = this.plugin.settings.profiles;
		if (profiles.length === 0) {
			contentEl.createEl('p', {
				text: 'Add a profile in writer tool settings before starting a task.',
			});
			new Setting(contentEl).addButton((button) =>
				button.setButtonText('Close').onClick(() => this.close()),
			);
			return;
		}

		this.ensureProfileSelection(profiles);

		new Setting(contentEl).setName('Task').addDropdown((dropdown) =>
			dropdown
				.addOption('write', 'Write')
				.addOption('translate', 'Translate')
				.setValue(this.mode)
				.onChange((value) => {
					this.mode = value as TaskMode;
					this.render();
				}),
		);

		new Setting(contentEl).setName('Profile').addDropdown((dropdown) => {
			for (const profile of profiles) {
				dropdown.addOption(profile.id, profile.name);
			}
			dropdown.setValue(this.profileId ?? profiles[0]?.id ?? '');
			dropdown.onChange((value) => {
				this.profileId = value;
				this.render();
			});
		});

		const profile = this.getSelectedProfile();
		if (this.mode === 'write') {
			const hasTranslation = profile ? profileHasTranslation(profile) : false;
			new Setting(contentEl)
				.setName('Output writer content')
				.setDesc(
					hasTranslation
						? 'Insert generated content before the translated content.'
						: 'This profile has no translation section, so writer content will be inserted.',
				)
				.addToggle((toggle) =>
					toggle
						.setValue(hasTranslation ? this.outputOriginalForWrite : true)
						.setDisabled(!hasTranslation)
						.onChange((value) => {
							this.outputOriginalForWrite = value;
						}),
				);
		}

		this.errorEl = contentEl.createEl('div', {
			cls: 'writer-tool-validation-errors',
		});

		new Setting(contentEl)
			.addButton((button) =>
				button.setButtonText('Cancel').onClick(() => this.close()),
			)
			.addButton((button) =>
				button
					.setButtonText('Start')
					.setCta()
					.setDisabled(this.plugin.isTaskRunning())
					.onClick(() => void this.start()),
			);
	}

	private async start(): Promise<void> {
		const profile = this.getSelectedProfile();
		if (!profile) {
			new Notice('Select a writer tool profile.');
			return;
		}
		if (this.plugin.isTaskRunning()) {
			new Notice('A writer tool task is already running.');
			return;
		}

		const errors = validateProfileForTask(profile, this.mode);
		if (errors.length > 0) {
			this.showErrors(errors);
			return;
		}

		this.plugin.settings.lastProfileId = profile.id;
		this.plugin.settings.outputOriginalForWrite = this.outputOriginalForWrite;
		await this.plugin.saveSettings();
		this.close();

		await this.plugin.runTask(this.editor, {
			mode: this.mode,
			profile,
			outputOriginalForWrite: this.outputOriginalForWrite,
		});
	}

	private showErrors(errors: string[]): void {
		if (!this.errorEl) {
			return;
		}

		this.errorEl.empty();
		for (const error of errors) {
			this.errorEl.createEl('div', { text: error });
		}
	}

	private getSelectedProfile(): WriterProfile | null {
		return (
			this.plugin.settings.profiles.find(
				(profile) => profile.id === this.profileId,
			) ?? null
		);
	}

	private ensureProfileSelection(profiles: WriterProfile[]): void {
		if (
			this.profileId &&
			profiles.some((profile) => profile.id === this.profileId)
		) {
			return;
		}

		this.profileId = profiles[0]?.id ?? null;
	}
}
