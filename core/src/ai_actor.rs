use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;

pub struct AIActor {
    key: Option<String>,
    model: String,
    completions_endpoint: String,
}

impl AIActor {
    pub fn new(api_url: &str, api_key: Option<String>, model: String) -> anyhow::Result<Self> {
        let endpoint = format!("{}/v1/chat/completions", api_url.trim_end_matches('/'));
        let url = reqwest::Url::parse(&endpoint)?;
        if url.scheme() != "http" && url.scheme() != "https" {
            anyhow::bail!(
                "The constructed API URL '{}' is not a valid HTTP/HTTPS URL.",
                endpoint
            );
        }
        Ok(Self {
            key: api_key,
            model,
            completions_endpoint: endpoint,
        })
    }

    pub async fn get_completion(
        &self,
        client: &Client,
        system: Option<&str>,
        user: &str,
        reasoning: Option<&Value>,
    ) -> anyhow::Result<String> {
        let mut messages = Vec::new();
        if let Some(sys) = system {
            messages.push(ChatMessage {
                role: "system".to_string(),
                content: sys.to_string(),
            });
        }
        messages.push(ChatMessage {
            role: "user".to_string(),
            content: user.to_string(),
        });

        let request = ChatRequest {
            model: self.model.clone(),
            messages,
            reasoning: reasoning.cloned(),
        };

        let mut req = client.post(&self.completions_endpoint).json(&request);
        if let Some(key) = &self.key {
            if !key.is_empty() {
                req = req.bearer_auth(key);
            }
        }

        let response = req.send().await?.error_for_status()?;
        let chat_response: ChatResponse = response.json().await?;

        let content = chat_response
            .choices
            .and_then(|c| c.into_iter().next())
            .and_then(|c| c.message)
            .and_then(|m| {
                if m.content.is_empty() {
                    None
                } else {
                    Some(m.content)
                }
            })
            .ok_or_else(|| anyhow::anyhow!("Received an empty or invalid response from the AI."))?;

        Ok(content)
    }
}

#[derive(Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    reasoning: Option<Value>,
}

#[derive(Serialize, Deserialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct ChatResponse {
    choices: Option<Vec<Choice>>,
}

#[derive(Deserialize)]
struct Choice {
    message: Option<ChatMessage>,
}
