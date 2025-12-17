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

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  try {
    return token === getExpectedToken();
  } catch {
    return false;
  }
}

export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
}

export async function createAdminSession() {
  const expected = getExpectedToken();
  const secure = process.env.NODE_ENV === "production";
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function verifyAdminAuth(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return { success: false, error: "No authentication cookie" };
  }

  const cookies = cookieHeader.split(";").reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      acc[key] = value;
      return acc;
    },
    {} as Record<string, string>,
  );

  const token = cookies[ADMIN_COOKIE];
  if (!token) {
    return { success: false, error: "Admin token not found" };
  }

  try {
    const expected = getExpectedToken();
    if (token !== expected) {
      return { success: false, error: "Invalid admin token" };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: "Authentication verification failed" };
  }
}

// 既存のAPIルートが `verifyAdmin(request)` を使用しているため、
// `verifyAdminAuth` をラップしたエイリアスを提供して互換性を維持します。
export async function verifyAdmin(request: Request) {
  const result = await verifyAdminAuth(request);
  if (!result.success) {
    throw new Error(result.error ?? "Admin verification failed");
  }
}
