import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const TOKEN_SECRET = crypto.randomBytes(32).toString("hex");
const TOKEN_TTL = 24 * 60 * 60 * 1000; // 24 hours

let cachedPassword: string | null | undefined;

export function getPassword(): string | null {
  if (cachedPassword !== undefined) return cachedPassword;

  // Try process.env first
  if (process.env.ADMIN_PASSWORD) {
    cachedPassword = process.env.ADMIN_PASSWORD;
    return cachedPassword;
  }

  // Fall back to reading .env file manually
  try {
    const envPath = path.resolve(".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
        const [key, ...rest] = trimmed.split("=");
        if (key.trim() === "ADMIN_PASSWORD") {
          cachedPassword = rest.join("=").trim().replace(/^["']|["']$/g, "");
          return cachedPassword;
        }
      }
    }
  } catch {}

  cachedPassword = null;
  return null;
}

export function createToken(password: string): string {
  const payload = {
    iat: Date.now(),
    exp: Date.now() + TOKEN_TTL,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const hmac = crypto.createHmac("sha256", TOKEN_SECRET + password);
  hmac.update(payloadB64);
  const sig = hmac.digest("base64url");
  return `${payloadB64}.${sig}`;
}

export function verifyToken(token: string, password: string): boolean {
  try {
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return false;

    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    );
    if (Date.now() > payload.exp) return false;

    const hmac = crypto.createHmac("sha256", TOKEN_SECRET + password);
    hmac.update(payloadB64);
    const expectedSig = hmac.digest("base64url");

    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

export function parseCookies(
  cookieHeader: string,
): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader
    .split(";")
    .map((c) => c.trim().split("=", 2))
    .forEach(([k, v]) => {
      if (k) cookies[k] = decodeURIComponent(v ?? "");
    });
  return cookies;
}
