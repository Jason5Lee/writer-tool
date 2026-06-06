use js_sys::{Function, Promise, Reflect};
use pin_project_lite::pin_project;
use std::cell::RefCell;
use std::future::Future;
use std::pin::Pin;
use std::rc::Rc;
use std::task::{Context, Poll, Waker};
use wasm_bindgen::JsCast;
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::future_to_promise;
use writer_tool_core::Logger;
use writer_tool_core::command_entry;
use writer_tool_core::config::Config;

#[wasm_bindgen]
pub struct WriteOutput {
    content: String,
    translated: Promise,
}

#[wasm_bindgen]
pub struct CancellableTask {
    promise: Promise,
    token: CancelToken,
}

#[wasm_bindgen]
impl WriteOutput {
    #[wasm_bindgen(getter)]
    pub fn content(&self) -> String {
        self.content.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn translated(&self) -> Promise {
        self.translated.clone()
    }
}

impl CancellableTask {
    fn new(promise: Promise, token: CancelToken) -> Self {
        Self { promise, token }
    }
}

#[wasm_bindgen]
impl CancellableTask {
    #[wasm_bindgen(getter)]
    pub fn promise(&self) -> Promise {
        self.promise.clone()
    }

    pub fn cancel(&self) {
        self.token.cancel();
    }
}

#[wasm_bindgen]
pub fn write(config: JsValue, logger: JsValue, translate: Option<bool>) -> Promise {
    write_cancellable(config, logger, translate).promise()
}

#[wasm_bindgen(js_name = writeCancellable)]
pub fn write_cancellable(
    config: JsValue,
    logger: JsValue,
    translate: Option<bool>,
) -> CancellableTask {
    let token = CancelToken::new();
    let config = match parse_config(config) {
        Ok(config) => config,
        Err(error) => return CancellableTask::new(Promise::reject(&error), token),
    };
    let should_translate = translate.unwrap_or(config.translation.is_some());
    let logger = JsLogger::new(logger);
    let write_token = token.clone();

    let promise = future_to_promise(async move {
        let content = run_with_cancel(
            write_token.clone(),
            command_entry::run_writer(&logger, &config),
        )
        .await?;
        let translated = if should_translate {
            let content = content.clone();
            let translate_token = write_token.clone();
            future_to_promise(async move {
                run_with_cancel(
                    translate_token,
                    translate_content(&logger, &config, &content),
                )
                .await
                .map(|content| JsValue::from_str(&content))
            })
        } else {
            Promise::resolve(&JsValue::UNDEFINED)
        };

        Ok(WriteOutput {
            content,
            translated,
        }
        .into())
    });

    CancellableTask::new(promise, token)
}

#[wasm_bindgen]
pub fn translate(config: JsValue, input: String, logger: JsValue) -> Promise {
    translate_cancellable(config, input, logger).promise()
}

#[wasm_bindgen(js_name = translateCancellable)]
pub fn translate_cancellable(config: JsValue, input: String, logger: JsValue) -> CancellableTask {
    let token = CancelToken::new();
    let config = match parse_config(config) {
        Ok(config) => config,
        Err(error) => return CancellableTask::new(Promise::reject(&error), token),
    };
    let logger = JsLogger::new(logger);
    let translate_token = token.clone();

    let promise = future_to_promise(async move {
        run_with_cancel(translate_token, translate_content(&logger, &config, &input))
            .await
            .map(|content| JsValue::from_str(&content))
    });

    CancellableTask::new(promise, token)
}

async fn translate_content(
    logger: &dyn Logger,
    config: &Config,
    content: &str,
) -> anyhow::Result<String> {
    let translation = command_entry::get_translation(config)?;
    let client = reqwest::Client::builder().build()?;
    translation.translate(logger, &client, content).await
}

async fn run_with_cancel<T, F>(token: CancelToken, future: F) -> Result<T, JsValue>
where
    F: Future<Output = anyhow::Result<T>>,
{
    CancelRace { token, future }.await
}

pin_project! {
    struct CancelRace<F> {
        token: CancelToken,
        #[pin]
        future: F,
    }
}

impl<T, F> Future for CancelRace<F>
where
    F: Future<Output = anyhow::Result<T>>,
{
    type Output = Result<T, JsValue>;

    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        let this = self.project();

        if this.token.is_cancelled() {
            this.token.clear_waker();
            return Poll::Ready(Err(abort_error()));
        }

        match this.future.poll(cx) {
            Poll::Ready(result) => {
                this.token.clear_waker();
                Poll::Ready(result.map_err(error_to_js))
            }
            Poll::Pending => {
                this.token.register(cx.waker());

                if this.token.is_cancelled() {
                    this.token.clear_waker();
                    Poll::Ready(Err(abort_error()))
                } else {
                    Poll::Pending
                }
            }
        }
    }
}

