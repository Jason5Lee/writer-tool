export const PROFILE_DESCRIPTIONS = {
	writer: {
		header:
			'Writer settings. Instruction tells the writer what to create. Translation can also use it as context so the translated text preserves the original writing goal. When Prompt mode is set to Default, translation includes Instruction automatically. When Prompt mode is set to Custom, translation includes it only if Include writer instruction is enabled. Requirement is used only for writing.',
		apiUrl:
			'The OpenAI-compatible API base URL for the writer model. Do not include /v1; Writer Tool appends /v1/chat/completions.',
		apiKey:
			'Optional API key used to authorize requests to the writer endpoint.',
		model: 'The model to use for content generation.',
		system: 'System prompt for the model.',
		instruction:
			'Main instruction for the writing task. Translation can also use this as context about what the source text was meant to accomplish.',
		requirement:
			'Optional extra requirements for the writing task. The writer prompt combines Instruction and Requirement, while translation prompts can use Instruction without this writing-only text.',
		reasoning:
			'Optional reasoning controls as valid JSON for APIs that support them.',
	},
	rejectDetection: {
		header:
			'Detect whether the writer output is a refusal, for example, "I can\'t help with that".',
		enabled: 'Turn on refusal detection for writer output.',
		apiUrl:
			'The OpenAI-compatible API base URL for the rejection detection model. Do not include /v1; Writer Tool appends /v1/chat/completions.',
		apiKey:
			'Optional API key for the rejection detection endpoint.',
		model: 'The model used for rejection detection.',
		sampleLength:
			"The number of initial characters from the writer's output to analyze.",
		threshold:
			"The confidence threshold (0-100) for accepting the output. The output is accepted if the detection model's confidence score (that the text is not a refusal) is greater than or equal to this value.",
		customPrompt:
			'Use your own rejection detection prompt. The prompt must tell the model to return a number from 0 (is a refusal) to 100 (not a refusal) enclosed in <output></output> tags.',
		promptBefore: 'Text to prepend to the content sample being analyzed.',
		promptAfter: 'Text to append to the content sample being analyzed.',
		reasoning:
			'Optional reasoning controls as valid JSON for APIs that support them.',
	},
	translation: {
		header:
			'Post-processing step to translate the generated content. Useful when a model performs best in one language, for example, English, but the desired output is in another. Required for translate command or write command with translation output.',
		enabled:
			'Turn on translation for translate tasks and write tasks that should produce translated output.',
		apiUrl:
			'The OpenAI-compatible API base URL for the translation model. Do not include /v1; Writer Tool appends /v1/chat/completions.',
		apiKey: 'Optional API key for the translation endpoint.',
		model: 'The model used for translation.',
		maxCharactersPerSegment:
			'The maximum number of characters per translation request. Content is split into segments by newline. If a single line exceeds this limit, it is sent as its own segment.',
		skipOriginal:
			'When enabled, the final output contains only translated text.',
		linesMismatchedDelimiter:
			'Used when Skip original is off and the original and translated line counts do not match. It wraps the entire translated block.',
		promptMode:
			'Choose whether translation uses the built-in prompt template or your fully custom prompt. Default includes Instruction as context automatically.',
		defaultLanguage:
			'The target language for the translation, for example, "Simplified Chinese".',
		customPrompt:
			'The prompt must instruct the model to enclose the final translated content within <translated></translated> tags.',
		customHasInstruction:
			'Include Instruction in the custom translation prompt so the translator understands the original writing goal.',
		customPromptBeforeInstruction:
			'When Include writer instruction is enabled, this text appears before Instruction in the custom translation prompt.',
		customPromptBefore:
			'The main prompt segment that precedes the content to be translated.',
		customPromptAfter:
			'The main prompt segment that follows the content to be translated.',
		customReasoning:
			'Optional reasoning controls as valid JSON for APIs that support them.',
	},
	retry: {
		writer:
			'Retry behavior for writer requests. All retry groups use the same Duration options.',
		rejectDetection:
			'Retry behavior for rejection detection requests. Uses the same Duration options as Writer retry.',
		translation:
			'Retry behavior for translation requests. Each translated segment retries independently, so backoff durations and Max retries restart for each segment.',
		enabled: 'Turn on retry for this request type.',
		duration:
			'Choose Fixed delay for a retry delay in milliseconds, or Backoff for an increasing delay strategy.',
		fixedDelay: 'The duration of the retry in milliseconds.',
		maxRetries: 'Optional maximum number of retries.',
	},
} as const;
