import { verifyReservationViewToken } from "@/server/tokens";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { markReservationEmailVerified } from "@/server/reservations";
import { getDictionary } from "@/i18n/dictionaries";
import type { SupportedLocale } from "@/lib/config";

type PageProps = {
  params: { locale: SupportedLocale };
  searchParams: { token?: string };
};

export default async function ReservationViewPage({
  params,
  searchParams,
}: PageProps) {
  const dict = getDictionary(params.locale);
  const token = searchParams.token;

  if (!token) {
    return (
      <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>リンクが無効です</h1>
        <p>
          URLにトークンが含まれていません。最新の確認メールからアクセスしてください。
        </p>
      </div>
    );
  }

  try {
    const payload = await verifyReservationViewToken(token);
    const supabase = createSupabaseServiceRoleClient() as any;
    const { data, error } = await supabase
      .from("reservations")
      .select(
        "*, service:service_id(name,duration_min), staff:staff_id(display_name)",
      )
      .eq("id", payload.rid)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return (
        <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600 }}>
            予約が見つかりません
          </h1>
          <p>
            リンクの予約IDが無効です。最新の確認メールからアクセスしてください。
          </p>
        </div>
      );
    }

    const row = data as any;
    if (row.last_magic_link_jti && row.last_magic_link_jti !== payload.jti) {
      return (
        <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600 }}>リンクが無効です</h1>
          <p>
            このリンクは古いものです。最新の確認メールのリンクをご利用ください。
          </p>
        </div>
      );
    }

    // Mark email as verified
    await markReservationEmailVerified(row.id);

    const serviceName = row?.service?.name ?? "サービス";
    const start = new Date(row.start_at);

    return (
      <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>
          {dict.email.confirmation.title}
        </h1>
        <p style={{ marginTop: 8 }}>
          {dict.email.confirmation.greeting.replace(
            "{customerName}",
            row.customer_name,
          )}
        </p>

        <div
          style={{
            backgroundColor: "#f8f9fa",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 16,
            marginTop: 24,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "160px 1fr",
              rowGap: 8,
            }}
          >
            <div style={{ fontWeight: 500 }}>
              {dict.email.confirmation.details.service}
            </div>
            <div>{serviceName}</div>
            <div style={{ fontWeight: 500 }}>
              {dict.email.confirmation.details.datetime}
            </div>
            <div>
              {start.toLocaleString(
                params.locale === "en"
                  ? "en-US"
                  : params.locale === "zh"
                    ? "zh-TW"
                    : "ja-JP",
              )}
            </div>
            <div style={{ fontWeight: 500 }}>
              {dict.email.confirmation.details.staff}
            </div>
            <div>{row?.staff?.display_name ?? "スタッフ"}</div>
            <div style={{ fontWeight: 500 }}>予約番号</div>
            <div>{row.code}</div>
          </div>
        </div>

        <p style={{ marginTop: 24, color: "#64748b" }}>
          この画面の表示により、メールアドレスの確認が完了しました。
        </p>
      </div>
    );
  } catch (e) {
    return (
      <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>
          リンクが無効または期限切れです
        </h1>
        <p>お手数ですが最新の確認メールをご確認ください。</p>
      </div>
    );
  }
}
