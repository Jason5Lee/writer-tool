pub struct PromptSurrounding {
    pub before: String,
    pub after: String,
}

impl PromptSurrounding {
    pub fn new(before: impl Into<String>, after: impl Into<String>) -> Self {
        Self {
            before: before.into(),
            after: after.into(),
        }
    }

    pub fn create_prompt(&self, content: &str) -> String {
        format!("{}{}{}", self.before, content, self.after)
    }

    pub fn create_prompt_from_lines(&self, lines: &[&str]) -> String {
        let mut result = self.before.clone();
        for line in lines {
            result.push_str(line);
            result.push('\n');
        }
        result.push_str(&self.after);
        result
    }
}
