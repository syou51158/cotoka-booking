import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";

const ADMIN_COOKIE = "cotoka-admin-token";

function getExpectedToken() {
  const passcode = process.env.ADMIN_PASSCODE ?? "";
  if (!passcode) {
    throw new Error("ADMIN_PASSCODE is not set");
  }
  return createHash("sha256").update(passcode).digest("hex");
}

export function isAdminAuthenticated() {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  try {
    return token === getExpectedToken();
  } catch {
    return false;
  }
}

export function requireAdmin() {
  if (!isAdminAuthenticated()) {
    redirect("/admin/login");
  }
}

export function createAdminSession() {
  const expected = getExpectedToken();
  const secure = process.env.NODE_ENV === "production";
  cookies().set(ADMIN_COOKIE, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearAdminSession() {
  cookies().set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
