use serde_json::Value;

use crate::ai_actor::AIActor;
use crate::config::{self, Config};
use crate::prompt_surrounding::PromptSurrounding;
use crate::rejection_detection::RejectionDetection;
use crate::retrier::Retrier;
use crate::translation::Translation;
use crate::writing::Writing;
use crate::Logger;

pub fn get_config(content: &str) -> anyhow::Result<Config> {
    Ok(toml::from_str(content)?)
}

pub async fn run_writer(logger: &dyn Logger, config: &Config) -> anyhow::Result<String> {
    let writer = config
        .writer
        .as_ref()
        .ok_or_else(|| anyhow::anyhow!("Error: Writer section is missing from the config file"))?;
    let prompt = writer.prompt.as_ref().ok_or_else(|| {
        anyhow::anyhow!("Error: Writer instruction is missing from the config file")
    })?;
    let instruction = prompt
        .instruction
        .as_deref()
        .filter(|s| !s.is_empty())
        .ok_or_else(|| {
            anyhow::anyhow!("Error: Writer prompt instruction is missing from the config file")
        })?;

    let retrier = get_retrier_by_config(writer.retry.as_ref())?;
    let writer_actor = create_ai_actor(
        "writer",
        writer.api_url.as_deref(),
        writer.api_key.as_deref(),
        writer.model.as_deref(),
    )?;

    let rejection_detection = if let Some(rd_config) = config.reject_detection.as_ref()
        && rd_config.enable
    {
        let threshold = rd_config
            .threshold
            .ok_or_else(|| anyhow::anyhow!("`reject-detection` must have a threshold specified"))?;
        let rd_retrier = get_retrier_by_config(rd_config.retry.as_ref())?;

        let mut rd_reasoning: Option<Value> = None;
        let prompt_surrounding = if let Some(cp) = rd_config.custom_prompt.as_ref()
            && cp.enable
        {
            let before = cp
                .prompt_before
                .as_deref()
                .filter(|s| !s.is_empty())
                .ok_or_else(|| {
                    anyhow::anyhow!(
                        "`reject-detection.custom-prompt` must have a prompt-before specified"
                    )
                })?;
            let after = cp
                .prompt_after
                .as_deref()
                .filter(|s| !s.is_empty())
                .ok_or_else(|| {
                    anyhow::anyhow!(
                        "`reject-detection.custom-prompt` must have a prompt-after specified"
                    )
                })?;
            if let Some(r) = &cp.reasoning {
                rd_reasoning = Some(serde_json::from_str::<Value>(r).map_err(|_| {
                    anyhow::anyhow!(
                        "`reject-detection.custom-prompt.reasoning` must be a valid JSON string"
                    )
                })?);
            }
            PromptSurrounding::new(before, after)
        } else {
            RejectionDetection::default_prompt_surrounding()
        };

        let rd_actor = create_ai_actor(
            "reject-detection",
            rd_config.api_url.as_deref(),
            rd_config.api_key.as_deref(),
            rd_config.model.as_deref(),
        )?;

        Some(RejectionDetection {
            ai_actor: rd_actor,
            retrier: rd_retrier,
            prompt_surrounding,
            reasoning: rd_reasoning,
            sample_length: rd_config.sample_length.unwrap_or(usize::MAX),
            threshold,
        })
    } else {
        None
    };

    let writer_reasoning = if let Some(r) = &prompt.reasoning {
        Some(serde_json::from_str::<Value>(r).map_err(|_| {
            anyhow::anyhow!("`writer.prompt.reasoning` must be a valid JSON string")
        })?)
    } else {
        None
    };

    let user = format!(
        "{}{}",
        instruction,
        prompt.requirement.as_deref().unwrap_or("")
    );
    let writing = Writing::new(writer_actor, writer_reasoning, retrier, rejection_detection);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()?;
    writing
        .invoke(logger, &client, prompt.system.as_deref(), &user)
        .await
}

