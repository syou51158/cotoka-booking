import Link from "next/link";
import { format, startOfDay, endOfDay, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveServices } from "@/server/services";
import { getAdminReservations, getStaffDirectory } from "@/server/admin";
import { getShiftsByWeek } from "@/server/shifts";
import { getOpeningHours } from "@/server/schedule";
import { getSiteSettings } from "@/server/admin";
import { getBlocksByDay } from "@/server/blocks";
import AdminReservationTimetable from "@/components/admin/reservation-timetable";
import { LedgerFilterBar } from "@/components/admin/ledger-filter-bar";
import Toaster from "@/components/ui/toaster";
import { computePaymentState } from "@/lib/payments";

const STATUS_LABEL = {
  pending: "未決済",
  unpaid: "未支払い",
  processing: "処理中",
  paid: "支払い済み",
  confirmed: "確定",
  canceled: "キャンセル",
  no_show: "未来店",
  refunded: "返金済み",
} as const;

type StatusKey = keyof typeof STATUS_LABEL;

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await Promise.resolve(searchParams)) ?? {};
  const staffParam = typeof sp.staff === "string" ? sp.staff : "all";
  const serviceParam = typeof sp.service === "string" ? sp.service : "all";
  const statusParam = typeof sp.status === "string" ? sp.status : "all";
  const payParam = typeof sp.pay === "string" ? sp.pay : "all";

  const statusFilter: StatusKey | undefined =
    statusParam && statusParam in STATUS_LABEL
      ? (statusParam as StatusKey)
      : undefined;

  const tableDayStr = typeof sp.day === "string" ? sp.day : format(new Date(), "yyyy-MM-dd");
  const tableDay = new Date(`${tableDayStr}T00:00:00`);
  const from = startOfDay(tableDay);
  const to = endOfDay(tableDay);

  const [reservations, staff, services, openingHours, shifts, siteSettings] =
    await Promise.all([
      getAdminReservations({
        from: from.toISOString(),
        to: to.toISOString(),
        staffId: staffParam !== "all" ? staffParam : undefined,
        serviceId: serviceParam !== "all" ? serviceParam : undefined,
        status: statusParam !== "all" ? statusFilter : undefined,
      }),
      getStaffDirectory(),
      getActiveServices(),
      getOpeningHours(),
      (async () => {
        const d = new Date(tableDay);
        const day = d.getDay();
        const diff = d.getDate() - day + (day == 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        return getShiftsByWeek(monday, staffParam !== "all" ? staffParam : undefined);
      })(),
      getSiteSettings(),
    ]);

  let blocks = [] as Array<{
    id: string;
    staff_id: string;
    start_at: string;
    end_at: string;
    block_type: "task" | "break" | "walk_in";
    staff?: { id: string; name: string };
  }>;

  try {
    blocks = await getBlocksByDay(tableDay, staffParam !== "all" ? staffParam : undefined);
  } catch {
    const dayStr = format(tableDay, "yyyy-MM-dd");
    blocks = (shifts.filter((s) => {
      const d = new Date(s.start_at);
      return d.toISOString().startsWith(dayStr);
    }).filter((s) => (s.note ?? "").length > 0)).map((s) => ({
      id: `fallback-${s.id}`,
      staff_id: s.staff_id,
      start_at: s.start_at,
      end_at: s.end_at,
      block_type: ((s.note ?? "").includes("休憩") ? "break" : (s.note ?? "").includes("飛び込み") ? "walk_in" : "task"),
      staff: s.staff ? { id: s.staff.id, name: s.staff.name } : undefined,
    }));
  }

  const filteredReservations = reservations.filter((r) => {
    const state = computePaymentState(r);
    if (payParam === "unpaid") return state.statusTag === "unpaid";
    if (payParam === "partial") return state.statusTag === "partial";
    if (payParam === "paid") return state.statusTag === "paid";
    if (payParam === "canceled") return state.statusTag === "canceled";
    return true;
  });

  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
    staff: staffParam,
    service: serviceParam,
    status: statusParam,
    pay: payParam,
  });
  const exportHref = `/api/admin/export?${params.toString()}`;

  const dayOfWeek = tableDay.getDay();
  const todayOpeningHours = openingHours.find(oh => oh.weekday === dayOfWeek) || null;

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/10">

      {/* 1. Sticky Filter Bar */}
      <LedgerFilterBar staffList={staff} currentDate={tableDay} />

      <div className="flex-1 p-4 md:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">予約台帳</h1>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={exportHref}>CSV出力</Link>
            </Button>
            <Button asChild variant="default" className="shadow-sm">
              <Link href="/admin/dashboard">Dashへ</Link>
            </Button>
          </div>
        </div>

        <Card className="h-[full] flex flex-col min-h-[600px]">
          <CardContent className="flex-1 overflow-auto p-0 relative">
            <AdminReservationTimetable
              reservations={filteredReservations}
              staff={staff}
              day={tableDay}
              openingHours={todayOpeningHours}
              shifts={shifts}
              snapMinutes={siteSettings?.default_slot_interval_min ?? 30}
              blocks={blocks}
            />
          </CardContent>
        </Card>
      </div>

      <Toaster />
    </div>
  );
}
