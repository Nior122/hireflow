import { useAuth } from "@clerk/clerk-expo";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function createApiClient() {
  let getToken: (() => Promise<string | null>) | null = null;

  function setAuthProvider(provider: () => Promise<string | null>) {
    getToken = provider;
  }

  async function request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = getToken ? await getToken() : null;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...options.headers as Record<string, string>,
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new ApiError(
        response.status,
        (await response.json().catch(() => ({ error: "Request failed" }))).error ?? "Request failed",
      );
    }

    return response.json();
  }

  return {
    setAuthProvider,
    get: <T>(endpoint: string) => request<T>(endpoint),
    post: <T>(endpoint: string, body: unknown) =>
      request<T>(endpoint, { method: "POST", body: JSON.stringify(body) }),
    put: <T>(endpoint: string, body: unknown) =>
      request<T>(endpoint, { method: "PUT", body: JSON.stringify(body) }),
    delete: <T>(endpoint: string) =>
      request<T>(endpoint, { method: "DELETE" }),
  };
}

export const api = createApiClient();
