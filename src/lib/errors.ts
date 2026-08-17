export const ExitCode = { success: 0, runtime: 1, usage: 2, auth: 3, notFound: 4, network: 5 } as const;

export class CliError extends Error {
  constructor(message: string, public readonly exitCode: number = ExitCode.runtime, public readonly detail?: string, public readonly suggestion?: string) {
    super(message);
    this.name = "CliError";
  }
}

export class ApiError extends CliError {
  constructor(message: string, public readonly status: number, public readonly code?: string, detail?: string) {
    super(message, status === 401 || status === 403 ? ExitCode.auth : status === 404 ? ExitCode.notFound : ExitCode.runtime, detail,
      status === 401 || status === 403 ? "Run `spaceship auth login` or check the API key scopes." : "Check the request and try again.");
  }
}

export function formatError(error: unknown, verbose = false): string {
  const e = error instanceof CliError ? error : new CliError(error instanceof Error ? error.message : String(error));
  let out = `Error: ${e.message}`;
  if (e.detail) out += `\n\n  ${e.detail}`;
  if (e.suggestion) out += `\n\n  Try: ${e.suggestion}`;
  if (verbose && error instanceof Error && error.stack) out += `\n\n${error.stack}`;
  return out;
}
