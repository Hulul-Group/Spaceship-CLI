import { Command } from "commander";
import { addPrefix, removePrefix } from "../../lib/prefix";

export function registerPrefixCommands(program: Command): void {
  const prefix = program.command("prefix").description("Manage command-name aliases");
  prefix.command("set <name>").description("Add a command alias").addHelpText("after", "\nExamples:\n  space prefix set spaceship\n  space prefix set ship\n  space prefix set my-company\n").action(async (name: string, _opts, command) => {
    const path = await addPrefix(name); if (!command.optsWithGlobals().quiet) process.stderr.write(`Prefix '${name.toLowerCase()}' is ready at ${path}.\n`);
  });
  prefix.command("remove <name>").description("Remove a custom alias").action(async (name: string, _opts, command) => {
    const path = await removePrefix(name); if (!command.optsWithGlobals().quiet) process.stderr.write(`Removed prefix '${name.toLowerCase()}' from ${path}.\n`);
  });
}
