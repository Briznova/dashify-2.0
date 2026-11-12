export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiClient {
  private readonly baseUrl: string;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async request<T>(
    path: string,
    options: RequestInit = {},
    signal?: AbortSignal,
  ): Promise<T> {
    let response = await this.fetchResponse(path, options, signal);
    if (response.status === 401 && this.canRefresh(path)) {
      if (await this.refreshSession()) {
        response = await this.fetchResponse(path, options, signal);
      }
    }

    if (!response.ok) throw await this.responseError(response);
    if (response.status === 204) return undefined as T;

    try {
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ApiError(
          "The Dashify service returned an invalid response.",
          response.status,
        );
      }
      throw error;
    }
  }

  private async fetchResponse(
    path: string,
    options: RequestInit,
    signal?: AbortSignal,
  ): Promise<Response> {

    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (
      typeof document !== "undefined" &&
      !["GET", "HEAD", "OPTIONS"].includes((options.method ?? "GET").toUpperCase())
    ) {
      const csrfCookie = document.cookie
        .split("; ")
        .find((cookie) => cookie.startsWith("dashify_csrf="))
        ?.slice("dashify_csrf=".length);
      if (csrfCookie) headers.set("X-CSRF-Token", csrfCookie);
    }

    try {
      return await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers,
        credentials: options.credentials ?? "include",
        signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }

      throw new ApiError("Unable to reach the Dashify service. Please try again.", 0);
    }
  }

  private canRefresh(path: string): boolean {
    const endpoint = path.split("?")[0];
    return !["/auth/login", "/auth/refresh", "/auth/logout"].some(
      (authEndpoint) => endpoint.endsWith(authEndpoint),
    );
  }

  private refreshSession(): Promise<boolean> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.fetchResponse("/auth/refresh", {
        method: "POST",
      })
        .then(async (response) => {
          if (response.status === 401) return false;
          if (!response.ok) throw await this.responseError(response);
          return true;
        })
        .finally(() => {
          this.refreshPromise = null;
        });
    }
    return this.refreshPromise;
  }

  private async responseError(response: Response): Promise<ApiError> {
    let message = `Request failed (${response.status}). Please try again.`;
    try {
      const body: unknown = await response.json();
      if (
        typeof body === "object" &&
        body !== null &&
        "message" in body &&
        typeof body.message === "string"
      ) {
        message = body.message;
      }
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        throw error;
      }
    }
    return new ApiError(message, response.status);
  }
}
