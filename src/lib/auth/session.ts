import crypto from "crypto";

export const SESSION_COOKIE = "honhong_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天

export interface SessionUser {
  id: number;
  username: string;
}

function getSecret(): string {
  const secret =
    process.env.COZE_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.COZE_SUPABASE_ANON_KEY;
  if (!secret) {
    throw new Error("会话签名密钥缺失（COZE_SUPABASE_* 未配置）");
  }
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createSessionToken(user: SessionUser): string {
  const expiry = Date.now() + SESSION_TTL_MS;
  const payload = `${user.id}.${encodeURIComponent(user.username)}.${expiry}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [idStr, encUsername, expiryStr, sig] = parts;
  const payload = `${idStr}.${encUsername}.${expiryStr}`;
  const expected = sign(payload);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  const id = Number(idStr);
  const expiry = Number(expiryStr);
  if (!Number.isInteger(id) || id <= 0) return null;
  if (!Number.isFinite(expiry) || expiry < Date.now()) return null;
  return { id, username: decodeURIComponent(encUsername) };
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: SESSION_TTL_MS / 1000,
  path: "/",
  secure: process.env.COZE_PROJECT_ENV === "PROD",
};
