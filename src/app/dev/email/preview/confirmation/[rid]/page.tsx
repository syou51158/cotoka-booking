import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { renderConfirmationEmail } from "@/lib/email-renderer";

export const dynamic = "force-dynamic";

export default async function ConfirmationEmailPreview({ params }: { params: Promise<{ rid: string }> }) {
  // 開発環境のみ有効
  const allow = process.env.ALLOW_DEV_MOCKS === "true" || process.env.NEXT_PUBLIC_ALLOW_DEV_MOCKS === "true";
  if (!allow) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Dev Email Preview</h1>
        <p>このページは開発専用です。環境変数 `ALLOW_DEV_MOCKS` を有効にしてください。</p>
      </div>
    );
  }

  const { rid } = await params;
  const supabase = createSupabaseServiceRoleClient();
  const { data: reservation, error } = await supabase
    .from("reservations")
    .select("*, service:service_id(name,duration_min), staff:staff_id(display_name,email)")
    .eq("id", rid)
    .maybeSingle();

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Dev Email Preview</h1>
        <p>予約取得に失敗しました: {String(error.message ?? error)}</p>
      </div>
    );
  }

  if (!reservation) {
    if (rid === "sample") {
      const locale: "ja" | "en" | "zh" = "ja";
      const baseReservation = {
        id: "sample-id",
        customer_name: "山田 太郎",
        customer_email: "taro@example.com",
        start_at: new Date().toISOString(),
        total_amount: 12000,
        status: "confirmed",
        code: "ABC123",
        notes: "サンプル予約です",
        service: { name: "全身オイルトリートメント", duration_min: 90 },
        staff: { display_name: "佐藤", email: "staff@example.com" },
      };
      const email = await renderConfirmationEmail(baseReservation as any, locale);
      const emailHtml = email.html.replace(/^<!DOCTYPE html>/, "");
      return (
        <div style={{ padding: 24 }}>
          <h1>確認メールプレビュー（サンプル）</h1>
          <p>Subject: {email.subject}</p>
          <div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }} dangerouslySetInnerHTML={{ __html: emailHtml }} />
        </div>
      );
    }
    return (
      <div style={{ padding: 24 }}>
        <h1>Dev Email Preview</h1>
        <p>予約が見つかりません: {rid}</p>
      </div>
    );
  }

  const locale: "ja" | "en" | "zh" = reservation.locale === "en" || reservation.locale === "zh" ? reservation.locale : "ja";

  const baseReservation = {
    id: reservation.id,
    customer_name: reservation.customer_name,
    customer_email: reservation.customer_email,
    start_at: reservation.start_at,
    total_amount: (reservation as any).amount_total_jpy,
    status: reservation.status,
    code: reservation.code,
    notes: reservation.notes ?? undefined,
    service: reservation.service ? { name: reservation.service.name, duration_min: reservation.service.duration_min ?? 60 } : null,
    staff: reservation.staff ? { display_name: reservation.staff.display_name, email: reservation.staff.email ?? "" } : null,
  };

  const email = await renderConfirmationEmail(baseReservation as any, locale);
  const emailHtml = email.html.replace(/^<!DOCTYPE html>/, "");

  return (
    <div style={{ padding: 24 }}>
      <h1>確認メールプレビュー</h1>
      <p>Subject: {email.subject}</p>
      <div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }} dangerouslySetInnerHTML={{ __html: emailHtml }} />
    </div>
  );
}