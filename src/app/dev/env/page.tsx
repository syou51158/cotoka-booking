import { getEnvHealth, env } from "@/lib/env";

export const dynamic = "force-static";

export default function EnvStatusPage() {
  const health = getEnvHealth();
  const rows: Array<{ label: string; value: string | boolean }> = [
    { label: "ProjectRef", value: health.projectRef ?? "(unknown)" },
    { label: "SITE_URL", value: env.SITE_URL || "(unset)" },
    { label: "SUPABASE_URL", value: env.SUPABASE_URL || "(unset)" },
    { label: "Anon Key", value: health.haveAnonKey },
    { label: "Service Role", value: health.haveServiceRole },
    { label: "Dev Mocks Enabled", value: health.devMocks },
    { label: "Email From", value: health.emailFromMasked ?? "(unset)" },
    { label: "Resend Key", value: health.haveResendKey },
    { label: "Sentry DSN", value: health.haveSentryDsn },
  ];

  const missing: string[] = [];
  if (!env.SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!health.haveAnonKey) missing.push("SUPABASE_ANON_KEY");
  if (!health.haveServiceRole) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!env.SITE_URL) missing.push("SITE_URL");

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-semibold mb-4">Environment Status</h1>
      <p className="text-sm text-gray-600 mb-6">
        以下の必須設定を確認してください。未設定の場合は、プロジェクト直下の{" "}
        <code>.env.local</code> を作成し、
        <code>.env.example</code> を参照して値を設定してください（Next.js
        は再起動が必要）。
      </p>
      {missing.length > 0 ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 mb-6">
          <div className="font-medium text-red-700 mb-1">Missing keys</div>
          <ul className="list-disc list-inside text-red-800">
            {missing.map((k) => (
              <li key={k}>
                <code>{k}</code>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded border border-green-200 bg-green-50 p-3 mb-6">
          <div className="font-medium text-green-700">
            All required keys are set.
          </div>
        </div>
      )}
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={String(r.label)} className="border-b border-gray-200">
              <td className="py-2 pr-4 text-gray-600">{r.label}</td>
              <td className="py-2 font-mono text-gray-900">
                {typeof r.value === "boolean"
                  ? r.value
                    ? "true"
                    : "false"
                  : r.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-6 text-sm text-gray-700">
        <h2 className="font-medium mb-2">設定手順（Supabase）</h2>
        <ol className="list-decimal list-inside">
          <li>Supabase ダッシュボード → Project Settings → API を開く</li>
          <li>
            <code>Project URL</code> を <code>SUPABASE_URL</code> に設定
          </li>
          <li>
            <code>anon public</code> を <code>SUPABASE_ANON_KEY</code> に設定
          </li>
          <li>
            <code>service_role</code> を <code>SUPABASE_SERVICE_ROLE_KEY</code>{" "}
            に設定
          </li>
          <li>保存後、開発サーバーを再起動（環境変数の再読み込み）</li>
        </ol>
      </div>
    </div>
  );
}
