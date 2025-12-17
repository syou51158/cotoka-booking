
import { requireAdmin } from "@/lib/admin-auth";
import { getBusinessProfile } from "@/server/settings";
import AdminSettingsForm from "./settingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const profile = await getBusinessProfile({ preferCache: false });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white drop-shadow-md mb-2">
          店舗設定
        </h1>
        <p className="text-slate-400">
          店舗情報を編集すると、メール・ICS・成功ページ・予約ページの表示が即時更新されます。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Settings Form */}
        <div className="glass-panel p-6 rounded-2xl">
          <AdminSettingsForm initial={profile} />
        </div>

        {/* Preview Panel */}
        <div className="glass-panel p-6 rounded-2xl h-fit">
          <h2 className="text-lg font-bold text-white mb-4">プレビュー</h2>
          <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 space-y-3 text-sm">
            <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
              <span className="text-slate-400">店名</span>
              <span className="font-medium text-white">{profile.salon_name}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
              <span className="text-slate-400">住所</span>
              <span className="text-white">
                {profile.address_ja || profile.address_en || profile.address_zh || "(未設定)"}
              </span>
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
              <span className="text-slate-400">電話</span>
              <span className="text-white font-mono">{profile.phone || "(未設定)"}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
              <span className="text-slate-400">送信元メール</span>
              <span className="text-white font-mono">{profile.email_from}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
              <span className="text-slate-400">Webサイト</span>
              <span className="text-white font-mono break-all">{profile.website_url || "(未設定)"}</span>
            </div>
            <div className="border-t border-white/10 my-3 pt-3">
              <ul className="list-disc list-inside space-y-1 text-slate-500 text-xs">
                <li>メールの署名・住所に反映</li>
                <li>ICSのタイトル・主催者・場所に反映</li>
                <li>成功ページのヘッダー/連絡先に反映</li>
                <li>予約ページ（Hero/フッター）に反映</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
