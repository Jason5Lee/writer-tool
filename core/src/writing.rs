use reqwest::Client;
use serde_json::Value;

use crate::ai_actor::AIActor;
use crate::rejection_detection::RejectionDetection;
use crate::retrier::Retrier;
use crate::Logger;

pub struct Writing {
    ai_actor: AIActor,
    reasoning: Option<Value>,
    retrier: Retrier,
    rejection_detection: Option<RejectionDetection>,
}

impl Writing {
    pub fn new(
        ai_actor: AIActor,
        reasoning: Option<Value>,
        retrier: Retrier,
        rejection_detection: Option<RejectionDetection>,
    ) -> Self {
        Self {
            ai_actor,
            reasoning,
            retrier,
            rejection_detection,
        }
    }

    pub async fn invoke(
        &self,
        logger: &dyn Logger,
        client: &Client,
        system: Option<&str>,
        user: &str,
    ) -> anyhow::Result<String> {
        self.retrier
            .run(logger, "writing", async || {
                let content = self
                    .ai_actor
                    .get_completion(client, system, user, self.reasoning.as_ref())
                    .await?;
                if let Some(rd) = &self.rejection_detection {
                    if rd.invoke(logger, client, &content).await? {
                        anyhow::bail!("Rejection detected");
                    }
                }
                Ok(content)
            })
            .await
    }
}
