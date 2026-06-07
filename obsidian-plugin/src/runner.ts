import type { Editor, EditorPosition } from 'obsidian';
import { Notice } from 'obsidian';
import { createWasmConfig, profileHasTranslation } from './profile-config';
import type WriterToolPlugin from './main';
import type { TaskRequest } from './types';

interface RunningTask {
	label: string;
	cancel(): void;
}

export async function runTask(
	plugin: WriterToolPlugin,
	editor: Editor,
	request: TaskRequest,
): Promise<void> {
	const wasm = await plugin.getWasm();
	const logger = plugin.logger;
	const config = createWasmConfig(request.profile);

	if (request.mode === 'write') {
		await runWriteTask(plugin, editor, request, config);
		return;
	}

	const input = editor.getSelection() || editor.getValue();
	if (!input.trim()) {
		new Notice('There is no note content to translate.');
		return;
	}

	const task = wasm.translateCancellable(config, input, logger);
	const handle = registerTask(plugin, {
		label: 'Translating note content',
		cancel: () => task.cancel(),
	});

	try {
		logger.log('Translation started.');
		const translated = await task.promise;
		insertTranslateOutput(editor, translated);
		logger.log('Translation inserted into the note.');
		new Notice('Translation complete.');
	} catch (error) {
		handleTaskError(logger, error);
	} finally {
		plugin.clearActiveTask(handle);
	}
}

async function runWriteTask(
	plugin: WriterToolPlugin,
	editor: Editor,
	request: TaskRequest,
	config: Record<string, unknown>,
): Promise<void> {
	const translate = profileHasTranslation(request.profile);
	const outputOriginal = translate
		? request.outputOriginalForWrite
		: true;
	const wasm = await plugin.getWasm();
	const task = wasm.writeCancellable(config, plugin.logger, translate);
	const handle = registerTask(plugin, {
		label: translate ? 'Writing and translating note content' : 'Writing content',
		cancel: () => task.cancel(),
	});
	let insertPosition = editor.getCursor();

	try {
		plugin.logger.log('Writing started.');
		const output = await task.promise;
		plugin.logger.log('Writer content is ready.');

		if (outputOriginal) {
			insertPosition = insertOutput(editor, output.content, insertPosition);
			plugin.logger.log('Writer content inserted into the note.');
		}

		if (translate) {
			plugin.logger.log('Translation started.');
			const translated = await output.translated;
			if (translated) {
				insertOutput(editor, translated, insertPosition);
				plugin.logger.log('Translated content inserted into the note.');
			}
		}

		new Notice('Writer tool task complete.');
	} catch (error) {
		handleTaskError(plugin.logger, error);
	} finally {
		plugin.clearActiveTask(handle);
	}
}

function registerTask(
	plugin: WriterToolPlugin,
	task: RunningTask,
): RunningTask {
	plugin.setActiveTask(task);
	if (plugin.settings.openLogOnTaskStart) {
		plugin.openLog();
	}
	return task;
}

function insertTranslateOutput(editor: Editor, content: string): void {
	const selection = editor.getSelection();
	if (selection) {
		const from = editor.getCursor('from');
		const to = editor.getCursor('to');
		const output = normalizeOutput(content);
		editor.replaceRange(output, from, to);
		editor.setCursor(advancePosition(from, output));
		return;
	}

	insertOutput(editor, content, editor.getCursor());
}

function insertOutput(
	editor: Editor,
	content: string,
	position: EditorPosition,
): EditorPosition {
	const output = prepareOutput(editor, position, content);
	editor.replaceRange(output, position);
	const nextPosition = advancePosition(position, output);
	editor.setCursor(nextPosition);
	return nextPosition;
}

function prepareOutput(
	editor: Editor,
	position: EditorPosition,
	content: string,
): string {
	const normalized = normalizeOutput(content);
	const line = editor.getLine(position.line) ?? '';
	const before = line.slice(0, position.ch);
	const needsPrefix = before.trim().length > 0;
	return `${needsPrefix ? '\n\n' : ''}${normalized}`;
}

function normalizeOutput(content: string): string {
	const trimmed = content.trimEnd();
	return trimmed.endsWith('\n') ? trimmed : `${trimmed}\n`;
}

function advancePosition(
	position: EditorPosition,
	inserted: string,
): EditorPosition {
	const lines = inserted.split('\n');
	if (lines.length === 1) {
		const firstLine = lines[0] ?? '';
		return {
			line: position.line,
			ch: position.ch + firstLine.length,
		};
	}

	const lastLine = lines[lines.length - 1] ?? '';
	return {
		line: position.line + lines.length - 1,
		ch: lastLine.length,
	};
}

function handleTaskError(
	logger: { error(message: string): void; log(message: string): void },
	error: unknown,
): void {
	if (isAbortError(error)) {
		logger.log('Task cancelled.');
		new Notice('Writer tool task cancelled.');
		return;
	}

	const message = getErrorMessage(error);
	logger.error(message);
	new Notice(`Writer tool error: ${message}`);
}

function isAbortError(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'name' in error &&
		error.name === 'AbortError'
	);
}

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === 'string') {
		return error;
	}
	return 'Unknown error';
}
