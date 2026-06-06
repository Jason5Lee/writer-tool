# AGENTS

This crate exposes `writer-tool-core` to JavaScript through `wasm-bindgen`.

- Keep the public API free of file-system paths. Accept config as a TOML string, JSON string, or JSON-serializable object, and accept content as strings.
- Keep `write` as a content-ready promise that resolves to an object with `content` and `translated` fields, so generated content can be consumed before translation finishes.
- Keep browser-only bindings behind `target_arch = "wasm32"` so native workspace checks remain useful.
