use reqwest::Client;
use serde_json::Value;
use std::fmt::Write as _;

use crate::ai_actor::AIActor;
use crate::prompt_surrounding::PromptSurrounding;
use crate::retrier::Retrier;
use crate::Logger;

pub struct Translation {
    ai_actor: AIActor,
    retrier: Retrier,
    prompt_surrounding: PromptSurrounding,
    reasoning: Option<Value>,
    max_characters_per_segment: usize,
    skip_original: bool,
    lines_mismatched_delimiter: String,
}

impl Translation {
    pub fn new(
        ai_actor: AIActor,
        retrier: Retrier,
        prompt_surrounding: PromptSurrounding,
        reasoning: Option<Value>,
        max_characters_per_segment: usize,
        skip_original: bool,
        lines_mismatched_delimiter: String,
    ) -> Self {
        Self {
            ai_actor,
            retrier,
            prompt_surrounding,
            reasoning,
            max_characters_per_segment,
            skip_original,
            lines_mismatched_delimiter,
        }
    }

    pub fn default_prompt_surrounding(language: &str, instruction: &str) -> PromptSurrounding {
        PromptSurrounding::new(
            format!(
                "Translate a segment to {language}. FYI, the segment is part of the text written based on the following instruction.\n\n\
                 <instruction>\n\
                 {instruction}\n\
                 </instruction>\n\n\
                 Here is the segment, please translate it into {language}.\n\n\
                 <segment>\n"
            ),
            format!(
                "</segment>\n\n\
                 Please output the translated {language} text within <translated></translated>, ensuring the line count matches the original."
            ),
        )
    }

    pub async fn translate(
        &self,
        logger: &dyn Logger,
        client: &Client,
        content: &str,
    ) -> anyhow::Result<String> {
        let lines = get_content_lines(content);
        let mut output = String::new();

        if lines.is_empty() {
            return Ok(output);
        }

        let mut start = 0;
        while start < lines.len() {
            let mut end = start + 1;
            let mut length = lines[start].len();
            while end < lines.len() {
                let line_len = lines[end].len();
                if length + line_len > self.max_characters_per_segment {
                    break;
                }
                length += line_len;
                end += 1;
            }

            let segment = &lines[start..end];
            let prompt = self.prompt_surrounding.create_prompt_from_lines(segment);
            let reasoning = self.reasoning.clone();

            let translated: String = self
                .retrier
                .run(logger, "translation", async || {
                    let response = self
                        .ai_actor
                        .get_completion(client, None, &prompt, reasoning.as_ref())
                        .await?;
                    let tag_begin = "<translated>";
                    let tag_end = "</translated>";
                    let s = response
                        .find(tag_begin)
                        .ok_or_else(|| anyhow::anyhow!("Translated tag not found"))?
                        + tag_begin.len();
                    let e = response[s..]
                        .find(tag_end)
                        .ok_or_else(|| anyhow::anyhow!("Translated tag not found"))?;
                    Ok(response[s..s + e].to_string())
                })
                .await?;

            if self.skip_original {
                writeln!(&mut output, "{translated}")?;
            } else {
                let final_text =
                    get_final_keep_original(segment, &translated, &self.lines_mismatched_delimiter);
                writeln!(&mut output, "{final_text}")?;
            }

            start = end;
        }

        Ok(output)
    }
}

fn get_content_lines(content: &str) -> Vec<&str> {
    if content.is_empty() {
        return Vec::new();
    }

    content
        .split('\n')
        .map(|line| line.strip_suffix('\r').unwrap_or(line))
        .collect()
}

fn get_final_keep_original(
    lines: &[&str],
    translated: &str,
    lines_mismatched_delimiter: &str,
) -> String {
    let translated_lines = get_content_lines(translated);

    let mut result = String::new();

    if translated_lines.len() != lines.len() {
        result.push_str(lines_mismatched_delimiter);
        result.push('\n');
        for line in lines {
            result.push_str(line);
            result.push_str("\n\n");
        }
        if let Some((first, rest)) = translated_lines.split_first() {
            result.push_str(first);
            result.push('\n');
            for line in rest {
                result.push('\n');
                result.push_str(line);
                result.push('\n');
            }
        }
        result.push_str(lines_mismatched_delimiter);
        result.push('\n');
    } else {
        for (orig, trans) in lines.iter().zip(translated_lines.iter()) {
            result.push_str(orig);
            result.push_str("\n\n");
            result.push_str(trans);
            result.push('\n');
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::{get_content_lines, get_final_keep_original};

    #[test]
    fn preserves_blank_lines_and_crlf_sequences() {
        let lines = get_content_lines("first\r\n\r\nthird");

        assert_eq!(lines, vec!["first", "", "third"]);
    }

    #[test]
    fn keep_original_pairs_blank_lines_line_by_line() {
        let original = vec!["first", "", "third"];
        let translated = "uno\n\ndos";

        let result = get_final_keep_original(&original, translated, "=== mismatch ===");

        assert_eq!(result, "first\n\nuno\n\n\n\nthird\n\ndos\n");
    }

    #[test]
    fn mismatch_mode_wraps_output_with_delimiter() {
        let original = vec!["first", "second"];
        let translated = "uno";

        let result = get_final_keep_original(&original, translated, "=== mismatch ===");

        assert_eq!(
            result,
            "=== mismatch ===\nfirst\n\nsecond\n\nuno\n=== mismatch ===\n"
        );
    }
}
