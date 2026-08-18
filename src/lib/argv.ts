import { CliError, ExitCode } from "./errors";

const directDomainActions = new Set(["get", "create", "delete", "renew", "restore", "auto-renew", "check", "set-contacts", "privacy", "email-protection"]);
const legacyDomainActions = new Set([...directDomainActions, "list", "check-many", "set-nameservers"]);
const numeric = new Set(["ttl", "priority", "flag", "weight", "port", "usage", "selector", "matching"]);

function takeOptions(args: string[]): { positional: string[]; options: Record<string, string>; passthrough: string[] } {
  const positional: string[] = []; const options: Record<string, string> = {}; const passthrough: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (["-n", "-y", "-j", "-q", "-v"].includes(arg)) { passthrough.push(arg); continue; }
    if (!arg.startsWith("--")) { positional.push(arg); continue; }
    const [rawName, inline] = arg.slice(2).split("=", 2); const name = rawName!;
    if (["force", "yes", "dry-run", "json", "quiet", "verbose", "no-color"].includes(name)) { options[name] = "true"; if (name !== "force") passthrough.push(arg); continue; }
    const value = inline ?? args[++i]; if (value === undefined) throw new CliError(`Option --${name} needs a value.`, ExitCode.usage);
    options[name] = value;
  }
  return { positional, options, passthrough };
}

export function recordItem(name: string, destination: string, options: Record<string, string>): Record<string, unknown> {
  const type = options.type?.toUpperCase(); if (!type) throw new CliError("A record type is required.", ExitCode.usage, undefined, "Pass --type A, --type MX, or another supported type.");
  const item: Record<string, unknown> = { type, name };
  if (options.ttl !== undefined) item.ttl = Number(options.ttl);
  const destinationFields: Record<string, string> = { A: "address", AAAA: "address", ALIAS: "aliasName", CNAME: "cname", NS: "nameserver", PTR: "pointer", TXT: "value", MX: "exchange", CAA: "value", SRV: "target", SVCB: "targetName", HTTPS: "targetName", TLSA: "associationData" };
  const field = destinationFields[type]; if (!field) throw new CliError(`Unsupported record type '${type}'.`, ExitCode.usage);
  item[field] = destination;
  const optionFields: Record<string, string> = { priority: type === "MX" ? "preference" : type === "SRV" ? "priority" : "svcPriority", params: "svcParams", "association-data": "associationData", flag: "flag", tag: "tag", service: "service", protocol: "protocol", weight: "weight", port: "port", usage: "usage", selector: "selector", matching: "matching", scheme: "scheme" };
  for (const [option, property] of Object.entries(optionFields)) if (options[option] !== undefined) item[property] = numeric.has(option) && !(option === "port" && type !== "SRV") ? Number(options[option]) : options[option];
  if ((type === "SVCB" || type === "HTTPS") && item.svcParams === undefined) item.svcParams = "";
  return item;
}

export function normalizeArgv(argv: string[]): string[] {
  const raw = argv.slice(2); let commandIndex = 0;
  while (commandIndex < raw.length && raw[commandIndex]!.startsWith("-")) {
    const option = raw[commandIndex]!; commandIndex += ["-p", "--profile", "-t", "--timeout", "-u", "--base-url"].includes(option) && !option.includes("=") ? 2 : 1;
  }
  const prefix = [...argv.slice(0, 2), ...raw.slice(0, commandIndex)]; const args = raw.slice(commandIndex);
  if (args[0] !== "domain" || !args[1] || args[1].startsWith("-")) return argv;
  if (legacyDomainActions.has(args[1])) return argv;
  const domain = args[1]; const section = args[2]; const rest = args.slice(3);
  if (!section || section === "help" || section === "-h" || section === "--help") return [...prefix, "domain", "--help"];
  if (directDomainActions.has(section)) return [...prefix, "domain", section, domain, ...rest];
  if (section === "nameservers") {
    const action = rest[0]; const values = rest.slice(1);
    if (action === "set") {
      const parsed = takeOptions(values); if (parsed.positional.length < 2) throw new CliError("Custom nameservers need at least two hosts.", ExitCode.usage);
      return [...prefix, "domain", "set-nameservers", domain, "-d", JSON.stringify({ provider: "custom", hosts: parsed.positional }), ...parsed.passthrough];
    }
    if (action === "use-basic") return [...prefix, "domain", "set-nameservers", domain, "-d", JSON.stringify({ provider: "basic" }), ...values];
    return [...prefix, "domain", "--help"];
  }
  if (section !== "records") return argv;
  const action = rest[0]; const values = rest.slice(1);
  if (action === "list") return [...prefix, "dns", "list", domain, ...values];
  if (action === "save") return [...prefix, "dns", "save", domain, ...values];
  if (action === "set" || action === "remove") {
    const parsed = takeOptions(values); const [name, destination] = parsed.positional;
    if (!name || destination === undefined) throw new CliError(`records ${action} needs <name> and <value>.`, ExitCode.usage);
    const item = recordItem(name, destination, parsed.options);
    const body = action === "set" ? { items: [item], ...(parsed.options.force ? { force: true } : {}) } : [item];
    return [...prefix, "dns", action === "set" ? "save" : "delete", domain, "-d", JSON.stringify(body), ...parsed.passthrough];
  }
  return [...prefix, "domain", "--help"];
}
