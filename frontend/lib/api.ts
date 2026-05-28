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
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    throw new ApiError(res.status, `API ${res.status}`, body);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
