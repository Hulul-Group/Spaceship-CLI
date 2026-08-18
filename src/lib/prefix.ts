import { lstat, readlink, realpath, symlink, unlink } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { CliError, ExitCode } from "./errors";

const validPrefix = /^[a-z][a-z0-9-]{1,31}$/;

export function installedLauncher(): string {
  if (process.env.SPACESHIP_LAUNCHER) return resolve(process.env.SPACESHIP_LAUNCHER);
  if (Bun.main.startsWith("/$bunfs/")) return process.execPath;
  const invoked = process.argv[1];
  if (invoked && !/\.[cm]?[jt]s$/.test(invoked)) return resolve(invoked);
  throw new CliError("Prefix commands require an installed CLI.", ExitCode.usage, undefined, "Install the package globally, then run `space prefix set <name>`. ");
}

export function validatePrefix(name: string): string {
  const normalized = name.toLowerCase();
  if (!validPrefix.test(normalized)) throw new CliError("Prefix must be 2-32 lowercase letters, numbers, or hyphens.", ExitCode.usage);
  return normalized;
}

async function linkTarget(path: string): Promise<string | undefined> {
  try { if (!(await lstat(path)).isSymbolicLink()) return undefined; return resolve(dirname(path), await readlink(path)); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw error; }
}

export async function addPrefix(name: string, launcher = installedLauncher()): Promise<string> {
  const prefix = validatePrefix(name); const path = join(dirname(launcher), prefix); const existing = await linkTarget(path);
  if (existing !== undefined && await realpath(existing) === await realpath(launcher)) return path;
  if (existing !== undefined || await Bun.file(path).exists()) throw new CliError(`Cannot use '${prefix}': ${path} already exists.`, ExitCode.usage, "The existing command was not changed.");
  await symlink(launcher, path); return path;
}

export async function removePrefix(name: string, launcher = installedLauncher()): Promise<string> {
  const prefix = validatePrefix(name); if (["space", "spaceship"].includes(prefix)) throw new CliError(`'${prefix}' is installed by the package and cannot be removed here.`, ExitCode.usage);
  const path = join(dirname(launcher), prefix); const existing = await linkTarget(path);
  if (existing === undefined || await realpath(existing) !== await realpath(launcher)) throw new CliError(`Cannot remove '${prefix}': it is not an alias for this CLI.`, ExitCode.usage);
  await unlink(path); return path;
}
