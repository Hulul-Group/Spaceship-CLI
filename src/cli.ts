import { Command } from "commander";
import { registerApiCommands } from "./commands/api";
import { registerAuthCommands } from "./commands/auth";
import { registerPrefixCommands } from "./commands/prefix";
import { VERSION } from "./lib/version";

export function createProgram(): Command {
  const program = new Command().name("space").description("Manage Spaceship resources").version(VERSION)
    .option("-j, --json", "output JSON").option("-q, --quiet", "hide non-essential output")
    .option("-v, --verbose", "show request details").option("--no-color", "disable colors")
    .option("-p, --profile <name>", "use a profile").option("-t, --timeout <ms>", "request timeout")
    .option("-u, --base-url <url>", "use another API URL");
  program.configureHelp({ subcommandTerm: (command) => `${command.name()}${command.usage() ? ` ${command.usage()}` : ""}` });
  program.showSuggestionAfterError(true).showHelpAfterError(); registerAuthCommands(program); registerPrefixCommands(program); registerApiCommands(program); return program;
}
