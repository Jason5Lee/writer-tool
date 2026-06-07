import type {
	RejectDetectionSettings,
	RetrySettings,
	TranslationSettings,
	WriterProfile,
	WriterSettings,
	WriterToolSettings,
} from './types';

const DEFAULT_RETRY: RetrySettings = {
	enabled: true,
	durationMode: 'fixed',
	fixedDelayMs: 1000,
	maxRetries: 3,
};

const DEFAULT_WRITER: WriterSettings = {
	apiUrl: '',
	apiKey: '',
	model: '',
	prompt: {
		system: '',
		instruction: '',
		requirement: '',
		reasoning: '',
	},
	retry: DEFAULT_RETRY,
};

const DEFAULT_REJECT_DETECTION: RejectDetectionSettings = {
	enabled: false,
	apiUrl: '',
	apiKey: '',
	model: '',
	sampleLength: 1000,
	threshold: 60,
	customPromptEnabled: false,
	promptBefore: '',
	promptAfter: '',
	reasoning: '',
	retry: DEFAULT_RETRY,
};

const DEFAULT_TRANSLATION: TranslationSettings = {
	enabled: false,
	apiUrl: '',
	apiKey: '',
	model: '',
	maxCharactersPerSegment: 1000,
	skipOriginal: false,
	linesMismatchedDelimiter: '============== LINES MISMATCHED ==============',
	promptMode: 'default',
	defaultLanguage: 'Simplified Chinese',
	customHasInstruction: true,
	customPromptBeforeInstruction: '',
	customPromptBefore: '',
	customPromptAfter: '',
	customReasoning: '',
	retry: DEFAULT_RETRY,
};

export const DEFAULT_SETTINGS: WriterToolSettings = {
	profiles: [],
	lastProfileId: null,
	outputOriginalForWrite: true,
	openLogOnTaskStart: true,
};

export function createDefaultProfile(): WriterProfile {
	return {
		id: createId(),
		name: 'New profile',
		writer: clone(DEFAULT_WRITER),
		rejectDetection: clone(DEFAULT_REJECT_DETECTION),
		translation: clone(DEFAULT_TRANSLATION),
	};
}

export function cloneProfile(profile: WriterProfile): WriterProfile {
	return clone(profile);
}

export function normalizeSettings(data: unknown): WriterToolSettings {
	const partial = isRecord(data) ? data : {};
	const rawProfiles = Array.isArray(partial.profiles) ? partial.profiles : [];
	const profiles = rawProfiles
		.filter(isRecord)
		.map((profile) => normalizeProfile(profile));

	const lastProfileId =
		typeof partial.lastProfileId === 'string' ? partial.lastProfileId : null;

	return {
		profiles,
		lastProfileId,
		outputOriginalForWrite:
			typeof partial.outputOriginalForWrite === 'boolean'
				? partial.outputOriginalForWrite
				: DEFAULT_SETTINGS.outputOriginalForWrite,
		openLogOnTaskStart:
			typeof partial.openLogOnTaskStart === 'boolean'
				? partial.openLogOnTaskStart
				: DEFAULT_SETTINGS.openLogOnTaskStart,
	};
}

function normalizeProfile(raw: Record<string, unknown>): WriterProfile {
	const fallback = createDefaultProfile();
	return {
		id: readString(raw.id, fallback.id),
		name: readString(raw.name, fallback.name),
		writer: normalizeWriter(raw.writer, fallback.writer),
		rejectDetection: normalizeRejectDetection(
			raw.rejectDetection,
			fallback.rejectDetection,
		),
		translation: normalizeTranslation(raw.translation, fallback.translation),
	};
}

function normalizeWriter(raw: unknown, fallback: WriterSettings): WriterSettings {
	const source = isRecord(raw) ? raw : {};
	const prompt = isRecord(source.prompt) ? source.prompt : {};
	return {
		apiUrl: readString(source.apiUrl, fallback.apiUrl),
		apiKey: readString(source.apiKey, fallback.apiKey),
		model: readString(source.model, fallback.model),
		prompt: {
			system: readString(prompt.system, fallback.prompt.system),
			instruction: readString(prompt.instruction, fallback.prompt.instruction),
			requirement: readString(prompt.requirement, fallback.prompt.requirement),
			reasoning: readString(prompt.reasoning, fallback.prompt.reasoning),
		},
		retry: normalizeRetry(source.retry, fallback.retry),
	};
}

