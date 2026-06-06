#[cfg(target_arch = "wasm32")]
mod bindings;

#[cfg(target_arch = "wasm32")]
pub use bindings::*;

#[cfg(not(target_arch = "wasm32"))]
pub fn target_note() -> &'static str {
    "writer-tool-wasm exports JS bindings only for wasm32 targets"
}
