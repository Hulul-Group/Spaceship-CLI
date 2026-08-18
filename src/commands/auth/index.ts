import { isCancel, password, text } from "@clack/prompts";
import { Command } from "commander";
import { resolveConfig, savePublicConfig } from "../../lib/config";
import { deleteSecret, getSecret, setSecret } from "../../lib/credentials";
import { CliError, ExitCode } from "../../lib/errors";
import { Logger } from "../../lib/logger";

export function registerAuthCommands(program: Command): void {
  const auth = program.command("auth").description("Sign in and manage credentials");
  auth.command("login").description("Save credentials").option("-k, --api-key <key>").option("-s, --api-secret <secret>").option("-u, --base-url <url>").action(async (opts, command) => {
    const globals = command.optsWithGlobals(); if (!process.stdin.isTTY && (!opts.apiKey || !opts.apiSecret)) throw new CliError("Login needs credentials in a non-interactive terminal.", ExitCode.usage, undefined, "Pass --api-key and --api-secret, or set environment variables.");
    const apiKey = opts.apiKey ?? await text({ message: "API key:" }); const secret = opts.apiSecret ?? await password({ message: "API secret:" });
    if (isCancel(apiKey) || isCancel(secret) || !apiKey || !secret) throw new CliError("Login cancelled.", ExitCode.usage);
    const profile = globals.profile ?? process.env.SPACESHIP_PROFILE ?? "default"; const logger = new Logger(Boolean(globals.verbose), Boolean(globals.quiet));
    await savePublicConfig(profile, { apiKey: String(apiKey), baseUrl: opts.baseUrl }); await setSecret(profile, String(secret), logger); if (!globals.quiet) process.stderr.write(`Credentials saved for profile '${profile}'.\n`);
  });
  auth.command("logout").description("Remove credentials").action(async (_opts, command) => { const config = await resolveConfig(command.optsWithGlobals()); await deleteSecret(config.profile); if (!command.optsWithGlobals().quiet) process.stderr.write(`Logged out profile '${config.profile}'.\n`); });
  auth.command("status").description("Check sign-in status").action(async (_opts, command) => { const config = await resolveConfig(command.optsWithGlobals()); const secret = await getSecret(config.profile); process.stdout.write(`${config.apiKey && secret ? "Authenticated" : "Not authenticated"} (${config.profile})\n`); });
}
