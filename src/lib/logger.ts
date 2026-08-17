import { redact } from "./redact";

export class Logger {
  constructor(public readonly verbose = false, public readonly quiet = false) {}
  debug(message: string, data?: unknown): void {
    if (this.verbose) process.stderr.write(`${message}${data === undefined ? "" : ` ${JSON.stringify(redact(data))}`}\n`);
  }
  warn(message: string): void { if (!this.quiet) process.stderr.write(`Warning: ${message}\n`); }
}
