
"use client";
import { useState } from "react";
import type { BusinessProfile } from "@/server/settings";
import { showToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export default function AdminSettingsForm({
  initial,
}: {
  initial: BusinessProfile;
}) {
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
      showToast({
        variant: "success",
        title: "保存しました",
        description: "設定が反映されました",
      });
    } catch (error) {
      showToast({
        variant: "error",
        title: "保存に失敗",
        description: (error as Error).message,
      });
    } finally {
      setSaving(false);
    }
  }

  function handleChange(name: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [name]: value }));
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label className="text-slate-300">店名 (Salon Name)</Label>
          <Input
            value={form.salon_name}
            onChange={e => handleChange("salon_name", e.target.value)}
            className="bg-black/20 border-white/10 text-white"
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-slate-300">電話番号</Label>
          <Input
            value={form.phone}
            onChange={e => handleChange("phone", e.target.value)}
            className="bg-black/20 border-white/10 text-white"
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-slate-300">送信元メールアドレス</Label>
          <Input
            value={form.email_from}
            onChange={e => handleChange("email_from", e.target.value)}
            className="bg-black/20 border-white/10 text-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label className="text-slate-300">タイムゾーン</Label>
            <Input
              value={form.timezone}
              onChange={e => handleChange("timezone", e.target.value)}
              placeholder="Asia/Tokyo"
              className="bg-black/20 border-white/10 text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-slate-300">通貨</Label>
            <Input
              value={form.currency}
              onChange={e => handleChange("currency", e.target.value)}
              placeholder="JPY"
              className="bg-black/20 border-white/10 text-white"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label className="text-slate-300">既定言語</Label>
          <Select
            value={form.default_locale}
            onValueChange={(val: any) => handleChange("default_locale", val)}
          >
            <SelectTrigger className="bg-black/20 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700 text-white">
              <SelectItem value="ja">日本語 (ja)</SelectItem>
              <SelectItem value="en">English (en)</SelectItem>
              <SelectItem value="zh">中文 (zh)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator className="bg-white/10" />

      <div className="space-y-4">
        <div className="grid gap-2">
          <Label className="text-slate-300">住所 (日本語)</Label>
          <Input
            value={form.address_ja}
            onChange={e => handleChange("address_ja", e.target.value)}
            className="bg-black/20 border-white/10 text-white"
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-slate-300">Address (English)</Label>
          <Input
            value={form.address_en}
            onChange={e => handleChange("address_en", e.target.value)}
            className="bg-black/20 border-white/10 text-white"
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-slate-300">地址 (中文)</Label>
          <Input
            value={form.address_zh}
            onChange={e => handleChange("address_zh", e.target.value)}
            className="bg-black/20 border-white/10 text-white"
          />
        </div>
      </div>

      <Separator className="bg-white/10" />

      <div className="space-y-4">
        <div className="grid gap-2">
          <Label className="text-slate-300">Webサイト URL</Label>
          <Input
            value={form.website_url}
            onChange={e => handleChange("website_url", e.target.value)}
            className="bg-black/20 border-white/10 text-white"
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-slate-300">マップ URL</Label>
          <Input
            value={form.map_url}
            onChange={e => handleChange("map_url", e.target.value)}
            className="bg-black/20 border-white/10 text-white"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={save}
          disabled={saving}
          className="bg-primary hover:bg-primary/90 text-white min-w-[120px]"
        >
          {saving ? "保存中..." : "設定を保存"}
        </Button>
      </div>
    </div>
  );
}
