/**
 * Authentication helpers: password hashing (bcryptjs) and stateless JWT
 * tokens (jsonwebtoken) stored in an httpOnly cookie.
 *
 * The token is signed with SESSION_SECRET. In production a missing secret is a
 * fatal misconfiguration; in development we fall back to an insecure constant
 * with a loud warning so local work is frictionless.
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { CookieOptions } from "express";
import { logger } from "./logger";

export const AUTH_COOKIE = "hirhub_token";

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const isProd = process.env["NODE_ENV"] === "production";

export type Role = "admin" | "user";

export interface TokenPayload {
  sub: string; // user id
  username: string;
  role: Role;
}

let _secret: string | null = null;

function getSecret(): string {
  if (_secret) return _secret;
  const fromEnv = process.env["SESSION_SECRET"];
  if (fromEnv && fromEnv.length > 0) {
    _secret = fromEnv;
    return _secret;
  }
  if (isProd) {
    throw new Error(
      "SESSION_SECRET must be set in production. Refusing to start without a signing secret.",
    );
  }
  logger.warn(
    "SESSION_SECRET not set — using an insecure development fallback. NEVER use this in production.",
  );
  _secret = "dev-insecure-secret-change-me";
  return _secret;
}

/**
 * Validate the auth configuration at startup so production fails fast when
 * SESSION_SECRET is missing instead of erroring on the first login attempt.
 */
export function assertAuthSecret(): void {
  getSecret();
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: TOKEN_TTL_SECONDS });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret());
    if (typeof decoded === "string") return null;
    const sub = decoded["sub"];
    const username = decoded["username"];
    const role = decoded["role"];
    if (
      typeof sub === "string" &&
      typeof username === "string" &&
      (role === "admin" || role === "user")
    ) {
      return { sub, username, role };
    }
    return null;
  } catch {
    return null;
  }
}

export function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: TOKEN_TTL_SECONDS * 1000,
  };
}
