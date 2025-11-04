import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

type ReservationViewTokenPayload = {
  scope: "view";
  rid: string;
  jti: string;
  v?: number;
};

function getSecretKey() {
  const secret = env.JWT_SECRET;
  if (!secret || secret.length === 0) {
    throw new Error("JWT_SECRET is not set. Please configure environment.");
  }
  return new TextEncoder().encode(secret);
}

export function getMagicLinkViewTtlMinutes(): number {
  const raw = env.MAGIC_LINK_VIEW_TTL_MINUTES;
  const fallback = 7 * 24 * 60; // 7 days
  const n = raw ? Number(raw) : fallback;
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

export async function issueReservationViewToken(
  reservationId: string,
  locale: string,
): Promise<{ token: string; jti: string; expiresAt: Date; url: string }> {
  const jti =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const payload: ReservationViewTokenPayload = {
    scope: "view",
    rid: reservationId,
    jti,
    v: 1,
  };

  const ttlMin = getMagicLinkViewTtlMinutes();
  const key = getSecretKey();
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${ttlMin}m`)
    .sign(key);

  const expiresAt = new Date(Date.now() + ttlMin * 60 * 1000);
  const url = `${env.SITE_URL}/${locale}/reservations/view?token=${encodeURIComponent(token)}`;
  return { token, jti, expiresAt, url };
}

export async function verifyReservationViewToken(token: string) {
  const key = getSecretKey();
  const { payload } = await jwtVerify(token, key, {
    algorithms: ["HS256"],
  });
  // Basic shape validation
  if (
    payload.scope !== "view" ||
    typeof payload.rid !== "string" ||
    typeof payload.jti !== "string"
  ) {
    throw new Error("Invalid token payload");
  }
  return payload as ReservationViewTokenPayload & {
    exp?: number;
    iat?: number;
  };
}
