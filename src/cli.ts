import { Command } from "commander";
import { registerApiCommands } from "./commands/api";
import { registerAuthCommands } from "./commands/auth";
import { VERSION } from "./lib/version";

export function createProgram(): Command {
  const program = new Command().name("spaceship").description("Manage Spaceship resources from the command line").version(VERSION)
    .option("--json", "emit stable machine-readable JSON").option("-q, --quiet", "suppress non-essential output")
    .option("-v, --verbose", "write request diagnostics to stderr").option("--no-color", "disable colored output")
    .option("--profile <name>", "select a configuration profile").option("--timeout <ms>", "request timeout")
    .option("--base-url <url>", "override the API base URL");
  program.showSuggestionAfterError(true).showHelpAfterError(); registerAuthCommands(program); registerApiCommands(program); return program;
}
