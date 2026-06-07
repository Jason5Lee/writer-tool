# Writer Tool for Obsidian

Writer Tool for Obsidian runs the repository's Writer Tool WASM module from an open Markdown note. It supports write tasks, translate tasks, configurable profiles, visible in-app logs, and cancellation for an ongoing task.

## Features

- Add, edit, and remove Writer Tool profiles from **Settings → Writer Tool**.
- Configure writer, retry, rejection detection, and translation settings through Obsidian UI controls.
- Start a task from the command palette or ribbon.
- Select **Write** or **Translate**, then select a profile.
- For write tasks, choose whether generated writer content is inserted before translated content.
- Show the task log in an Obsidian modal that works on desktop and mobile.
- Cancel an ongoing task from the command palette or the log modal.

## Runtime notes

The plugin stores profile settings in Obsidian plugin data. API keys are stored locally in the vault's plugin configuration data and are sent only to the API URLs configured in the selected profile.

Translate tasks use the selected text when text is selected. If no text is selected, the whole open note is used as translation input and the result is inserted at the cursor.

Write tasks insert generated content as soon as it is ready when **Output writer content** is enabled. If the selected profile has translation enabled, translated content is inserted when the translation promise resolves.

## Build

Prerequisites:

- Node.js 18 or newer.
- Rust with the `wasm32-unknown-unknown` target installed.
- `wasm-pack` installed and available on `PATH`.

From this folder:

```bash
npm install
npm run build:wasm
npm run build
```

Or run both build steps:

```bash
npm run build:all
```

`npm run build:wasm` builds the Rust crate in `../wasm` with `wasm-pack` and writes the generated package to:

```text
obsidian-plugin/wasm/pkg
```

`npm run build` type-checks the TypeScript and bundles `src/main.ts` to `main.js`.

## Manual install

Create this folder inside a vault:

```text
<Vault>/.obsidian/plugins/writer-tool-obsidian-plugin/
```

Place these files and folders there:

```text
main.js
manifest.json
styles.css
wasm/pkg/
```

Reload Obsidian and enable **Writer Tool** from **Settings → Community plugins**.

## Development

Run the TypeScript bundler in watch mode:

```bash
npm run dev
```

When the Rust WASM bindings change, rebuild them:

```bash
npm run build:wasm
```

Run linting:

```bash
npm run lint
```
