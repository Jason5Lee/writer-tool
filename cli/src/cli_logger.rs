use writer_tool_core::Logger;

pub struct CliLogger;

impl Logger for CliLogger {
    fn log(&self, message: &str) {
        eprintln!("{}", message);
    }
}
