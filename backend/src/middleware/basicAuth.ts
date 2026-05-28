import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

const REALM = "Receipt App";

/**
 * 단일 사용자용 HTTP Basic Auth 검증.
 * BASIC_AUTH_USER / BASIC_AUTH_PASSWORD env 와 일치하지 않으면 401 + WWW-Authenticate.
 */
export function basicAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Basic ")) {
    res
      .status(401)
      .set("WWW-Authenticate", `Basic realm="${REALM}", charset="UTF-8"`)
      .json({ error: "UNAUTHORIZED" });
    return;
  }

  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const sep = decoded.indexOf(":");
  const user = sep >= 0 ? decoded.slice(0, sep) : "";
  const pass = sep >= 0 ? decoded.slice(sep + 1) : "";

  if (
    !timingSafeEqual(user, env.BASIC_AUTH_USER) ||
    !timingSafeEqual(pass, env.BASIC_AUTH_PASSWORD)
  ) {
    res
      .status(401)
      .set("WWW-Authenticate", `Basic realm="${REALM}", charset="UTF-8"`)
      .json({ error: "UNAUTHORIZED" });
    return;
  }

  next();
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
