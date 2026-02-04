const BASE_URL = import.meta.env.VITE_API_URL ?? "";

export class HttpError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
};

async function parseErrorBody(res: Response): Promise<HttpError> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const body = (await res.json()) as ApiErrorBody;
      return new HttpError(
        res.status,
        body.error?.code ?? "UNKNOWN",
        body.error?.message ?? `Request failed: ${res.status}`,
        body.error?.fields,
      );
    } catch {
      // JSON parse failed, fall through
    }
  }
  return new HttpError(res.status, "UNKNOWN", `Request failed: ${res.status}`);
}

export async function httpGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { signal });
  if (!res.ok) throw await parseErrorBody(res);
  return (await res.json()) as T;
}

export async function httpPost<T>(
  path: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseErrorBody(res);
  return (await res.json()) as T;
}
