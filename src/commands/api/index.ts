import { Command, Option } from "commander";
import { executeOperation } from "../../lib/operations";
import { operations } from "../../lib/spec";

const camel = (s: string) => s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
export function registerApiCommands(program: Command): void {
  const groups = new Map<string, Command>();
  for (const definition of operations()) {
    let group = groups.get(definition.group); if (!group) { group = program.command(definition.group).description(`${definition.operation.tags?.[0] ?? "API"} operations`); groups.set(definition.group, group); }
    const pathParams = definition.parameters.filter((p) => p.in === "path");
    const usage = `${definition.command}${pathParams.map((p) => ` <${p.name}>`).join("")}`;
    const command = group.command(usage).description(definition.operation.summary ?? definition.operation.operationId);
    for (const parameter of definition.parameters.filter((p) => p.in !== "path")) {
      const array = parameter.schema?.type === "array"; const option = new Option(`--${parameter.name} <${array ? "values..." : "value"}>`, parameter.description ?? parameter.name);
      if (parameter.required) option.makeOptionMandatory(); command.addOption(option);
    }
    if (definition.operation.requestBody) command.option("--data <json|@file>", "JSON request body or @path to a JSON file");
    if (definition.method === "GET" && definition.parameters.some((p) => p.in === "query" && p.name === "take") && definition.parameters.some((p) => p.in === "query" && p.name === "skip")) command.option("--all", "retrieve all pages");
    if (definition.method !== "GET") command.option("--dry-run", "print the request without sending it");
    if (definition.method === "DELETE") command.option("-y, --yes", "skip interactive confirmation");
    command.addHelpText("after", `\nExamples:\n  spaceship ${definition.group} ${usage}${definition.operation.requestBody ? " --data '{}'" : ""}\n  spaceship --json ${definition.group} ${usage}${definition.operation.requestBody ? " --data @request.json" : ""}\n`);
    command.action(async (...args: unknown[]) => { const cmd = args.at(-1) as Command; const values = args.slice(0, pathParams.length); for (let i = 0; i < pathParams.length; i++) (cmd as unknown as { _optionValues: Record<string, unknown> })._optionValues[camel(pathParams[i]!.name)] = values[i]; await executeOperation(definition, cmd); });
  }
}
