export type TaskMode = 'write' | 'translate';

export type RetryDurationMode = 'fixed' | 'backoff';

export interface RetrySettings {
	enabled: boolean;
	durationMode: RetryDurationMode;
	fixedDelayMs: number;
	maxRetries: number | null;
}

export interface WriterPromptSettings {
	system: string;
	instruction: string;
	requirement: string;
	reasoning: string;
}

export interface WriterSettings {
	apiUrl: string;
	apiKey: string;
	model: string;
	prompt: WriterPromptSettings;
	retry: RetrySettings;
}

export interface RejectDetectionSettings {
	enabled: boolean;
	apiUrl: string;
	apiKey: string;
	model: string;
	sampleLength: number;
	threshold: number;
	customPromptEnabled: boolean;
	promptBefore: string;
	promptAfter: string;
	reasoning: string;
	retry: RetrySettings;
}

export type TranslationPromptMode = 'default' | 'custom';

export interface TranslationSettings {
	enabled: boolean;
	apiUrl: string;
	apiKey: string;
	model: string;
	maxCharactersPerSegment: number;
	skipOriginal: boolean;
	linesMismatchedDelimiter: string;
	promptMode: TranslationPromptMode;
	defaultLanguage: string;
	customHasInstruction: boolean;
	customPromptBeforeInstruction: string;
	customPromptBefore: string;
	customPromptAfter: string;
	customReasoning: string;
	retry: RetrySettings;
}

export interface WriterProfile {
	id: string;
	name: string;
	writer: WriterSettings;
	rejectDetection: RejectDetectionSettings;
	translation: TranslationSettings;
}

export interface WriterToolSettings {
	profiles: WriterProfile[];
	lastProfileId: string | null;
	outputOriginalForWrite: boolean;
	openLogOnTaskStart: boolean;
}

export interface TaskRequest {
	mode: TaskMode;
	profile: WriterProfile;
	outputOriginalForWrite: boolean;
}
