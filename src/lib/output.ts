import Table from "cli-table3";

export type OutputOptions = { json?: boolean; quiet?: boolean };
const scalar = (v: unknown) => v === null ? "null" : typeof v === "object" ? JSON.stringify(v) : String(v);

function renderRows(data: Record<string, unknown>[], tty: boolean, width: number): string {
  const allColumns = [...new Set(data.flatMap((row) => Object.keys(row)))];
  const columnLimit = tty ? Math.max(2, Math.min(8, Math.floor(width / 16))) : 8;
  const columns = allColumns.slice(0, columnLimit);
  if (!tty) return `${columns.join("\t")}\n${data.map((row) => columns.map((column) => scalar(row[column])).join("\t")).join("\n")}\n`;
  const cellWidth = Math.max(10, Math.floor((width - (columns.length + 1) * 3) / columns.length));
  const table = new Table({ head: columns, colWidths: columns.map(() => cellWidth), wordWrap: true });
  for (const row of data) table.push(columns.map((column) => scalar(row[column])));
  return `${table.toString()}\n`;
}

export function render(data: unknown, options: OutputOptions = {}): string {
  if (options.json) return `${JSON.stringify(data, null, 2)}\n`;
  if (data === undefined || options.quiet) return "";
  const tty = process.stdout.isTTY === true;
  const width = process.stdout.columns ?? 120;
  if (data && typeof data === "object" && !Array.isArray(data) && Array.isArray((data as Record<string, unknown>).items)) {
    return render((data as Record<string, unknown>).items, options);
  }
  if (Array.isArray(data)) {
    if (!data.length) return "No results found.\n";
    if (data.every((x) => x && typeof x === "object" && !Array.isArray(x))) {
      return renderRows(data as Record<string, unknown>[], tty, width);
    }
    return `${data.map(scalar).join("\n")}\n`;
  }
  if (data && typeof data === "object") {
    if (!tty) return `${Object.entries(data).map(([key, value]) => `${key}\t${scalar(value)}`).join("\n")}\n`;
    const table = new Table({ colWidths: [Math.min(30, Math.floor(width / 3)), Math.max(10, Math.floor(width * 2 / 3) - 3)], wordWrap: true });
    for (const [key, value] of Object.entries(data)) table.push({ [key]: scalar(value) }); return `${table.toString()}\n`;
  }
  return `${scalar(data)}\n`;
}
