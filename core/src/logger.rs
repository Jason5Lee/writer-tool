pub trait Logger: Send + Sync {
    fn log(&self, message: &str);
}
