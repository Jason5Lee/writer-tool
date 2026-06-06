mod cli_logger;

use clap::{Parser, Subcommand};
use cli_logger::CliLogger;
use writer_tool_core::command_entry;

#[derive(Parser)]
#[command(
    name = "writer-tool",
    about = "Writer tool for generating content using AI models"
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Write content
    Write {
        /// Path to config file
        #[arg(short, long)]
        config: String,

        /// Path to output file
        #[arg(short, long)]
        output: String,

        /// Path to translation output file
        #[arg(short = 't', long)]
        translated: Option<String>,
    },
    /// Translate content
    Translate {
        /// Path to config file
        #[arg(short, long)]
        config: String,

        /// Path to translation input file
        #[arg(short, long)]
        input: String,

        /// Path to output file
        #[arg(short, long)]
        output: String,
    },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    let logger = CliLogger;

    match cli.command {
        Commands::Write {
            config,
            output,
            translated,
        } => {
            let config_content = tokio::fs::read_to_string(&config).await?;
            let config = toml::from_str(&config_content)?;

            let translate = if translated.is_some() {
                Some(command_entry::get_translation(&config)?)
            } else {
                None
            };

            let content = command_entry::run_writer(&logger, &config).await?;
            tokio::fs::write(&output, &content).await?;

            if let (Some(translation), Some(translated_path)) = (translate, translated) {
                let client = reqwest::Client::builder()
                    .timeout(std::time::Duration::from_secs(300))
                    .build()?;
                let translated_content = translation.translate(&logger, &client, &content).await?;
                tokio::fs::write(&translated_path, translated_content).await?;
            }
        }
        Commands::Translate {
            config,
            input,
            output,
        } => {
            let config_content = tokio::fs::read_to_string(&config).await?;
            let config = toml::from_str(&config_content)?;

            let input_content = tokio::fs::read_to_string(&input).await?;
            let translation = command_entry::get_translation(&config)?;

            let client = reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(300))
                .build()?;
            let translated_content = translation
                .translate(&logger, &client, &input_content)
                .await?;
            tokio::fs::write(&output, translated_content).await?;
        }
    }

    Ok(())
}
