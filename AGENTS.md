# AGENTS

This document defines repository-wide instructions for coding agents.

## Language

All code comments, commit messages, documentation strings, error messages, and user-facing text in this repository must be written in English.

Guidance:

- Write all inline comments in English.
- Write thrown error messages and logs in English.
- Write documentation and docstrings in English.
- Use English for commit messages.
- Avoid mixed-language identifiers and text.

### Documentation

- Write or update information that will be useful for your subsequent development as root directory AGENTS.md, subdirectory AGENTS.md, or skills.

## Development Notes

- Keep the code as close to the intent as possible without compromising performance.
- Do not perform blocking I/O directly in an async function. Instead, use `tokio::task::spawn_blocking`. When defining a function that performs blocking I/O, prefix it with `blocking` to prevent accidental direct calls from async functions.
- Before committing, run formatting and checks available in the current environment:
  - `cargo fmt`
  - `cargo test`
  - `cargo clippy --all-targets --all-features`
