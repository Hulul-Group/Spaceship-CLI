#!/usr/bin/env bun
import { CliError, ExitCode, formatError } from "./lib/errors";
import { redactText } from "./lib/redact";
import { createProgram } from "./cli";

let verbose = process.argv.includes("--verbose") || process.argv.includes("-v");
async function main(): Promise<void> { try { await createProgram().parseAsync(process.argv); } catch (error) { const code = error instanceof CliError ? error.exitCode : (error as { code?: string }).code === "commander.helpDisplayed" ? 0 : (error as { code?: string }).code?.startsWith("commander.") ? ExitCode.usage : ExitCode.runtime;
  if (code !== 0) process.stderr.write(`${redactText(formatError(error, verbose))}\n`); process.exitCode = code; } }
process.on("unhandledRejection", (error) => { process.stderr.write(`${redactText(formatError(error, verbose))}\n`); process.exitCode = ExitCode.runtime; });
process.on("SIGINT", () => { process.stderr.write("Interrupted.\n"); process.exit(130); });
await main();
