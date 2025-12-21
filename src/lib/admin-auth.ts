import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { createSupabaseServerClient } from "./supabase-server";

const ADMIN_COOKIE = "cotoka-admin-token";

function getExpectedToken() {
  const passcode = process.env.ADMIN_PASSCODE ?? "";
  if (!passcode) {
    throw new Error("ADMIN_PASSCODE is not set");
  }
  return createHash("sha256").update(passcode).digest("hex");
}

export async function isAdminAuthenticated() {
  // 1. Check Legacy Token
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (token) {
    try {
      if (token === getExpectedToken()) return true;
    } catch {}
  }

  // 2. Check Supabase Session
  try {
      const supabase = await createSupabaseServerClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (!error && user) {
          const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', user.id)
              .single();
          
          if (profile?.role === 'owner' || profile?.role === 'manager') {
              return true;
          }
      }
  } catch (e) {
      console.error("Supabase Auth Check Failed", e);
  }

  return false;
}

export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    redirect("/login");
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
  // 1. Check Legacy Token from Request Headers
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
      const cookiesMap = cookieHeader.split(";").reduce(
        (acc, cookie) => {
          const [key, value] = cookie.trim().split("=");
          acc[key] = value;
          return acc;
        },
        {} as Record<string, string>,
      );
      const token = cookiesMap[ADMIN_COOKIE];
      if (token) {
           try {
            const expected = getExpectedToken();
            if (token === expected) return { success: true };
          } catch {}
      }
  }

  // 2. Check Supabase Session (using global cookies() since we are in App Router)
  try {
      const supabase = await createSupabaseServerClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (!error && user) {
          const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', user.id)
              .single();
          
          if (profile?.role === 'owner' || profile?.role === 'manager') {
              return { success: true };
          }
      }
  } catch (e) {
      console.error("Supabase Auth Check Failed in API", e);
  }

  return { success: false, error: "Unauthorized" };
}

export async function verifyAdmin(request: Request) {
  const result = await verifyAdminAuth(request);
  if (!result.success) {
    throw new Error(result.error ?? "Admin verification failed");
  }
}
