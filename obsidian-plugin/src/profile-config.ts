import type {
	RejectDetectionSettings,
	RetrySettings,
	TaskMode,
	TranslationSettings,
	WriterProfile,
} from './types';

export type WasmConfig = Record<string, unknown>;

export function profileHasTranslation(profile: WriterProfile): boolean {
	return profile.translation.enabled;
}

export function createWasmConfig(profile: WriterProfile): WasmConfig {
	const config: WasmConfig = {
		writer: writerConfig(profile),
	};

	if (profile.rejectDetection.enabled) {
		config['reject-detection'] = rejectDetectionConfig(profile.rejectDetection);
	}

	if (profile.translation.enabled) {
		config.translation = translationConfig(profile.translation);
	}

	return config;
}

export function validateProfileForTask(
	profile: WriterProfile,
	mode: TaskMode,
): string[] {
	const errors: string[] = [];

	if (mode === 'write') {
		validateWriter(profile, errors);
		validateRejectDetection(profile.rejectDetection, errors);
		if (profile.translation.enabled) {
			validateTranslation(profile, errors);
		}
	} else {
		validateTranslation(profile, errors);
	}

	return errors;
}

function writerConfig(profile: WriterProfile): WasmConfig {
	const writer = profile.writer;
	const config: WasmConfig = {
		'api-url': writer.apiUrl.trim(),
		model: writer.model.trim(),
		prompt: {
			system: optionalString(writer.prompt.system),
			instruction: writer.prompt.instruction,
			requirement: writer.prompt.requirement,
			reasoning: optionalString(writer.prompt.reasoning),
		},
		retry: retryConfig(writer.retry),
	};
	setOptional(config, 'api-key', writer.apiKey);
	return config;
}

function rejectDetectionConfig(settings: RejectDetectionSettings): WasmConfig {
	const config: WasmConfig = {
		enable: true,
		'api-url': settings.apiUrl.trim(),
		model: settings.model.trim(),
		'sample-length': settings.sampleLength,
		threshold: settings.threshold,
		retry: retryConfig(settings.retry),
	};
	setOptional(config, 'api-key', settings.apiKey);

	if (settings.customPromptEnabled) {
		config['custom-prompt'] = {
			enable: true,
			'prompt-before': settings.promptBefore,
			'prompt-after': settings.promptAfter,
			reasoning: optionalString(settings.reasoning),
		};
	}

	return config;
}

function translationConfig(settings: TranslationSettings): WasmConfig {
	const config: WasmConfig = {
		enable: true,
		'api-url': settings.apiUrl.trim(),
		model: settings.model.trim(),
		'max-characters-per-segment': settings.maxCharactersPerSegment,
		'skip-original': settings.skipOriginal,
		retry: retryConfig(settings.retry),
	};
	setOptional(config, 'api-key', settings.apiKey);
	setOptional(
		config,
		'lines-mismatched-delimiter',
		settings.linesMismatchedDelimiter,
	);

	if (settings.promptMode === 'default') {
		config['default-prompt'] = {
			enable: true,
			language: settings.defaultLanguage.trim(),
		};
	} else {
		config['custom-prompt'] = {
			enable: true,
			'has-instruction': settings.customHasInstruction,
			'prompt-before-instruction': settings.customPromptBeforeInstruction,
			'prompt-before': settings.customPromptBefore,
			'prompt-after': settings.customPromptAfter,
			reasoning: optionalString(settings.customReasoning),
		};
	}

	return config;
}

function retryConfig(settings: RetrySettings): WasmConfig {
	if (!settings.enabled) {
		return { enable: false };
	}

	const config: WasmConfig = {
		enable: true,
		duration:
			settings.durationMode === 'backoff'
				? 'backoff'
				: Math.max(1, Math.floor(settings.fixedDelayMs)),
	};

	if (settings.maxRetries !== null) {
		config['max-retries'] = Math.max(0, Math.floor(settings.maxRetries));
	}

	return config;
}