function normalizeRejectDetection(
	raw: unknown,
	fallback: RejectDetectionSettings,
): RejectDetectionSettings {
	const source = isRecord(raw) ? raw : {};
	return {
		enabled: readBoolean(source.enabled, fallback.enabled),
		apiUrl: readString(source.apiUrl, fallback.apiUrl),
		apiKey: readString(source.apiKey, fallback.apiKey),
		model: readString(source.model, fallback.model),
		sampleLength: readPositiveNumber(source.sampleLength, fallback.sampleLength),
		threshold: readNumber(source.threshold, fallback.threshold),
		customPromptEnabled: readBoolean(
			source.customPromptEnabled,
			fallback.customPromptEnabled,
		),
		promptBefore: readString(source.promptBefore, fallback.promptBefore),
		promptAfter: readString(source.promptAfter, fallback.promptAfter),
		reasoning: readString(source.reasoning, fallback.reasoning),
		retry: normalizeRetry(source.retry, fallback.retry),
	};
}

function normalizeTranslation(
	raw: unknown,
	fallback: TranslationSettings,
): TranslationSettings {
	const source = isRecord(raw) ? raw : {};
	const promptMode =
		source.promptMode === 'custom' || source.promptMode === 'default'
			? source.promptMode
			: fallback.promptMode;

	return {
		enabled: readBoolean(source.enabled, fallback.enabled),
		apiUrl: readString(source.apiUrl, fallback.apiUrl),
		apiKey: readString(source.apiKey, fallback.apiKey),
		model: readString(source.model, fallback.model),
		maxCharactersPerSegment: readPositiveNumber(
			source.maxCharactersPerSegment,
			fallback.maxCharactersPerSegment,
		),
		skipOriginal: readBoolean(source.skipOriginal, fallback.skipOriginal),
		linesMismatchedDelimiter: readString(
			source.linesMismatchedDelimiter,
			fallback.linesMismatchedDelimiter,
		),
		promptMode,
		defaultLanguage: readString(source.defaultLanguage, fallback.defaultLanguage),
		customHasInstruction: readBoolean(
			source.customHasInstruction,
			fallback.customHasInstruction,
		),
		customPromptBeforeInstruction: readString(
			source.customPromptBeforeInstruction,
			fallback.customPromptBeforeInstruction,
		),
		customPromptBefore: readString(
			source.customPromptBefore,
			fallback.customPromptBefore,
		),
		customPromptAfter: readString(
			source.customPromptAfter,
			fallback.customPromptAfter,
		),
		customReasoning: readString(source.customReasoning, fallback.customReasoning),
		retry: normalizeRetry(source.retry, fallback.retry),
	};
}

function normalizeRetry(raw: unknown, fallback: RetrySettings): RetrySettings {
	const source = isRecord(raw) ? raw : {};
	const durationMode =
		source.durationMode === 'backoff' || source.durationMode === 'fixed'
			? source.durationMode
			: fallback.durationMode;
	const rawMaxRetries = source.maxRetries;

	return {
		enabled: readBoolean(source.enabled, fallback.enabled),
		durationMode,
		fixedDelayMs: readPositiveNumber(source.fixedDelayMs, fallback.fixedDelayMs),
		maxRetries:
			typeof rawMaxRetries === 'number' && Number.isFinite(rawMaxRetries)
				? Math.max(0, Math.floor(rawMaxRetries))
				: null,
	};
}

function createId(): string {
	return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function readString(value: unknown, fallback: string): string {
	return typeof value === 'string' ? value : fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === 'boolean' ? value : fallback;
}

function readNumber(value: unknown, fallback: number): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readPositiveNumber(value: unknown, fallback: number): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return fallback;
	}

	return Math.max(1, Math.floor(value));
}
