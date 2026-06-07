import { App, Modal, Notice, Setting } from 'obsidian';
import { PROFILE_DESCRIPTIONS } from './profile-descriptions';
import { cloneProfile } from './settings';
import type {
	RejectDetectionSettings,
	RetrySettings,
	TranslationSettings,
	WriterProfile,
	WriterSettings,
} from './types';

type SaveProfile = (profile: WriterProfile) => Promise<void>;

export class ProfileModal extends Modal {
	private profile: WriterProfile;

	constructor(
		app: App,
		profile: WriterProfile,
		private readonly onSaveProfile: SaveProfile,
	) {
		super(app);
		this.profile = cloneProfile(profile);
	}

	onOpen(): void {
		this.setTitle('Writer tool profile');
		this.render();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private render(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('writer-tool-profile-modal');

		this.renderProfileSection(contentEl);
		this.renderWriterSection(contentEl, this.profile.writer);
		this.renderRejectDetectionSection(
			contentEl,
			this.profile.rejectDetection,
		);
		this.renderTranslationSection(contentEl, this.profile.translation);

		new Setting(contentEl)
			.addButton((button) =>
				button.setButtonText('Cancel').onClick(() => this.close()),
			)
			.addButton((button) =>
				button
					.setButtonText('Save')
					.setCta()
					.onClick(() => void this.save()),
			);
	}

	private renderProfileSection(containerEl: HTMLElement): void {
		this.heading(containerEl, 'Profile');
		this.textSetting(
			containerEl,
			'Name',
			'',
			this.profile.name,
			(value) => {
				this.profile.name = value;
			},
		);
	}

	private renderWriterSection(
		containerEl: HTMLElement,
		writer: WriterSettings,
	): void {
		const { writer: descriptions } = PROFILE_DESCRIPTIONS;

		this.heading(containerEl, 'Writer', descriptions.header);
		this.textSetting(
			containerEl,
			'API URL',
			descriptions.apiUrl,
			writer.apiUrl,
			(value) => {
				writer.apiUrl = value;
			},
		);
		this.textSetting(
			containerEl,
			'API key',
			descriptions.apiKey,
			writer.apiKey,
			(value) => {
				writer.apiKey = value;
			},
			{ password: true },
		);
		this.textSetting(
			containerEl,
			'Model',
			descriptions.model,
			writer.model,
			(value) => {
				writer.model = value;
			},
		);
		this.textAreaSetting(
			containerEl,
			'System prompt',
			descriptions.system,
			writer.prompt.system,
			(value) => {
				writer.prompt.system = value;
			},
		);
		this.textAreaSetting(
			containerEl,
			'Instruction',
			descriptions.instruction,
			writer.prompt.instruction,
			(value) => {
				writer.prompt.instruction = value;
			},
		);
		this.textAreaSetting(
			containerEl,
			'Requirement',
			descriptions.requirement,
			writer.prompt.requirement,
			(value) => {
				writer.prompt.requirement = value;
			},
		);
		this.textAreaSetting(
			containerEl,
			'Reasoning JSON',
			descriptions.reasoning,
			writer.prompt.reasoning,
			(value) => {
				writer.prompt.reasoning = value;
			},
		);
		this.renderRetrySection(
			containerEl,
			'Writer retry',
			PROFILE_DESCRIPTIONS.retry.writer,
			writer.retry,
		);
	}

	private renderRejectDetectionSection(
		containerEl: HTMLElement,
		settings: RejectDetectionSettings,
	): void {
		const { rejectDetection: descriptions } = PROFILE_DESCRIPTIONS;

		this.heading(
			containerEl,
			'Reject detection',
			descriptions.header,
		);
		this.toggleSetting(
			containerEl,
			'Enabled',
			descriptions.enabled,
			settings.enabled,
			(value) => {
				settings.enabled = value;
				this.render();
			},
		);

		if (!settings.enabled) {
			return;
		}

		this.textSetting(
			containerEl,
			'API URL',
			descriptions.apiUrl,
			settings.apiUrl,
			(value) => {
				settings.apiUrl = value;
			},
		);
		this.textSetting(
			containerEl,
			'API key',
			descriptions.apiKey,
			settings.apiKey,
			(value) => {
				settings.apiKey = value;
			},
			{ password: true },
		);
		this.textSetting(
			containerEl,
			'Model',
			descriptions.model,
			settings.model,
			(value) => {
				settings.model = value;
			},
		);
		this.numberSetting(
			containerEl,
			'Sample length',
			descriptions.sampleLength,
			settings.sampleLength,
			(value) => {
				settings.sampleLength = value;
			},
			1,
		);
		this.numberSetting(
			containerEl,
			'Threshold',
			descriptions.threshold,
			settings.threshold,
			(value) => {
				settings.threshold = value;
			},
			0,
		);
		this.toggleSetting(
			containerEl,
			'Custom prompt',
			descriptions.customPrompt,
			settings.customPromptEnabled,
			(value) => {
				settings.customPromptEnabled = value;
				this.render();
			},
		);

		if (settings.customPromptEnabled) {
			this.textAreaSetting(
				containerEl,
				'Prompt before',
				descriptions.promptBefore,
				settings.promptBefore,
				(value) => {
					settings.promptBefore = value;
				},
			);
			this.textAreaSetting(
				containerEl,
				'Prompt after',
				descriptions.promptAfter,
				settings.promptAfter,
				(value) => {
					settings.promptAfter = value;
				},
			);
			this.textAreaSetting(
				containerEl,
				'Reasoning JSON',
				descriptions.reasoning,
				settings.reasoning,
				(value) => {
					settings.reasoning = value;
				},
			);
		}

		this.renderRetrySection(
			containerEl,
			'Reject detection retry',
			PROFILE_DESCRIPTIONS.retry.rejectDetection,
			settings.retry,
		);
	}

	private renderTranslationSection(
		containerEl: HTMLElement,
		settings: TranslationSettings,
	): void {
		const { translation: descriptions } = PROFILE_DESCRIPTIONS;

		this.heading(containerEl, 'Translation', descriptions.header);
		this.toggleSetting(
			containerEl,
			'Enabled',
			descriptions.enabled,
			settings.enabled,
			(value) => {
				settings.enabled = value;
				this.render();
			},
		);

		if (!settings.enabled) {
			return;
		}

		this.textSetting(
			containerEl,
			'API URL',
			descriptions.apiUrl,
			settings.apiUrl,
			(value) => {
				settings.apiUrl = value;
			},
		);
		this.textSetting(
			containerEl,
			'API key',
			descriptions.apiKey,
			settings.apiKey,
			(value) => {
				settings.apiKey = value;
			},
			{ password: true },
		);
		this.textSetting(
			containerEl,
			'Model',
			descriptions.model,
			settings.model,
			(value) => {
				settings.model = value;
			},
		);
		this.numberSetting(
			containerEl,
			'Max characters per segment',
			descriptions.maxCharactersPerSegment,
			settings.maxCharactersPerSegment,
			(value) => {
				settings.maxCharactersPerSegment = value;
			},
			1,
		);
		this.toggleSetting(
			containerEl,
			'Skip original',
			descriptions.skipOriginal,
			settings.skipOriginal,
			(value) => {
				settings.skipOriginal = value;
				this.render();
			},
		);

		if (!settings.skipOriginal) {
			this.textSetting(
				containerEl,
				'Lines mismatched delimiter',
				descriptions.linesMismatchedDelimiter,
				settings.linesMismatchedDelimiter,
				(value) => {
					settings.linesMismatchedDelimiter = value;
				},
			);
		}

		new Setting(containerEl)
			.setName('Prompt mode')
			.setDesc(descriptions.promptMode)
			.addDropdown((dropdown) =>
				dropdown
					.addOption('default', 'Default')
					.addOption('custom', 'Custom')
					.setValue(settings.promptMode)
					.onChange((value) => {
						settings.promptMode = value === 'custom' ? 'custom' : 'default';
						this.render();
					}),
			);

		if (settings.promptMode === 'default') {
			this.textSetting(
				containerEl,
				'Target language',
				descriptions.defaultLanguage,
				settings.defaultLanguage,
				(value) => {
					settings.defaultLanguage = value;
				},
			);
		} else {
			this.toggleSetting(
				containerEl,
				'Include writer instruction',
				descriptions.customHasInstruction,
				settings.customHasInstruction,
				(value) => {
					settings.customHasInstruction = value;
					this.render();
				},
			);
			if (settings.customHasInstruction) {
				this.textAreaSetting(
					containerEl,
					'Prompt before instruction',
					descriptions.customPromptBeforeInstruction,
					settings.customPromptBeforeInstruction,
					(value) => {
						settings.customPromptBeforeInstruction = value;
					},
				);
			}
			this.textAreaSetting(
				containerEl,
				'Prompt before',
				`${descriptions.customPrompt} ${descriptions.customPromptBefore}`,
				settings.customPromptBefore,
				(value) => {
					settings.customPromptBefore = value;
				},
			);
			this.textAreaSetting(
				containerEl,
				'Prompt after',
				descriptions.customPromptAfter,
				settings.customPromptAfter,
				(value) => {
					settings.customPromptAfter = value;
				},
			);
			this.textAreaSetting(
				containerEl,
				'Reasoning JSON',
				descriptions.customReasoning,
				settings.customReasoning,
				(value) => {
					settings.customReasoning = value;
				},
			);
		}

		this.renderRetrySection(
			containerEl,
			'Translation retry',
			PROFILE_DESCRIPTIONS.retry.translation,
			settings.retry,
		);
	}

	private renderRetrySection(
		containerEl: HTMLElement,
		title: string,
		description: string,
		retry: RetrySettings,
	): void {
		const { retry: descriptions } = PROFILE_DESCRIPTIONS;

		this.heading(containerEl, title, description);
		this.toggleSetting(
			containerEl,
			'Enabled',
			descriptions.enabled,
			retry.enabled,
			(value) => {
				retry.enabled = value;
				this.render();
			},
		);

		if (!retry.enabled) {
			return;
		}

		new Setting(containerEl)
			.setName('Duration')
			.setDesc(descriptions.duration)
			.addDropdown((dropdown) =>
				dropdown
					.addOption('fixed', 'Fixed delay')
					.addOption('backoff', 'Backoff')
					.setValue(retry.durationMode)
					.onChange((value) => {
						retry.durationMode = value === 'backoff' ? 'backoff' : 'fixed';
						this.render();
					}),
			);

		if (retry.durationMode === 'fixed') {
			this.numberSetting(
				containerEl,
				'Fixed delay in ms',
				descriptions.fixedDelay,
				retry.fixedDelayMs,
				(value) => {
					retry.fixedDelayMs = value;
				},
				1,
			);
		}

		this.optionalNumberSetting(
			containerEl,
			'Max retries',
			descriptions.maxRetries,
			retry.maxRetries,
			(value) => {
				retry.maxRetries = value;
			},
			0,
		);
	}

	private heading(
		containerEl: HTMLElement,
		title: string,
		description?: string,
	): void {
		const setting = new Setting(containerEl).setName(title).setHeading();
		if (description) {
			setting.setDesc(description);
		}
	}

	private textSetting(
		containerEl: HTMLElement,
		name: string,
		description: string,
		value: string,
		onChange: (value: string) => void,
		options: { password?: boolean } = {},
	): void {
		const setting = new Setting(containerEl).setName(name);
		if (description) {
			setting.setDesc(description);
		}
		setting.addText((text) => {
			text.setValue(value).onChange(onChange);
			if (options.password) {
				text.inputEl.type = 'password';
			}
		});
	}

	private textAreaSetting(
		containerEl: HTMLElement,
		name: string,
		description: string,
		value: string,
		onChange: (value: string) => void,
	): void {
		const setting = new Setting(containerEl).setName(name);
		if (description) {
			setting.setDesc(description);
		}
		setting.addTextArea((text) => {
			text.setValue(value).onChange(onChange);
			text.inputEl.rows = 4;
			text.inputEl.addClass('writer-tool-textarea');
		});
	}

	private toggleSetting(
		containerEl: HTMLElement,
		name: string,
		description: string,
		value: boolean,
		onChange: (value: boolean) => void,
	): void {
		const setting = new Setting(containerEl).setName(name);
		if (description) {
			setting.setDesc(description);
		}
		setting.addToggle((toggle) => toggle.setValue(value).onChange(onChange));
	}

	private numberSetting(
		containerEl: HTMLElement,
		name: string,
		description: string,
		value: number,
		onChange: (value: number) => void,
		min: number,
	): void {
		const setting = new Setting(containerEl).setName(name);
		if (description) {
			setting.setDesc(description);
		}
		setting.addText((text) => {
			text.inputEl.type = 'number';
			text.inputEl.min = String(min);
			text.setValue(String(value)).onChange((nextValue) => {
				onChange(readNumber(nextValue, value, min));
			});
		});
	}

	private optionalNumberSetting(
		containerEl: HTMLElement,
		name: string,
		description: string,
		value: number | null,
		onChange: (value: number | null) => void,
		min: number,
	): void {
		const setting = new Setting(containerEl).setName(name);
		if (description) {
			setting.setDesc(description);
		}
		setting.addText((text) => {
			text.inputEl.type = 'number';
			text.inputEl.min = String(min);
			text.setValue(value === null ? '' : String(value)).onChange((nextValue) => {
				const trimmed = nextValue.trim();
				onChange(trimmed ? readNumber(trimmed, value ?? min, min) : null);
			});
		});
	}

	private async save(): Promise<void> {
		const name = this.profile.name.trim();
		if (!name) {
			new Notice('Profile name is required.');
			return;
		}

		this.profile.name = name;
		await this.onSaveProfile(cloneProfile(this.profile));
		this.close();
	}
}

function readNumber(value: string, fallback: number, min: number): number {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return fallback;
	}

	return Math.max(min, Math.floor(parsed));
}
