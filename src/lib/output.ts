import Table from "cli-table3";

export type OutputOptions = { json?: boolean; quiet?: boolean };
const scalar = (v: unknown) => v === null ? "null" : typeof v === "object" ? JSON.stringify(v) : String(v);

export function render(data: unknown, options: OutputOptions = {}): string {
  if (options.json) return `${JSON.stringify(data, null, 2)}\n`;
  if (data === undefined || options.quiet) return "";
  if (Array.isArray(data)) {
    if (!data.length) return "No results found.\n";
    if (data.every((x) => x && typeof x === "object" && !Array.isArray(x))) {
      const columns = [...new Set(data.flatMap((x) => Object.keys(x as object)))].slice(0, 8);
      const table = new Table({ head: columns, chars: process.stdout.isTTY ? undefined : { top: "", "top-mid": "", "top-left": "", "top-right": "", bottom: "", "bottom-mid": "", "bottom-left": "", "bottom-right": "", left: "", "left-mid": "", mid: "", "mid-mid": "", right: "", "right-mid": "", middle: "  " } });
      for (const row of data) table.push(columns.map((c) => scalar((row as Record<string, unknown>)[c]))); return `${table.toString()}\n`;
    }
    return `${data.map(scalar).join("\n")}\n`;
  }
  if (data && typeof data === "object") { const table = new Table(); for (const [k, v] of Object.entries(data)) table.push({ [k]: scalar(v) }); return `${table.toString()}\n`; }
  return `${scalar(data)}\n`;
}
