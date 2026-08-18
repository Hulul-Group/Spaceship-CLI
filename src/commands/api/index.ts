import { Command, Option } from "commander";
import { executeOperation } from "../../lib/operations";
import { operations } from "../../lib/spec";

const camel = (s: string) => s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

const names: Record<string, [group: string, command: string]> = {
  getAsyncOperationDetails: ["async", "status"],
  saveDetails: ["contact", "save"], readDetails: ["contact", "get"],
  saveContactAttributes: ["contact", "save-attrs"], readAttributeDetails: ["contact", "attrs"],
  getResourceRecordsList: ["dns", "list"], saveRecords: ["dns", "save"], deleteRecords: ["dns", "delete"],
  getDomainList: ["domain", "list"], checkDomainsAvailability: ["domain", "check-many"],
  getDomainInfo: ["domain", "get"], domainCreate: ["domain", "create"], domainDelete: ["domain", "delete"],
  updateAutorenewal: ["domain", "auto-renew"], checkSingleDomainAvailability: ["domain", "check"],
  setDomainContacts: ["domain", "set-contacts"], setDomainNameservers: ["domain", "set-nameservers"],
  updateDomainEmailProtectionPreference: ["domain", "email-protection"], updateDomainPrivacyPreference: ["domain", "privacy"],
  domainRenew: ["domain", "renew"], domainRestore: ["domain", "restore"],
  getDomainPersonalNameservers: ["nameserver", "list"], getDomainPersonalNameserverHostInfo: ["nameserver", "get"],
  updateDomainPersonalNameserverHostInfo: ["nameserver", "update"], deleteDomainPersonalNameserverHostInfo: ["nameserver", "delete"],
  getTransferInfo: ["transfer", "get"], transferRequest: ["transfer", "request"],
  getAuthCode: ["transfer", "auth-code"], updateTransferLock: ["transfer", "lock"],
  getHyperliftApplicationList: ["hyperlift", "list"], getHyperliftApplication: ["hyperlift", "get"],
  buildHyperliftApplication: ["hyperlift", "build"], getHyperliftApplicationBuildLogs: ["hyperlift", "build-logs"],
  getHyperliftApplicationEnvironment: ["hyperlift", "env"], updateHyperliftApplicationEnvironment: ["hyperlift", "set-env"],
  getHyperliftApplicationLogs: ["hyperlift", "logs"], getHyperliftApplicationMetrics: ["hyperlift", "metrics"],
  restartHyperliftApplication: ["hyperlift", "restart"], scaleHyperliftApplication: ["hyperlift", "scale"],
  createCheckoutLink: ["seller", "checkout"], getSellerHubDomainList: ["seller", "list-domains"],
  createSellerHubDomain: ["seller", "create-domain"], getSoldDomains: ["seller", "sold"],
  getSellerHubDomain: ["seller", "get-domain"], updateSellerHubDomain: ["seller", "update-domain"],
  deleteSellerHubDomain: ["seller", "delete-domain"], getSafePayTransactionList: ["seller", "list-payments"],
  createSafePayTransaction: ["seller", "create-payment"], getSafePayTransaction: ["seller", "get-payment"],
  getVerificationRecords: ["seller", "verification"],
};
const groupAliases: Record<string, string[]> = {
  async: ["async-operations"], contact: ["contacts", "contacts-attributes"], dns: ["dns-records"],
  domain: ["domain-management", "domain-availability", "domain-settings"], nameserver: ["personal-nameservers"],
  transfer: ["domain-transfer"], seller: ["seller-hub"],
};

export function registerApiCommands(program: Command): void {
  const groups = new Map<string, Command>();
  for (const definition of operations()) {
    const [groupName, commandName] = names[definition.operation.operationId] ?? [definition.group, definition.command];
    let group = groups.get(groupName); if (!group) { group = program.command(groupName, { hidden: groupName === "dns" }).description(`${groupName[0]!.toUpperCase()}${groupName.slice(1)} commands`).aliases(groupAliases[groupName] ?? []); groups.set(groupName, group); }
    const pathParams = definition.parameters.filter((p) => p.in === "path");
    const usage = `${commandName}${pathParams.map((p) => ` <${p.name}>`).join("")}`;
    const command = group.command(usage, { hidden: groupName === "domain" }).description(definition.operation.summary ?? definition.operation.operationId);
    if (commandName !== definition.command) command.alias(definition.command);
    for (const parameter of definition.parameters.filter((p) => p.in !== "path")) {
      const array = parameter.schema?.type === "array"; const option = new Option(`--${kebab(parameter.name)} <${array ? "values..." : "value"}>`, parameter.description ?? parameter.name);
      if (parameter.required) option.makeOptionMandatory(); command.addOption(option);
    }
    if (definition.operation.requestBody) command.option("-d, --data <json|@file>", "JSON body or @file");
    if (definition.method === "GET" && definition.parameters.some((p) => p.in === "query" && p.name === "take") && definition.parameters.some((p) => p.in === "query" && p.name === "skip")) command.option("--all", "retrieve all pages");
    if (definition.method !== "GET") command.option("-n, --dry-run", "preview only");
    if (definition.method === "DELETE") command.option("-y, --yes", "skip confirmation");
    command.addHelpText("after", `\nExample: space ${groupName} ${usage}${definition.operation.requestBody ? " -d '{}'" : ""}\n`);
    command.action(async (...args: unknown[]) => { const cmd = args.at(-1) as Command; const values = args.slice(0, pathParams.length); for (let i = 0; i < pathParams.length; i++) (cmd as unknown as { _optionValues: Record<string, unknown> })._optionValues[camel(pathParams[i]!.name)] = values[i]; await executeOperation(definition, cmd); });
  }
  const domain = groups.get("domain");
  domain?.addHelpCommand(false);
  domain?.configureHelp({ commandUsage: () => "space domain <domain> <command>" });
  domain?.addHelpText("after", `\nCommands:\n  get                              Show domain details\n  create                           Register the domain\n  delete                           Delete the domain\n  renew                            Renew the domain\n  restore                          Restore the domain\n  check                            Check availability\n  records list                     List DNS records\n  records save -d @records.json    Save a record batch\n  records set <name> <value>       Add or update one record\n  records remove <name> <value>    Remove one record\n  nameservers set <host...>        Use custom nameservers\n  nameservers use-basic            Use Spaceship DNS\n\nRecord set/remove options:\n  --type (required), --ttl, --priority, --flag, --tag, --service, --protocol,\n  --weight, --port, --params, --scheme, --usage, --selector, and --matching\n\nExamples:\n  space domain example.com records set www 192.0.2.10 --type A --ttl 300\n  space domain example.com records set @ mail.example.com --type MX --priority 10\n  space domain example.com nameservers set ns1.example.net ns2.example.net\n`);
}