pub fn get_translation(config: &Config) -> anyhow::Result<Translation> {
    let translation = config.translation.as_ref().ok_or_else(|| {
        anyhow::anyhow!("Error: Translation section is missing from the config file")
    })?;

    if !translation.skip_original
        && translation
            .lines_mismatched_delimiter
            .as_deref()
            .filter(|s| !s.is_empty())
            .is_none()
    {
        anyhow::bail!("`translation` section of the config must have a lines-mismatched-delimiter specified when `skip-original` is false");
    }

    let retrier = get_retrier_by_config(translation.retry.as_ref())?;

    let (prompt_surrounding, translation_reasoning) = if translation
        .default_prompt
        .as_ref()
        .is_some_and(|dp| dp.enable)
    {
        if translation
            .custom_prompt
            .as_ref()
            .is_some_and(|cp| cp.enable)
        {
            anyhow::bail!("`translation` section of the config cannot have both `default-prompt` and `custom-prompt` enabled");
        }
        let dp = translation.default_prompt.as_ref().unwrap();
        let language = dp
            .language
            .as_deref()
            .filter(|s| !s.is_empty())
            .ok_or_else(|| {
                anyhow::anyhow!("`translation.default-prompt` must have a language specified")
            })?;
        let instruction = config
            .writer
            .as_ref()
            .and_then(|w| w.prompt.as_ref())
            .and_then(|p| p.instruction.as_deref())
            .filter(|s| !s.is_empty())
            .ok_or_else(|| {
                anyhow::anyhow!("`writer.prompt.instruction` is required for default-prompt")
            })?;
        (
            Translation::default_prompt_surrounding(language, instruction),
            None,
        )
    } else {
        let cp = translation.custom_prompt.as_ref().ok_or_else(|| {
                anyhow::anyhow!("`translation` section of the config must have either `default-prompt` or `custom-prompt` enabled")
            })?;

        let prompt_before = cp
            .prompt_before
            .as_deref()
            .filter(|s| !s.is_empty())
            .ok_or_else(|| {
                anyhow::anyhow!("`translation.custom-prompt` must have a prompt-before specified")
            })?;
        let prompt_after = cp
            .prompt_after
            .as_deref()
            .filter(|s| !s.is_empty())
            .ok_or_else(|| {
                anyhow::anyhow!("`translation.custom-prompt` must have a prompt-after specified")
            })?;

        let reasoning = if let Some(r) = &cp.reasoning {
            Some(serde_json::from_str::<Value>(r).map_err(|_| {
                anyhow::anyhow!("`translation.custom-prompt.reasoning` must be a valid JSON string")
            })?)
        } else {
            None
        };

        let actual_before = if cp.has_instruction {
            let pbi = cp
                    .prompt_before_instruction
                    .as_deref()
                    .filter(|s| !s.is_empty())
                    .ok_or_else(|| {
                        anyhow::anyhow!("`translation.custom-prompt` must have a prompt-before-instruction specified when `has-instruction` is true")
                    })?;
            let instruction = config
                    .writer
                    .as_ref()
                    .and_then(|w| w.prompt.as_ref())
                    .and_then(|p| p.instruction.as_deref())
                    .filter(|s| !s.is_empty())
                    .ok_or_else(|| {
                        anyhow::anyhow!(
                            "`writer.prompt.instruction` is required for custom-prompt when `has-instruction` is true"
                        )
                    })?;
            format!("{}{}{}", pbi, instruction, prompt_before)
        } else {
            prompt_before.to_string()
        };

        (
            PromptSurrounding::new(actual_before, prompt_after),
            reasoning,
        )
    };

    let actor = create_ai_actor(
        "translation",
        translation.api_url.as_deref(),
        translation.api_key.as_deref(),
        translation.model.as_deref(),
    )?;

    Ok(Translation::new(
        actor,
        retrier,
        prompt_surrounding,
        translation_reasoning,
        translation.max_characters_per_segment.unwrap_or(usize::MAX),
        translation.skip_original,
        translation
            .lines_mismatched_delimiter
            .clone()
            .unwrap_or_default(),
    ))
}

fn get_retrier_by_config(retry_config: Option<&config::RetryConfig>) -> anyhow::Result<Retrier> {
    match retry_config {
        None => Ok(Retrier::NoRetry),
        Some(cfg) if !cfg.enable => Ok(Retrier::NoRetry),
        Some(cfg) => {
            let duration = cfg
                .duration
                .as_ref()
                .ok_or_else(|| anyhow::anyhow!("`retry` must have a duration specified"))?;
            let durations = match duration {
                config::RetryDuration::Fixed(d) => Retrier::fixed_duration(*d, cfg.max_retries),
                config::RetryDuration::Named(s) if s == "backoff" => {
                    Retrier::backoff_duration(cfg.max_retries)
                }
                _ => anyhow::bail!("`retry.duration` must be a non-negative integer or `backoff`"),
            };
            Ok(Retrier::WithRetry(durations))
        }
    }
}

fn create_ai_actor(
    config_path: &str,
    api_url: Option<&str>,
    api_key: Option<&str>,
    model: Option<&str>,
) -> anyhow::Result<AIActor> {
    let api_url = api_url.ok_or_else(|| {
        anyhow::anyhow!("Error: {config_path} section is missing api-url from the config file")
    })?;
    let model = model.ok_or_else(|| {
        anyhow::anyhow!("Error: {config_path} section is missing model from the config file")
    })?;
    AIActor::new(api_url, api_key.map(|s| s.to_string()), model.to_string())
}
