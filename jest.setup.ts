import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

Object.assign(global, { TextDecoder, TextEncoder });

if (typeof globalThis.Response === "undefined") {
  class PolyfillResponse {
    private readonly _body: string;
    readonly status: number;
    readonly ok: boolean;
    readonly headers: { get(name: string): string | null };

    constructor(body?: BodyInit | null, init?: ResponseInit) {
      this._body = typeof body === "string" ? body : body == null ? "" : String(body);
      this.status = init?.status ?? 200;
      this.ok = this.status >= 200 && this.status < 300;
      const headerMap = new Map(
        Object.entries((init?.headers as Record<string, string>) ?? {}).map(([k, v]) => [k.toLowerCase(), v])
      );
      this.headers = { get: (name: string) => headerMap.get(name.toLowerCase()) ?? null };
    }

    static json(data: unknown, init?: ResponseInit) {
      return new PolyfillResponse(JSON.stringify(data), {
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers as Record<string, string> | undefined) },
      });
    }

    async json() {
      return JSON.parse(this._body || "null");
    }

    async text() {
      return this._body;
    }

    get body() {
      return null;
    }
  }

  Object.assign(globalThis, { Response: PolyfillResponse });
}
