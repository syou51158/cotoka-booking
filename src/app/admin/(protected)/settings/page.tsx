import { requireAdmin } from "@/lib/admin-auth";
import { getBusinessProfile } from "@/server/settings";
import AdminSettingsForm from "./settingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const profile = await getBusinessProfile({ preferCache: false });
  return (
    <div style={{ padding: 24 }}>
      <h1>店舗設定</h1>
      <p style={{ color: "#666" }}>店舗情報を編集すると、メール・ICS・成功ページ・予約ページの表示が即時更新されます。</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
        <div>
          <AdminSettingsForm initial={profile} />
        </div>
        <div>
          <h2>プレビュー</h2>
          <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
            <p><strong>店名</strong>: {profile.salon_name}</p>
            <p><strong>住所</strong>: {profile.address_ja || profile.address_en || profile.address_zh || "(未設定)"}</p>
            <p><strong>電話</strong>: {profile.phone || "(未設定)"}</p>
            <p><strong>送信元メール</strong>: {profile.email_from}</p>
            <p><strong>タイムゾーン</strong>: {profile.timezone}</p>
            <p><strong>既定ロケール</strong>: {profile.default_locale}</p>
            <p><strong>通貨</strong>: {profile.currency}</p>
            <p><strong>Webサイト</strong>: {profile.website_url || "(未設定)"}</p>
            <p><strong>マップURL</strong>: {profile.map_url || "(未設定)"}</p>
            <hr style={{ margin: "16px 0" }} />
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>メールの署名・住所に反映</li>
              <li>ICSのタイトル・主催者・場所に反映</li>
              <li>成功ページのヘッダー/連絡先に反映</li>
              <li>予約ページ（Hero/フッター）に反映</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}