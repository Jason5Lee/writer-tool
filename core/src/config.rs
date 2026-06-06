use serde::Deserialize;

#[derive(Deserialize)]
pub struct Config {
    pub writer: Option<WriterConfig>,
    #[serde(rename = "reject-detection")]
    pub reject_detection: Option<RejectDetectionConfig>,
    pub translation: Option<TranslationConfig>,
}

#[derive(Deserialize)]
pub struct WriterConfig {
    #[serde(rename = "api-url")]
    pub api_url: Option<String>,
    #[serde(rename = "api-key")]
    pub api_key: Option<String>,
    pub model: Option<String>,
    pub prompt: Option<WriterPromptConfig>,
    pub retry: Option<RetryConfig>,
}

#[derive(Deserialize)]
pub struct WriterPromptConfig {
    pub system: Option<String>,
    pub instruction: Option<String>,
    pub requirement: Option<String>,
    pub reasoning: Option<String>,
}

#[derive(Deserialize)]
pub struct RejectDetectionConfig {
    #[serde(default)]
    pub enable: bool,
    #[serde(rename = "api-url")]
    pub api_url: Option<String>,
    #[serde(rename = "api-key")]
    pub api_key: Option<String>,
    pub model: Option<String>,
    #[serde(rename = "sample-length")]
    pub sample_length: Option<usize>,
    pub threshold: Option<i32>,
    #[serde(rename = "custom-prompt")]
    pub custom_prompt: Option<RejectDetectionCustomPromptConfig>,
    pub retry: Option<RetryConfig>,
}

#[derive(Deserialize)]
pub struct RejectDetectionCustomPromptConfig {
    #[serde(default)]
    pub enable: bool,
    #[serde(rename = "prompt-before")]
    pub prompt_before: Option<String>,
    #[serde(rename = "prompt-after")]
    pub prompt_after: Option<String>,
    pub reasoning: Option<String>,
}

#[derive(Deserialize)]
pub struct TranslationConfig {
    #[serde(default)]
    pub enable: bool,
    #[serde(rename = "api-url")]
    pub api_url: Option<String>,
    #[serde(rename = "api-key")]
    pub api_key: Option<String>,
    pub model: Option<String>,
    #[serde(rename = "max-characters-per-segment")]
    pub max_characters_per_segment: Option<usize>,
    #[serde(rename = "skip-original", default)]
    pub skip_original: bool,
    #[serde(rename = "lines-mismatched-delimiter")]
    pub lines_mismatched_delimiter: Option<String>,
    #[serde(rename = "default-prompt")]
    pub default_prompt: Option<DefaultTranslationPromptConfig>,
    #[serde(rename = "custom-prompt")]
    pub custom_prompt: Option<CustomTranslationPromptConfig>,
    pub retry: Option<RetryConfig>,
}

#[derive(Deserialize)]
pub struct DefaultTranslationPromptConfig {
    #[serde(default)]
    pub enable: bool,
    pub language: Option<String>,
}

#[derive(Deserialize)]
pub struct CustomTranslationPromptConfig {
    #[serde(default)]
    pub enable: bool,
    #[serde(rename = "has-instruction", default)]
    pub has_instruction: bool,
    #[serde(rename = "prompt-before-instruction")]
    pub prompt_before_instruction: Option<String>,
    #[serde(rename = "prompt-before")]
    pub prompt_before: Option<String>,
    #[serde(rename = "prompt-after")]
    pub prompt_after: Option<String>,
    pub reasoning: Option<String>,
}

#[derive(Deserialize)]
pub struct RetryConfig {
    #[serde(default)]
    pub enable: bool,
    pub duration: Option<RetryDuration>,
    #[serde(rename = "max-retries")]
    pub max_retries: Option<usize>,
}

#[derive(Deserialize)]
#[serde(untagged)]
pub enum RetryDuration {
    Fixed(u64),
    Named(String),
}
