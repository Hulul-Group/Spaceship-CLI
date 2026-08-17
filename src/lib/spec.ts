import document from "../../openapi.json";
import type { OpenApiSchema } from "../types/api";

export type Parameter = { name: string; in: "path" | "query" | "header"; required?: boolean; description?: string; schema?: OpenApiSchema & { default?: unknown }; $ref?: string };
export type Operation = { operationId: string; summary?: string; description?: string; tags?: string[]; parameters?: Parameter[]; requestBody?: { required?: boolean; content?: Record<string, { schema?: OpenApiSchema }> }; responses: Record<string, { content?: Record<string, { schema?: OpenApiSchema }> }> };
export type OperationDefinition = { method: string; path: string; operation: Operation; parameters: Parameter[]; group: string; command: string };
export const spec = document as unknown as { paths: Record<string, Record<string, Operation | Parameter[]>>; components: { schemas: Record<string, OpenApiSchema>; parameters?: Record<string, Parameter> } };
export const slug = (value: string) => value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();

export function operations(): OperationDefinition[] {
  const result: OperationDefinition[] = [];
  for (const [path, item] of Object.entries(spec.paths)) for (const method of ["get", "post", "put", "patch", "delete"]) {
    const operation = item[method] as Operation | undefined; if (!operation?.operationId) continue;
    const parameters = [...((item.parameters as Parameter[] | undefined) ?? []), ...(operation.parameters ?? [])].map((parameter) => parameter.$ref ? spec.components.parameters?.[parameter.$ref.split("/").at(-1)!] ?? parameter : parameter);
    result.push({ method: method.toUpperCase(), path, operation, parameters,
      group: slug(operation.tags?.[0] ?? "api"), command: slug(operation.operationId) });
  }
  return result;
}

export function responseSchema(operation: Operation): OpenApiSchema | undefined {
  const success = Object.entries(operation.responses).find(([code]) => /^2\d\d$/.test(code))?.[1];
  return success?.content?.["application/json"]?.schema;
}

export function requestSchema(operation: Operation): OpenApiSchema | undefined { return operation.requestBody?.content?.["application/json"]?.schema; }
