/* eslint-disable @typescript-eslint/no-deprecated */
import { App, Modal, Notice, PluginSettingTab, Setting } from 'obsidian';
import { ProfileModal } from './profile-modal';
import { cloneProfile, createDefaultProfile } from './settings';
import type WriterToolPlugin from './main';
import type { WriterProfile } from './types';

export class WriterToolSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: WriterToolPlugin,
	) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass('writer-tool-settings');

		new Setting(containerEl)
			.setName('Open log when a task starts')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.openLogOnTaskStart)
					.onChange(async (value) => {
						this.plugin.settings.openLogOnTaskStart = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Default write output')
			.setDesc('Insert writer content before translated content.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.outputOriginalForWrite)
					.onChange(async (value) => {
						this.plugin.settings.outputOriginalForWrite = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Profiles')
			.setHeading()
			.addButton((button) =>
				button
					.setButtonText('Add profile')
					.setCta()
					.onClick(() => this.openProfileModal(createDefaultProfile())),
			);

		if (this.plugin.settings.profiles.length === 0) {
			containerEl.createEl('p', {
				cls: 'writer-tool-empty-state',
				text: 'No profiles configured.',
			});
			return;
		}

		for (const profile of this.plugin.settings.profiles) {
			this.renderProfileRow(containerEl, profile);
		}
	}

	private renderProfileRow(
		containerEl: HTMLElement,
		profile: WriterProfile,
	): void {
		new Setting(containerEl)
			.setName(profile.name)
			.setDesc(this.profileDescription(profile))
			.addButton((button) =>
				button
					.setButtonText('Edit')
					.onClick(() => this.openProfileModal(cloneProfile(profile))),
			)
			.addButton((button) =>
				button
					.setButtonText('Remove')
					.setDestructive()
					.onClick(() => this.openRemoveProfileModal(profile)),
			);
	}

	private openProfileModal(profile: WriterProfile): void {
		new ProfileModal(this.app, profile, async (updatedProfile) => {
			const index = this.plugin.settings.profiles.findIndex(
				(existing) => existing.id === updatedProfile.id,
			);

			if (index >= 0) {
				this.plugin.settings.profiles[index] = updatedProfile;
			} else {
				this.plugin.settings.profiles.push(updatedProfile);
			}

			this.plugin.settings.lastProfileId = updatedProfile.id;
			await this.plugin.saveSettings();
			this.display();
		}).open();
	}

	private openRemoveProfileModal(profile: WriterProfile): void {
		new RemoveProfileModal(this.app, profile, async () => {
			await this.removeProfile(profile);
		}).open();
	}

	private async removeProfile(profile: WriterProfile): Promise<void> {
		this.plugin.settings.profiles = this.plugin.settings.profiles.filter(
			(existing) => existing.id !== profile.id,
		);
		if (this.plugin.settings.lastProfileId === profile.id) {
			this.plugin.settings.lastProfileId =
				this.plugin.settings.profiles[0]?.id ?? null;
		}
		await this.plugin.saveSettings();
		new Notice('Profile removed.');
		this.display();
	}

	private profileDescription(profile: WriterProfile): string {
		const parts = [
			profile.writer.model ? `writer: ${profile.writer.model}` : 'writer: unset',
		];

		if (profile.translation.enabled) {
			parts.push(
				profile.translation.model
					? `translation: ${profile.translation.model}`
					: 'translation: unset',
			);
		} else {
			parts.push('translation: off');
		}

		if (profile.rejectDetection.enabled) {
			parts.push('reject detection: on');
		}

		return parts.join(', ');
	}
}

class RemoveProfileModal extends Modal {
	constructor(
		app: App,
		private readonly profile: WriterProfile,
		private readonly onConfirm: () => Promise<void>,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle('Remove profile');
		this.contentEl.createEl('p', {
			text: `Remove profile "${this.profile.name}"?`,
		});
		new Setting(this.contentEl)
			.addButton((button) =>
				button.setButtonText('Cancel').onClick(() => this.close()),
			)
			.addButton((button) =>
				button
					.setButtonText('Remove')
					.setDestructive()
					.setCta()
					.onClick(async () => {
						await this.onConfirm();
						this.close();
					}),
			);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
