import { readFile } from "node:fs/promises";
import { confirm } from "@clack/prompts";
import type { Command } from "commander";
import { ApiClient } from "./client";
import { resolveConfig } from "./config";
import { getSecret } from "./credentials";
import { CliError, ExitCode } from "./errors";
import { Logger } from "./logger";
import { render } from "./output";
import { requestSchema, responseSchema, spec, type OperationDefinition } from "./spec";
import { schemaToZod } from "../types/api";

function value(raw: unknown, type?: string): unknown {
  if (raw === undefined) return undefined; if (Array.isArray(raw)) return raw.map((x) => value(x, type));
  if (type === "integer" || type === "number") { const n = Number(raw); if (!Number.isFinite(n)) throw new CliError(`Expected a number, received '${raw}'.`, ExitCode.usage); return n; }
  if (type === "boolean") { if (raw === "true" || raw === true) return true; if (raw === "false" || raw === false) return false; throw new CliError(`Expected true or false, received '${raw}'.`, ExitCode.usage); }
  return raw;
}

async function parseBody(raw?: string): Promise<unknown> {
  if (!raw) return undefined; const text = raw.startsWith("@") ? await readFile(raw.slice(1), "utf8") : raw;
  try { return JSON.parse(text); } catch { throw new CliError("Request body is not valid JSON.", ExitCode.usage, "Pass JSON to `--data` or use `--data @file.json`."); }
}

export async function executeOperation(definition: OperationDefinition, command: Command): Promise<void> {
  const flags = command.optsWithGlobals() as Record<string, unknown>; const globals = command.optsWithGlobals();
  const config = await resolveConfig(globals);
  let path = definition.path; const query: Record<string, unknown> = {};
  for (const parameter of definition.parameters) { const key = parameter.name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()); const raw = flags[key];
    if (parameter.required && raw === undefined) throw new CliError(`Missing required option --${parameter.name}.`, ExitCode.usage);
    if (parameter.in === "path") path = path.replace(`{${parameter.name}}`, encodeURIComponent(String(raw)));
    else if (parameter.in === "query" && raw !== undefined) query[parameter.name] = value(raw, parameter.schema?.type);
  }
  let body = await parseBody(flags.data as string | undefined); const mutating = definition.method !== "GET";
  if (definition.operation.operationId === "saveRecords" && Array.isArray(body)) body = { items: body };
  if (definition.operation.requestBody?.required && body === undefined) throw new CliError("A request body is required.", ExitCode.usage, undefined, "Pass JSON with `--data` or `--data @file.json`.");
  if (body !== undefined) { const parsed = schemaToZod(requestSchema(definition.operation), spec.components.schemas).safeParse(body); if (!parsed.success) throw new CliError("The request body does not match the API schema.", ExitCode.usage, parsed.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ")); body = parsed.data; }
  const preview = { method: definition.method, path, query, body };
  if (mutating && flags.dryRun) { process.stdout.write(render(preview, { json: Boolean(globals.json) })); return; }
  if (mutating && definition.method === "DELETE" && !flags.yes) {
    if (!process.stdin.isTTY) throw new CliError("Confirmation requires an interactive terminal.", ExitCode.usage, "No request was sent.", "Pass `--yes` to confirm this operation.");
    const answer = await confirm({ message: `Send ${definition.method} ${path}?` }); if (answer !== true) return;
  }
  config.apiSecret = await getSecret(config.profile);
  if (!config.apiKey || !config.apiSecret) throw new CliError("API credentials are missing.", ExitCode.auth, "Both an API key and secret are required.", "Run `spaceship auth login` or set SPACESHIP_API_KEY and SPACESHIP_API_SECRET.");
  const logger = new Logger(Boolean(globals.verbose), Boolean(globals.quiet));
  const client = new ApiClient({ ...config, apiKey: config.apiKey, apiSecret: config.apiSecret, logger });
  const schema = schemaToZod(responseSchema(definition.operation), spec.components.schemas);
  if (flags.all) {
    const collected: unknown[] = []; for await (const item of client.paginate({ method: definition.method, path, query, schema }, { items: (data) => (data as { items?: unknown[] }).items ?? [], total: (data) => (data as { total?: number }).total ?? 0, take: Number(query.take ?? 100) })) collected.push(item);
    process.stdout.write(render(collected, { json: Boolean(globals.json), quiet: Boolean(globals.quiet) })); return;
  }
  const result = await client.request({ method: definition.method, path, query, body, schema, idempotent: definition.method === "GET" || definition.method === "PUT" || definition.method === "DELETE" });
  const output = result.operationId && (result.data === undefined || result.data === null) ? { operationId: result.operationId } : result.data;
  process.stdout.write(render(output, { json: Boolean(globals.json), quiet: Boolean(globals.quiet) }));
}
