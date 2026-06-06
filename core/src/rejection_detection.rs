use reqwest::Client;
use serde_json::Value;

use crate::Logger;
use crate::ai_actor::AIActor;
use crate::prompt_surrounding::PromptSurrounding;
use crate::retrier::Retrier;

pub struct RejectionDetection {
    pub ai_actor: AIActor,
    pub retrier: Retrier,
    pub prompt_surrounding: PromptSurrounding,
    pub reasoning: Option<Value>,
    pub sample_length: usize,
    pub threshold: i32,
}

impl RejectionDetection {
    pub fn default_prompt_surrounding() -> PromptSurrounding {
        PromptSurrounding::new(
            "Given the sample text, rate how likely it is a rejection message on a scale from 0 to 100, and output the result between <output></output>.\n\n<sample>",
            "</sample>\n\nPlease output the likelihood of the text being a rejection message (0 to 100) within <output></output> tags.",
        )
    }

    pub async fn invoke(
        &self,
        logger: &dyn Logger,
        client: &Client,
        content: &str,
    ) -> anyhow::Result<bool> {
        let sample: String = content.chars().take(self.sample_length).collect();
        let prompt = self.prompt_surrounding.create_prompt(&sample);
        let reasoning = self.reasoning.clone();

        let likelihood: i32 = self
            .retrier
            .run(logger, "rejection-detection", async || {
                let response = self
                    .ai_actor
                    .get_completion(client, None, &prompt, reasoning.as_ref())
                    .await?;
                let start = response
                    .find("<output>")
                    .ok_or_else(|| anyhow::anyhow!("Output tag not found"))?
                    + "<output>".len();
                let end = response[start..]
                    .find("</output>")
                    .ok_or_else(|| anyhow::anyhow!("Output tag not found"))?;
                let output = &response[start..start + end];
                let likelihood: i32 = output
                    .trim()
                    .parse()
                    .map_err(|_| anyhow::anyhow!("Output is not a number"))?;
                Ok(likelihood)
            })
            .await?;

        Ok(100 - likelihood < self.threshold)
    }
}
