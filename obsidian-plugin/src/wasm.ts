import type { Plugin } from 'obsidian';

export interface WasmWriteOutput {
	content: string;
	translated: Promise<string | undefined>;
}

export interface WasmCancellableTask<T> {
	promise: Promise<T>;
	cancel(): void;
}

export interface WriterToolWasm {
	writeCancellable(
		config: unknown,
		logger: { log(message: string): void },
		translate?: boolean,
	): WasmCancellableTask<WasmWriteOutput>;
	translateCancellable(
		config: unknown,
		input: string,
		logger: { log(message: string): void },
	): WasmCancellableTask<string>;
}

interface WriterToolWasmModule extends WriterToolWasm {
	default(input?: RequestInfo | URL | Response | BufferSource): Promise<void>;
}

let cachedWasm: Promise<WriterToolWasm> | null = null;

export function loadWriterToolWasm(plugin: Plugin): Promise<WriterToolWasm> {
	cachedWasm ??= load(plugin);
	return cachedWasm;
}

async function load(plugin: Plugin): Promise<WriterToolWasm> {
	const pluginDir =
		plugin.manifest.dir ??
		`${plugin.app.vault.configDir}/plugins/${plugin.manifest.id}`;
	const packageDir = `${pluginDir}/wasm/pkg`;
	const gluePath = `${packageDir}/writer_tool_wasm.js`;
	const wasmPath = `${packageDir}/writer_tool_wasm_bg.wasm`;
	const glueUrl = plugin.app.vault.adapter.getResourcePath(gluePath);
	const wasmBytes = await plugin.app.vault.adapter.readBinary(wasmPath);
	// The URL is produced by Obsidian for this plugin's generated local glue file.
	// eslint-disable-next-line no-unsanitized/method
	const module = (await import(
		/* @vite-ignore */ glueUrl
	)) as WriterToolWasmModule;

	await module.default(new Uint8Array(wasmBytes));
	return module;
}