function validateWriter(profile: WriterProfile, errors: string[]): void {
	const writer = profile.writer;

	if (!writer.apiUrl.trim()) {
		errors.push('Writer API URL is required.');
	}
	if (!writer.model.trim()) {
		errors.push('Writer model is required.');
	}
	if (!writer.prompt.instruction.trim()) {
		errors.push('Writer instruction is required.');
	}

	validateReasoning(writer.prompt.reasoning, 'Writer reasoning', errors);
	validateRetry(writer.retry, 'Writer retry', errors);
}

function validateRejectDetection(
	settings: RejectDetectionSettings,
	errors: string[],
): void {
	if (!settings.enabled) {
		return;
	}

	if (!settings.apiUrl.trim()) {
		errors.push('Reject detection API URL is required.');
	}
	if (!settings.model.trim()) {
		errors.push('Reject detection model is required.');
	}
	if (settings.sampleLength < 1) {
		errors.push('Reject detection sample length must be greater than 0.');
	}
	if (settings.threshold < 0 || settings.threshold > 100) {
		errors.push('Reject detection threshold must be between 0 and 100.');
	}
	if (settings.customPromptEnabled) {
		if (!settings.promptBefore.trim()) {
			errors.push('Reject detection custom prompt before text is required.');
		}
		if (!settings.promptAfter.trim()) {
			errors.push('Reject detection custom prompt after text is required.');
		}
		validateReasoning(
			settings.reasoning,
			'Reject detection custom prompt reasoning',
			errors,
		);
	}
	validateRetry(settings.retry, 'Reject detection retry', errors);
}

function validateTranslation(profile: WriterProfile, errors: string[]): void {
	const settings = profile.translation;

	if (!settings.enabled) {
		errors.push('Translation is not enabled for this profile.');
		return;
	}
	if (!settings.apiUrl.trim()) {
		errors.push('Translation API URL is required.');
	}
	if (!settings.model.trim()) {
		errors.push('Translation model is required.');
	}
	if (settings.maxCharactersPerSegment < 1) {
		errors.push('Translation segment size must be greater than 0.');
	}
	if (!settings.skipOriginal && !settings.linesMismatchedDelimiter.trim()) {
		errors.push(
			'Translation delimiter is required when translated output keeps original text.',
		);
	}

	if (settings.promptMode === 'default') {
		if (!settings.defaultLanguage.trim()) {
			errors.push('Default translation target language is required.');
		}
		if (!profile.writer.prompt.instruction.trim()) {
			errors.push(
				'Writer instruction is required for the default translation prompt.',
			);
		}
	} else {
		if (settings.customHasInstruction) {
			if (!settings.customPromptBeforeInstruction.trim()) {
				errors.push(
					'Custom translation prompt before-instruction text is required.',
				);
			}
			if (!profile.writer.prompt.instruction.trim()) {
				errors.push(
					'Writer instruction is required when custom translation includes it.',
				);
			}
		}
		if (!settings.customPromptBefore.trim()) {
			errors.push('Custom translation prompt before text is required.');
		}
		if (!settings.customPromptAfter.trim()) {
			errors.push('Custom translation prompt after text is required.');
		}
		validateReasoning(
			settings.customReasoning,
			'Custom translation reasoning',
			errors,
		);
	}

	validateRetry(settings.retry, 'Translation retry', errors);
}

function validateRetry(
	settings: RetrySettings,
	label: string,
	errors: string[],
): void {
	if (!settings.enabled) {
		return;
	}

	if (settings.durationMode === 'fixed' && settings.fixedDelayMs < 1) {
		errors.push(`${label} fixed delay must be greater than 0.`);
	}
	if (settings.maxRetries !== null && settings.maxRetries < 0) {
		errors.push(`${label} max retries must be 0 or greater.`);
	}
}

function validateReasoning(
	value: string,
	label: string,
	errors: string[],
): void {
	if (!value.trim()) {
		return;
	}

	try {
		JSON.parse(value);
	} catch {
		errors.push(`${label} must be valid JSON.`);
	}
}

function optionalString(value: string): string | undefined {
	const trimmed = value.trim();
	return trimmed ? value : undefined;
}

function setOptional(
	config: Record<string, unknown>,
	key: string,
	value: string,
): void {
	const trimmed = value.trim();
	if (trimmed) {
		config[key] = trimmed;
	}
}
