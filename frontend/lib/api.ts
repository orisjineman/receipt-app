// 백엔드 (Express) API 호출 클라이언트.
// next.config.js 의 rewrites 를 거쳐 같은 origin으로 호출하므로 BASE_URL은 비어 있다.
// 브라우저가 Basic Auth 자격을 자동 전달한다.

const BASE_URL = "/backend";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    // Response body stream 은 한 번만 읽을 수 있으므로 text 로 받은 뒤
    // JSON 파싱을 시도한다. (이전엔 .json() 실패 후 .text() 호출 시
    // "body stream already read" 가 발생하여 진짜 에러가 가려졌음.)
    const raw = await res.text();
    let body: unknown = raw;
    try {
      body = JSON.parse(raw);
    } catch {
      // not JSON — keep raw text
    }
    const inner =
      body && typeof body === "object" && "error" in body
        ? String((body as { error?: unknown }).error ?? "")
        : "";
    const message = inner
      ? `API ${res.status}: ${inner}`
      : `API ${res.status}`;
    throw new ApiError(res.status, message, body);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
