import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { z } from "zod";
import { CliError, ExitCode } from "./errors";

const profileSchema = z.object({ baseUrl: z.string().url().optional(), apiKey: z.string().optional() }).strict();
const fileSchema = z.object({ defaultProfile: z.string().optional(), profiles: z.record(z.string(), profileSchema).default({}) }).default({ profiles: {} });
export type GlobalOptions = { profile?: string; baseUrl?: string; timeout?: string; json?: boolean; quiet?: boolean; verbose?: boolean; color?: boolean };
export type Config = { profile: string; baseUrl: string; timeout: number; apiKey?: string; apiSecret?: string };

export function configPath(env: NodeJS.ProcessEnv = process.env): string {
  return join(env.XDG_CONFIG_HOME || join(homedir(), ".config"), "spaceship", "config.json");
}

export async function readConfigFile(path = configPath()): Promise<z.infer<typeof fileSchema>> {
  try { return fileSchema.parse(JSON.parse(await readFile(path, "utf8"))); }
  catch (e: unknown) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return { profiles: {} }; throw e; }
}

export async function resolveConfig(flags: GlobalOptions, env: NodeJS.ProcessEnv = process.env, path = configPath()): Promise<Config> {
  const file = await readConfigFile(path);
  const profile = flags.profile ?? env.SPACESHIP_PROFILE ?? file.defaultProfile ?? "default";
  const selected = file.profiles[profile] ?? {};
  const timeout = Number(flags.timeout ?? env.SPACESHIP_TIMEOUT ?? 30_000);
  if (!Number.isInteger(timeout) || timeout <= 0) throw new CliError(
    "Timeout must be a positive integer in milliseconds.",
    ExitCode.usage,
    `Received '${flags.timeout ?? env.SPACESHIP_TIMEOUT}'.`,
    "Pass a value such as `--timeout 30000`.",
  );
  return { profile, baseUrl: flags.baseUrl ?? env.SPACESHIP_BASE_URL ?? selected.baseUrl ?? "https://spaceship.dev/api", timeout,
    apiKey: env.SPACESHIP_API_KEY ?? selected.apiKey, apiSecret: env.SPACESHIP_API_SECRET };
}

export async function savePublicConfig(profile: string, values: { apiKey?: string; baseUrl?: string }, path = configPath()): Promise<void> {
  const file = await readConfigFile(path);
  file.profiles[profile] = { ...file.profiles[profile], ...values };
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(file, null, 2)}\n`, { mode: 0o600 });
}
