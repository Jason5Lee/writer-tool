# writer-tool-wasm

WASM bindings for `writer-tool-core`.

## API

```js
const result = await write(config, logger, true);
const output = result.content;
const translated = await result.translated;

const translatedOnly = await translate(config, input, logger);
```

For JS-side cancellation, use the cancellable variants:

```js
const task = writeCancellable(config, logger, true);
cancelButton.onclick = () => task.cancel();

const result = await task.promise;
const translated = await result.translated;

const translationTask = translateCancellable(config, input, logger);
const translatedOnly = await translationTask.promise;
```

`config` may be a TOML string, a JSON string, or a JavaScript object using the same field names as the TOML config. `logger` may be a function or an object with a `log(message)` method.

For `write`, the optional third argument controls whether translation is run. If it is omitted, translation runs when the config has a `translation` section. If it is `false`, `translated` resolves to `undefined`.

`write` resolves when generated content is ready. Translation continues through the returned `translated` promise, so callers can consume `content` before translation finishes.

Calling `cancel()` rejects the pending promise with an `AbortError`. For `writeCancellable`, the same cancellation token is shared by the initial write promise and the returned `translated` promise.
