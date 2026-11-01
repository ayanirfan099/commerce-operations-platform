import { cookies } from "next/headers";
import { prisma } from "./prisma";

export const SESSION_COOKIE = "commerceops_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: "CUSTOMER" | "ADMIN";
};

/**
 * Read the current session from the HTTP-only cookie.
 * Returns null when no valid session exists.
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  // Token format: "userId|expiryMs|signature" — signature validated below.
  const parts = token.split("|");
  if (parts.length !== 3) return null;

  const [userId, expiryMs, signature] = parts;
  const now = Date.now();
  if (!userId || !expiryMs || !signature) return null;
  if (now > Number(expiryMs)) return null;

  const expected = await signSession(userId, expiryMs);
  if (signature !== expected) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) return null;

  return { id: user.id, email: user.email, name: user.name, role: user.role as SessionUser["role"] };
}

/**
 * Create a signed session token and set the HTTP-only cookie.
 */
export async function createSession(userId: string): Promise<void> {
  const expiryMs = String(Date.now() + SESSION_TTL_MS);
  const signature = await signSession(userId, expiryMs);
  const token = `${userId}|${expiryMs}|${signature}`;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

/**
 * Clear the session cookie.
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * HMAC-based signature so clients cannot forge session tokens.
 */
async function signSession(userId: string, expiryMs: string): Promise<string> {
  const secret = process.env.SESSION_SECRET || "dev-secret-do-not-use-in-production";
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const data = encoder.encode(`${userId}|${expiryMs}`);
  const sig = await crypto.subtle.sign("HMAC", key, data);
  const hash = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hash;
}

/**
 * Authorize: require the current user to have the ADMIN role.
 * Throws a 403 when the session is missing or not an admin.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    const error = new Error("Forbidden") as Error & { status?: number };
    error.status = 403;
    throw error;
  }
  return session;
}

/**
 * Authorize: require an authenticated session (any role).
 */
export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    const error = new Error("Unauthorized") as Error & { status?: number };
    error.status = 401;
    throw error;
  }
  return session;
}
