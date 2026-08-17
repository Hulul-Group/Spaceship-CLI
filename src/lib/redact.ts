const SECRET_KEYS = /(?:authorization|api[-_]?key|api[-_]?secret|token|password)/i;
const TOKEN_VALUE = /\b(?:Bearer\s+)?(?=[A-Za-z0-9_-]{20,}\b)(?=[A-Za-z0-9_-]*[A-Z])(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]+\b/g;

export function redact(value: unknown): unknown {
  if (typeof value === "string") return value.replace(TOKEN_VALUE, "[REDACTED]");
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, SECRET_KEYS.test(k) ? "[REDACTED]" : redact(v)]));
  return value;
}

export function redactText(value: string): string { return String(redact(value)); }
