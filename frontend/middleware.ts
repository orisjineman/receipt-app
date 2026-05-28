import { NextRequest, NextResponse } from "next/server";

/**
 * 단일 사용자용 HTTP Basic Auth.
 *
 * 백엔드 호출은 next.config.js 의 rewrites 를 통해 같은 origin(/backend/*) 으로 들어오므로
 * 브라우저가 한 번 인증한 자격을 자동으로 전달한다. 그래서 미들웨어 한 곳에서만 검증한다.
 */
const REALM = 'Basic realm="Receipt App", charset="UTF-8"';

export function middleware(req: NextRequest) {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) {
    return unauthorized();
  }

  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return unauthorized();
  }

  const sep = decoded.indexOf(":");
  const user = sep >= 0 ? decoded.slice(0, sep) : "";
  const pass = sep >= 0 ? decoded.slice(sep + 1) : "";

  if (
    !timingSafeEqual(user, process.env.BASIC_AUTH_USER ?? "") ||
    !timingSafeEqual(pass, process.env.BASIC_AUTH_PASSWORD ?? "")
  ) {
    return unauthorized();
  }

  return NextResponse.next();
}

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": REALM },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export const config = {
  // 정적 자원과 favicon 외 모든 경로 보호. /backend/* 프록시도 보호 대상.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
