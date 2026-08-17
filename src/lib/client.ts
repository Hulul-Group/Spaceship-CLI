import { z } from "zod";
import { ApiError, CliError, ExitCode } from "./errors";
import { Logger } from "./logger";
import { problemSchema } from "../types/api";

export type ClientOptions = { baseUrl: string; apiKey: string; apiSecret: string; timeout: number; logger?: Logger; fetch?: typeof fetch; maxRetries?: number; sleep?: (ms: number) => Promise<void> };
export type RequestOptions<T> = { method?: string; path: string; query?: Record<string, unknown>; body?: unknown; schema: z.ZodType<T>; idempotent?: boolean };
export type ApiResult<T> = { data: T; operationId?: string; headers: Headers };

export class ApiClient {
  private fetcher: typeof fetch; private logger: Logger; private sleep: (ms: number) => Promise<void>;
  constructor(private options: ClientOptions) { this.fetcher = options.fetch ?? fetch; this.logger = options.logger ?? new Logger(); this.sleep = options.sleep ?? ((ms) => Bun.sleep(ms)); }

  async request<T>(request: RequestOptions<T>): Promise<ApiResult<T>> {
    const method = request.method ?? "GET"; const url = new URL(request.path.replace(/^\//, ""), `${this.options.baseUrl.replace(/\/$/, "")}/`);
    for (const [key, raw] of Object.entries(request.query ?? {})) if (raw !== undefined) for (const value of Array.isArray(raw) ? raw : [raw]) url.searchParams.append(key, String(value));
    const max = request.idempotent === false ? 0 : (this.options.maxRetries ?? 3);
    for (let attempt = 0;; attempt++) {
      const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), this.options.timeout); const started = performance.now();
      try {
        this.logger.debug(`→ ${method} ${url}`);
        const response = await this.fetcher(url, { method, headers: { "X-API-Key": this.options.apiKey, "X-API-Secret": this.options.apiSecret,
          "User-Agent": `spaceship/1.0.0 (${process.platform}; ${process.arch})`, Accept: "application/json", ...(request.body === undefined ? {} : { "Content-Type": "application/json" }) },
          body: request.body === undefined ? undefined : JSON.stringify(request.body), signal: controller.signal });
        this.logger.debug(`← ${response.status} ${method} ${url} ${Math.round(performance.now() - started)}ms`);
        if ((response.status === 429 || response.status >= 500) && attempt < max) {
          const retry = response.headers.get("retry-after"); const delay = retry ? (/^\d+$/.test(retry) ? Number(retry) * 1000 : Math.max(0, Date.parse(retry) - Date.now())) : 250 * 2 ** attempt + Math.random() * 100;
          await this.sleep(delay); continue;
        }
        const text = await response.text(); let payload: unknown = undefined;
        if (text) { try { payload = JSON.parse(text); } catch { payload = text; } }
        if (!response.ok) { const problem = problemSchema.safeParse(payload); const detail = problem.success ? problem.data.detail ?? problem.data.title : typeof payload === "string" ? payload : undefined;
          throw new ApiError(`API request failed (${response.status} ${response.statusText}).`, response.status, response.headers.get("spaceship-error-code") ?? undefined, detail); }
        const parsed = request.schema.safeParse(payload);
        if (!parsed.success) throw new CliError("The API returned an unexpected response.", ExitCode.runtime, parsed.error.issues.map((i) => `${i.path.join(".") || "response"}: ${i.message}`).join("; "), "Update the CLI or retry with `--verbose` and report the operation ID.");
        return { data: parsed.data, operationId: response.headers.get("spaceship-async-operationid") ?? undefined, headers: response.headers };
      } catch (error) {
        if (error instanceof CliError) throw error;
        if (error instanceof DOMException && error.name === "AbortError") throw new CliError(`Request timed out after ${this.options.timeout}ms.`, ExitCode.network, "The API did not respond in time.", "Increase `--timeout` and retry.");
        throw new CliError("Could not reach the Spaceship API.", ExitCode.network, error instanceof Error ? error.message : String(error), "Check your network connection and base URL.");
      } finally { clearTimeout(timer); }
    }
  }

  async *paginate<T>(request: RequestOptions<T>, options: { items: (data: T) => unknown[]; total?: (data: T) => number; take?: number } ): AsyncGenerator<unknown> {
    const take = options.take ?? 100; let skip = Number(request.query?.skip ?? 0);
    do { const result = await this.request({ ...request, query: { ...request.query, take, skip } }); const items = options.items(result.data); for (const item of items) yield item;
      skip += items.length; if (!items.length || (options.total && skip >= options.total(result.data))) return; } while (true);
  }
}
