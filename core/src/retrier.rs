use std::future::Future;
use std::time::Duration;

use crate::Logger;

type RetryDurationMillisSequence = Box<dyn Fn() -> Box<dyn Iterator<Item = u64>>>;

pub enum Retrier {
    NoRetry,
    WithRetry(RetryDurationMillisSequence),
}

impl Retrier {
    pub async fn run<T, Fut>(
        &self,
        logger: &dyn Logger,
        context: &str,
        mut f: impl FnMut() -> Fut,
    ) -> anyhow::Result<T>
    where
        Fut: Future<Output = anyhow::Result<T>>,
    {
        match self {
            Retrier::NoRetry => f().await,
            Retrier::WithRetry(durations_fn) => {
                for duration in durations_fn() {
                    match f().await {
                        Ok(result) => return Ok(result),
                        Err(e) => {
                            logger.log(&format!("[{context}] {e}. Retrying in {duration}ms..."));
                            sleep_for(Duration::from_millis(duration)).await;
                        }
                    }
                }
                anyhow::bail!("[{context}] Failed to perform after retrying")
            }
        }
    }

    pub fn fixed_duration(millis: u64, max_retries: Option<usize>) -> RetryDurationMillisSequence {
        match max_retries {
            Some(max_retries) => {
                Box::new(move || Box::new(RepeatDurationIter { value: millis }.take(max_retries)))
            }
            None => Box::new(move || Box::new(RepeatDurationIter { value: millis })),
        }
    }

    pub fn backoff_duration(max_retries: Option<usize>) -> RetryDurationMillisSequence {
        match max_retries {
            Some(max_retries) => {
                Box::new(move || Box::new(BackoffDurationMillis.into_iter().take(max_retries)))
            }
            None => Box::new(move || Box::new(BackoffDurationMillis.into_iter())),
        }
    }
}

#[cfg(not(target_arch = "wasm32"))]
async fn sleep_for(duration: Duration) {
    tokio::time::sleep(duration).await;
}

#[cfg(target_arch = "wasm32")]
async fn sleep_for(duration: Duration) {
    use js_sys::{Function, Promise, Reflect};
    use wasm_bindgen::prelude::Closure;
    use wasm_bindgen::{JsCast, JsValue};
    use wasm_bindgen_futures::JsFuture;

    let promise = Promise::new(&mut |resolve, reject| {
        let callback = Closure::once(move || {
            let _ = resolve.call0(&JsValue::UNDEFINED);
        });

        let global = js_sys::global();
        let timeout_result = Reflect::get(&global, &JsValue::from_str("setTimeout"))
            .and_then(JsValue::dyn_into::<Function>)
            .and_then(|set_timeout| {
                set_timeout
                    .call2(
                        &global,
                        callback.as_ref(),
                        &JsValue::from_f64(duration.as_millis() as f64),
                    )
                    .map(|_| ())
            });

        match timeout_result {
            Ok(()) => callback.forget(),
            Err(error) => {
                let _ = reject.call1(&JsValue::UNDEFINED, &error);
            }
        }
    });

    let _ = JsFuture::from(promise).await;
}

struct RepeatDurationIter {
    value: u64,
}

impl Iterator for RepeatDurationIter {
    type Item = u64;

    fn next(&mut self) -> Option<Self::Item> {
        Some(self.value)
    }
}

struct BackoffDurationMillis;

struct BackoffDurationMillisIter {
    index: usize,
}

impl IntoIterator for BackoffDurationMillis {
    type Item = u64;
    type IntoIter = BackoffDurationMillisIter;

    fn into_iter(self) -> Self::IntoIter {
        BackoffDurationMillisIter { index: 0 }
    }
}

impl Iterator for BackoffDurationMillisIter {
    type Item = u64;

    fn next(&mut self) -> Option<Self::Item> {
        match self.index {
            0 => {
                self.index = 1;
                Some(1_000)
            }
            1 => {
                self.index = 2;
                Some(5_000)
            }
            2 => {
                self.index = 3;
                Some(10_000)
            }
            3 => {
                self.index = 4;
                Some(15_000)
            }
            4 => {
                self.index = 5;
                Some(30_000)
            }
            5 => {
                self.index = 6;
                Some(45_000)
            }
            _ => Some(60_000),
        }
    }
}