#[derive(Clone)]
struct CancelToken {
    state: Rc<RefCell<CancelState>>,
}

struct CancelState {
    cancelled: bool,
    waker: Option<Waker>,
}

impl CancelToken {
    fn new() -> Self {
        Self {
            state: Rc::new(RefCell::new(CancelState {
                cancelled: false,
                waker: None,
            })),
        }
    }

    fn cancel(&self) {
        let waker = {
            let mut state = self.state.borrow_mut();
            if state.cancelled {
                return;
            }

            state.cancelled = true;
            state.waker.take()
        };

        if let Some(waker) = waker {
            waker.wake();
        }
    }

    fn is_cancelled(&self) -> bool {
        self.state.borrow().cancelled
    }

    fn register(&self, waker: &Waker) {
        let mut state = self.state.borrow_mut();
        if state.cancelled {
            waker.wake_by_ref();
        } else {
            state.waker = Some(waker.clone());
        }
    }

    fn clear_waker(&self) {
        self.state.borrow_mut().waker = None;
    }
}

fn parse_config(value: JsValue) -> Result<Config, JsValue> {
    if let Some(config) = value.as_string() {
        return parse_config_string(&config);
    }

    serde_wasm_bindgen::from_value(value)
        .map_err(|error| message_error(&format!("Failed to parse config object: {error}"), None))
}

fn parse_config_string(config: &str) -> Result<Config, JsValue> {
    toml::from_str(config).or_else(|toml_error| {
        serde_json::from_str(config).map_err(|json_error| {
            message_error(
                &format!("Failed to parse config as TOML ({toml_error}) or JSON ({json_error})"),
                None,
            )
        })
    })
}

fn error_to_js(error: anyhow::Error) -> JsValue {
    message_error(&error.to_string(), None)
}

fn message_error(message: &str, cause: Option<JsValue>) -> JsValue {
    let error = js_sys::Error::new(message);
    if let Some(cause) = cause {
        let _ = Reflect::set(&error, &JsValue::from_str("cause"), &cause);
    }
    error.into()
}

fn abort_error() -> JsValue {
    let error = js_sys::Error::new("Operation was cancelled");
    let _ = Reflect::set(
        &error,
        &JsValue::from_str("name"),
        &JsValue::from_str("AbortError"),
    );
    error.into()
}

struct JsLogger {
    this: JsValue,
    log: Option<Function>,
}

impl JsLogger {
    fn new(value: JsValue) -> Self {
        if value.is_function() {
            return Self {
                this: JsValue::UNDEFINED,
                log: Some(value.unchecked_into()),
            };
        }

        let log = Reflect::get(&value, &JsValue::from_str("log"))
            .ok()
            .filter(JsValue::is_function)
            .map(JsValue::unchecked_into);

        Self { this: value, log }
    }
}

// The core logger trait is Send + Sync, while these bindings run on the
// wasm-bindgen single-threaded event loop and only call the logger from there.
unsafe impl Send for JsLogger {}
unsafe impl Sync for JsLogger {}

impl Logger for JsLogger {
    fn log(&self, message: &str) {
        if let Some(log) = &self.log {
            let _ = log.call1(&self.this, &JsValue::from_str(message));
        }
    }
}
