"use server";

import { redirect } from "next/navigation";
import { createAdminSession, clearAdminSession } from "@/lib/admin-auth";

export async function login(formData: FormData) {
  const passcode = (formData.get("passcode") ?? "").toString();
  const expected = process.env.ADMIN_PASSCODE ?? "";

  if (!expected) {
    throw new Error("ADMIN_PASSCODE is not configured");
  }

  if (passcode !== expected) {
    return { error: "パスコードが正しくありません" } as const;
  }

  createAdminSession();
  redirect("/admin");
}

export async function logout() {
  clearAdminSession();
  redirect("/admin/login");
}
