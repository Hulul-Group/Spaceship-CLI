import { z } from "zod";

export const problemSchema = z.object({ title: z.string().optional(), detail: z.string().optional(), status: z.number().optional(), errors: z.unknown().optional() }).passthrough();
export const apiResponseSchema = z.unknown();
export type ApiResponse = z.infer<typeof apiResponseSchema>;

export type OpenApiSchema = { type?: string; format?: string; enum?: unknown[]; properties?: Record<string, OpenApiSchema>; required?: string[]; items?: OpenApiSchema; oneOf?: OpenApiSchema[]; anyOf?: OpenApiSchema[]; allOf?: OpenApiSchema[]; nullable?: boolean; $ref?: string; additionalProperties?: boolean | OpenApiSchema };

export function schemaToZod(schema: OpenApiSchema | undefined, schemas: Record<string, OpenApiSchema>, seen = new Set<string>()): z.ZodType {
  if (!schema) return z.unknown();
  const nullable = (validator: z.ZodType): z.ZodType => schema.nullable ? validator.nullable() : validator;
  if (schema.$ref) {
    const name = schema.$ref.split("/").at(-1)!;
    if (seen.has(name)) return z.unknown();
    return nullable(schemaToZod(schemas[name], schemas, new Set([...seen, name])));
  }
  if (schema.enum) {
    const values = schema.enum.filter((v): v is string | number | boolean => typeof v === "string" || typeof v === "number" || typeof v === "boolean");
    if (values.length === 1) return nullable(z.literal(values[0]!));
    if (values.length > 1) return nullable(z.union(values.map((v) => z.literal(v)) as unknown as [z.ZodType, z.ZodType, ...z.ZodType[]]));
  }
  if (schema.oneOf || schema.anyOf) return nullable(z.union((schema.oneOf ?? schema.anyOf)!.map((s) => schemaToZod(s, schemas)) as [z.ZodType, z.ZodType, ...z.ZodType[]]));
  if (schema.allOf?.length) {
    const validators = schema.allOf.map((item) => schemaToZod(item, schemas, seen));
    // OpenAPI generator output commonly adds metadata-only siblings to allOf.
    // Only structural siblings add another constraint; a bare `type: object`
    // beside a scalar $ref is generator metadata, not an object intersection.
    if (schema.properties || schema.items || schema.enum || schema.additionalProperties !== undefined) {
      validators.unshift(schemaToZod({ ...schema, allOf: undefined, nullable: false }, schemas, seen));
    }
    const combined = validators.slice(1).reduce<z.ZodType>((acc, validator) => z.intersection(acc, validator), validators[0]!);
    return nullable(combined);
  }
  let result: z.ZodType;
  switch (schema.type) {
    case "string": result = z.string(); break;
    case "integer": result = z.number().int(); break;
    case "number": result = z.number(); break;
    case "boolean": result = z.boolean(); break;
    case "array": result = z.array(schemaToZod(schema.items, schemas)); break;
    case "object": {
      const required = new Set(schema.required ?? []); const shape: Record<string, z.ZodType> = {};
      for (const [key, value] of Object.entries(schema.properties ?? {})) { const item = schemaToZod(value, schemas); shape[key] = required.has(key) ? item : item.optional(); }
      result = z.object(shape).passthrough(); break;
    }
    default: result = z.unknown();
  }
  return nullable(result);
}
