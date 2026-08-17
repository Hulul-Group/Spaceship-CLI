import { chmod, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { Logger } from "./logger";

const SERVICE = "spaceship-cli";
const fallbackPath = () => join(process.env.XDG_DATA_HOME || join(homedir(), ".local", "share"), "spaceship", "credentials.json");

export async function getSecret(profile: string): Promise<string | undefined> {
  if (process.env.SPACESHIP_API_SECRET) return process.env.SPACESHIP_API_SECRET;
  if (platform() === "darwin") {
    const r = spawnSync("security", ["find-generic-password", "-s", SERVICE, "-a", profile, "-w"], { encoding: "utf8" });
    if (r.status === 0) return r.stdout.trim();
  } else if (platform() === "linux") {
    const r = spawnSync("secret-tool", ["lookup", "service", SERVICE, "profile", profile], { encoding: "utf8" });
    if (r.status === 0) return r.stdout.trim();
  }
  try { const data = JSON.parse(await readFile(fallbackPath(), "utf8")); return typeof data[profile] === "string" ? data[profile] : undefined; } catch { return undefined; }
}

export async function setSecret(profile: string, secret: string, logger: Logger): Promise<void> {
  if (platform() === "darwin") {
    const r = spawnSync("security", ["add-generic-password", "-U", "-s", SERVICE, "-a", profile, "-w", secret]);
    if (r.status === 0) return;
  } else if (platform() === "linux") {
    const r = spawnSync("secret-tool", ["store", "--label", "Spaceship CLI", "service", SERVICE, "profile", profile], { input: secret });
    if (r.status === 0) return;
  }
  logger.warn("No system credential store was available; using a permissions-restricted credentials file.");
  const path = fallbackPath(); let data: Record<string, string> = {};
  try { data = JSON.parse(await readFile(path, "utf8")); } catch {}
  data[profile] = secret; await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data)}\n`, { mode: 0o600 }); await chmod(path, 0o600);
}

export async function deleteSecret(profile: string): Promise<void> {
  if (platform() === "darwin") spawnSync("security", ["delete-generic-password", "-s", SERVICE, "-a", profile]);
  else if (platform() === "linux") spawnSync("secret-tool", ["clear", "service", SERVICE, "profile", profile]);
  const path = fallbackPath(); try { const data = JSON.parse(await readFile(path, "utf8")); delete data[profile]; await writeFile(path, `${JSON.stringify(data)}\n`, { mode: 0o600 }); } catch {}
}
