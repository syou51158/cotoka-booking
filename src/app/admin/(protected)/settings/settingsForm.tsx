"use client";
import { useState } from "react";
import type { BusinessProfile } from "@/server/settings";
import { showToast } from "@/lib/toast";

export default function AdminSettingsForm({ initial }: { initial: BusinessProfile }) {
  const [form, setForm] = useState({
    salon_name: initial.salon_name,
    phone: initial.phone ?? "",
    email_from: initial.email_from,
    timezone: initial.timezone,
    default_locale: initial.default_locale,
    currency: initial.currency,
    address_ja: initial.address_ja ?? "",
    address_en: initial.address_en ?? "",
    address_zh: initial.address_zh ?? "",
    website_url: initial.website_url ?? "",
    map_url: initial.map_url ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "保存に失敗しました");
      }
      const saved: BusinessProfile = await res.json();
      showToast({ variant: "success", title: "保存しました", description: "設定が反映されました" });
    } catch (error) {
      showToast({ variant: "error", title: "保存に失敗", description: (error as Error).message });
    } finally {
      setSaving(false);
    }
  }

  function input(name: keyof typeof form, props?: any) {
    return (
      <input
        value={(form as any)[name]}
        onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
        style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
        {...props}
      />
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <label>
        店名
        {input("salon_name")}
      </label>
      <label>
        電話
        {input("phone")}
      </label>
      <label>
        送信元メール
        {input("email_from")}
      </label>
      <label>
        タイムゾーン（IANA）
        {input("timezone", { placeholder: "Asia/Tokyo" })}
      </label>
      <label>
        既定ロケール
        <select
          value={form.default_locale}
          onChange={(e) => setForm((f) => ({ ...f, default_locale: e.target.value as any }))}
          style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
        >
          <option value="ja">ja</option>
          <option value="en">en</option>
          <option value="zh">zh</option>
        </select>
      </label>
      <label>
        通貨
        {input("currency", { placeholder: "JPY" })}
      </label>
      <hr />
      <label>
        住所（日本語）
        {input("address_ja")}
      </label>
      <label>
        住所（英語）
        {input("address_en")}
      </label>
      <label>
        住所（中国語）
        {input("address_zh")}
      </label>
      <hr />
      <label>
        WebサイトURL
        {input("website_url")}
      </label>
      <label>
        マップURL
        {input("map_url")}
      </label>
      <button onClick={save} disabled={saving} style={{ padding: "8px 12px", borderRadius: 6, background: saving ? "#888" : "#222", color: "#fff" }}>
        {saving ? "保存中..." : "保存"}
      </button>
    </div>
  );
}