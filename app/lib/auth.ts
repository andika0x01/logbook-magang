import { Google } from "arctic";
import * as jose from "jose";

export interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  JWT_SECRET: string;
  ALLOWED_EMAILS: string;
  DB: D1Database;
}

export interface User {
  id: string;
  google_id: string;
  email: string;
  name: string;
  avatar: string;
  created_at: string;
}

export function getGoogleOAuth(env: Env) {
  return new Google(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);
}

export async function createSessionToken(userId: string, accessToken: string, secret: string) {
  const jwtSecret = new TextEncoder().encode(secret);
  return await new jose.SignJWT({ sub: userId, accessToken }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30d").sign(jwtSecret);
}

export async function verifySessionToken(token: string, secret: string) {
  try {
    const jwtSecret = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, jwtSecret);
    return { userId: payload.sub as string, accessToken: payload.accessToken as string };
  } catch {
    return null;
  }
}

export async function getCurrentUser(request: Request, env: Env): Promise<{ user: User; accessToken: string } | null> {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  const token = cookieHeader
    .split(";")
    .find((c) => c.trim().startsWith("session="))
    ?.split("=")[1];

  if (!token) return null;

  const session = await verifySessionToken(token, env.JWT_SECRET);
  if (!session || !session.userId) return null;

  const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(session.userId).first<User>();
  if (!user) return null;

  return { user, accessToken: session.accessToken };
}
