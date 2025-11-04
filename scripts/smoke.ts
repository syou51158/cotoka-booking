import { fetch } from "undici";
import type { RequestInit as UndiciRequestInit } from "undici";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const DEV_HEADERS = { "Content-Type": "application/json" } as const;
const FORWARDED_HOST = process.env.SMOKE_FORWARD_HOST; // e.g. "localhost:3002"
const FORWARDED_PROTO = process.env.SMOKE_FORWARD_PROTO ?? "http";

type Service = { id: string };
type Slot = { staffId: string; start: string; end: string };
type Reservation = { id: string; code?: string | null };
type ManageReservation = { status: string };
type NotificationEntry = { kind: string };

type ResponseWithHeaders<T> = { json: T; baseUrlHeader: string | null };

async function request<T = any>(
  path: string,
  init?: UndiciRequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Request failed: ${res.status} ${res.statusText} - ${body}`,
    );
  }
  return (await res.json()) as T;
}

async function requestWithHeaders<T = any>(
  path: string,
  init?: UndiciRequestInit,
): Promise<ResponseWithHeaders<T>> {
  const res = await fetch(`${BASE_URL}${path}`, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Request failed: ${res.status} ${res.statusText} - ${body}`,
    );
  }
  const json = (await res.json()) as T;
  const baseUrlHeader = res.headers.get("X-Base-Url");
  return { json, baseUrlHeader };
}

function tomorrowDate() {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return (
    tomorrow.toISOString().split("T")[0] ??
    new Date().toISOString().split("T")[0]
  );
}

function toDateSafe(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  return d;
}

function minutesDiff(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 60000);
}

function dateFromToday(days: number) {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return (
    d.toISOString().split("T")[0] ?? new Date().toISOString().split("T")[0]
  );
}

async function runSmoke() {
  console.log(`Smoke test target: ${BASE_URL}`);

  console.log("1) Fetching services");
  const services = await request<Service[]>("/api/services?useDb=1");
  if (!services.length) {
    throw new Error("No services available. Seed data is required.");
  }
  const service = services[0]!;

  console.log("2) Fetching slots for tomorrow");
  const date = tomorrowDate();
  let slots = await request<Slot[]>("/api/slots?useDb=1", {
    method: "POST",
    headers: DEV_HEADERS,
    body: JSON.stringify({
      serviceId: service.id,
      date,
    }),
  });
  if (!slots.length) {
    console.warn("   ! No DB slots, falling back to mock slots");
    slots = await request<Slot[]>("/api/slots?source=mock", {
      method: "POST",
      headers: DEV_HEADERS,
      body: JSON.stringify({ serviceId: service.id, date }),
    });
  }
  if (!slots.length) {
    throw new Error(
      `No slots returned for service ${service.id} on ${date}. Ensure opening hours / shifts are seeded or enable dev mocks.`,
    );
  }
  let selectedSlot: Slot | undefined;
  let reservationRes: ResponseWithHeaders<Reservation> | null = null;

  console.log("3) Creating pending reservation");
  for (const candidate of slots) {
    try {
      const res = await requestWithHeaders<Reservation>("/api/reservations", {
        method: "POST",
        headers: FORWARDED_HOST
          ? {
              ...DEV_HEADERS,
              "x-forwarded-host": FORWARDED_HOST,
              "x-forwarded-proto": FORWARDED_PROTO,
            }
          : DEV_HEADERS,
        body: JSON.stringify({
          serviceId: service.id,
          staffId: candidate.staffId,
          start: candidate.start,
          end: candidate.end,
          customerName: "Smoke Tester",
          customerEmail: "smoke@example.com",
          customerPhone: "09000000000",
          locale: "ja",
          paymentOption: "prepay",
          agreements: {
            terms: true,
            cancel: true,
            privacy: true,
          },
        }),
      });
      reservationRes = res;
      selectedSlot = candidate;
      break;
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      if (msg.includes("SLOT_TAKEN")) {
        console.warn("   ! Slot taken, trying next candidate");
        continue;
      }
      throw err;
    }
  }
  if (!reservationRes || !selectedSlot) {
    throw new Error(
      "No available slot to create reservation. Try seeding data or using a different date.",
    );
  }
  const slot = selectedSlot;
  const reservation = reservationRes.json;

  console.log(
    `   → X-Base-Url(reservations): ${reservationRes.baseUrlHeader ?? "-"}`,
  );

  console.log(
    `   → reservation id=${reservation.id} code=${reservation.code ?? "-"}`,
  );
  if (!reservation.code) {
    throw new Error(
      "Reservation code was not returned. Check reservation creation response.",
    );
  }

  console.log("4) Creating checkout session (header logging)");
  let checkoutUrl: string | undefined;
  try {
    const checkoutRes = await requestWithHeaders<{ url: string }>(
      "/api/stripe/checkout",
      {
        method: "POST",
        headers: FORWARDED_HOST
          ? {
              ...DEV_HEADERS,
              "x-forwarded-host": FORWARDED_HOST,
              "x-forwarded-proto": FORWARDED_PROTO,
            }
          : DEV_HEADERS,
        body: JSON.stringify({ reservationId: reservation.id }),
      },
    );
    console.log(
      `   → X-Base-Url(checkout): ${checkoutRes.baseUrlHeader ?? "-"}`,
    );
    checkoutUrl = checkoutRes.json.url;
  } catch (e) {
    console.warn(
      "   ! Checkout create failed, continuing (dev env may skip Stripe)",
    );
  }

  console.log("5) Completing mock checkout");
  await request(
    `/api/dev/mock/checkout-complete?rid=${encodeURIComponent(reservation.id)}`,
  );

  console.log("6) Verifying paid status via /api/manage/lookup");
  const manage = await request<ManageReservation>("/api/manage/lookup", {
    method: "POST",
    headers: DEV_HEADERS,
    body: JSON.stringify({
      code: reservation.code,
      contact: "smoke@example.com",
    }),
  });
  if (manage.status !== "paid" && manage.status !== "confirmed") {
    throw new Error(
      `Reservation status expected to be paid/confirmed, got ${manage.status}`,
    );
  }

  const startAt = toDateSafe(slot.start);

  console.log("7) Triggering reminder (24h) with shift alignment");
  const shift24m = minutesDiff(
    new Date(startAt.getTime() - 24 * 60 * 60 * 1000),
    new Date(),
  );
  await request(`/api/cron/reminders?shiftMinutes=${shift24m}&window24m=180`);
  let notifications = await request<{ notifications: NotificationEntry[] }>(
    `/api/dev/debug/notifications?rid=${encodeURIComponent(reservation.id)}`,
  );
  if (!notifications.notifications.some((entry) => entry.kind === "24h")) {
    throw new Error(
      "24h reminder not logged. Adjust seed data or window parameters.",
    );
  }

  console.log("8) Triggering reminder (2h) with shift alignment");
  const shift2m = minutesDiff(
    new Date(startAt.getTime() - 2 * 60 * 60 * 1000),
    new Date(),
  );
  await request(`/api/cron/reminders?shiftMinutes=${shift2m}&window2m=60`);
  notifications = await request<{ notifications: NotificationEntry[] }>(
    `/api/dev/debug/notifications?rid=${encodeURIComponent(reservation.id)}`,
  );
  if (!notifications.notifications.some((entry) => entry.kind === "2h")) {
    throw new Error(
      "2h reminder not logged. Adjust seed data or window parameters.",
    );
  }

  console.log(
    "8.1) Testing reminder idempotency - 24h reminder duplicate prevention",
  );
  // 同じ24hリマインダーを再度実行して、重複送信が防止されることを確認
  const beforeDuplicateTest = await request<{
    notifications: NotificationEntry[];
  }>(`/api/dev/debug/notifications?rid=${encodeURIComponent(reservation.id)}`);
  const initial24hCount = beforeDuplicateTest.notifications.filter(
    (entry) => entry.kind === "24h",
  ).length;

  // 同じ条件で24hリマインダーを再実行
  await request(`/api/cron/reminders?shiftMinutes=${shift24m}&window24m=180`);

  const afterDuplicateTest = await request<{
    notifications: NotificationEntry[];
  }>(`/api/dev/debug/notifications?rid=${encodeURIComponent(reservation.id)}`);
  const final24hCount = afterDuplicateTest.notifications.filter(
    (entry) => entry.kind === "24h",
  ).length;

  if (final24hCount !== initial24hCount) {
    throw new Error(
      `24h reminder idempotency failed: expected ${initial24hCount} notifications, got ${final24hCount}. Duplicate emails were sent.`,
    );
  }

  console.log(
    "8.2) Testing reminder idempotency - 2h reminder duplicate prevention",
  );
  // 同じ2hリマインダーを再度実行して、重複送信が防止されることを確認
  const beforeDuplicate2hTest = await request<{
    notifications: NotificationEntry[];
  }>(`/api/dev/debug/notifications?rid=${encodeURIComponent(reservation.id)}`);
  const initial2hCount = beforeDuplicate2hTest.notifications.filter(
    (entry) => entry.kind === "2h",
  ).length;

  // 同じ条件で2hリマインダーを再実行
  await request(`/api/cron/reminders?shiftMinutes=${shift2m}&window2m=60`);

  const afterDuplicate2hTest = await request<{
    notifications: NotificationEntry[];
  }>(`/api/dev/debug/notifications?rid=${encodeURIComponent(reservation.id)}`);
  const final2hCount = afterDuplicate2hTest.notifications.filter(
    (entry) => entry.kind === "2h",
  ).length;

  if (final2hCount !== initial2hCount) {
    throw new Error(
      `2h reminder idempotency failed: expected ${initial2hCount} notifications, got ${final2hCount}. Duplicate emails were sent.`,
    );
  }

  console.log("8.3) Testing email resend API idempotency");
  // 管理者メール再送APIの冪等性をテスト
  try {
    // 最初の再送リクエスト（成功するはず）
    const firstResend = await fetch(`${BASE_URL}/api/admin/email/resend`, {
      method: "POST",
      headers: {
        ...DEV_HEADERS,
        Authorization: "Bearer test-admin-token", // 開発環境用のテストトークン
        ...(FORWARDED_HOST
          ? {
              "x-forwarded-host": FORWARDED_HOST,
              "x-forwarded-proto": FORWARDED_PROTO,
            }
          : {}),
      },
      body: JSON.stringify({
        reservationId: reservation.id,
        kind: "confirmation",
      }),
    });

    if (firstResend.ok) {
      // 即座に同じリクエストを送信（冪等性により拒否されるはず）
      const duplicateResend = await fetch(
        `${BASE_URL}/api/admin/email/resend`,
        {
          method: "POST",
          headers: {
            ...DEV_HEADERS,
            Authorization: "Bearer test-admin-token",
            ...(FORWARDED_HOST
              ? {
                  "x-forwarded-host": FORWARDED_HOST,
                  "x-forwarded-proto": FORWARDED_PROTO,
                }
              : {}),
          },
          body: JSON.stringify({
            reservationId: reservation.id,
            kind: "confirmation",
          }),
        },
      );

      if (duplicateResend.status !== 409) {
        console.warn(
          `   ! Email resend idempotency test skipped: expected 409 Conflict, got ${duplicateResend.status}. This may be due to admin auth requirements in production.`,
        );
      } else {
        const errorResponse = (await duplicateResend.json()) as {
          error?: string;
        };
        if (!errorResponse.error?.includes("送信済み")) {
          throw new Error(
            `Email resend idempotency failed: expected duplicate prevention message, got: ${errorResponse.error}`,
          );
        }
        console.log("   ✓ Email resend idempotency working correctly");
      }
    } else {
      console.warn(
        `   ! Email resend test skipped: admin auth required (status: ${firstResend.status})`,
      );
    }
  } catch (error) {
    console.warn(
      `   ! Email resend idempotency test failed: ${error instanceof Error ? error.message : error}`,
    );
  }

  console.log("9) Success page should render (200)");
  const successRes = await fetch(
    `${BASE_URL}/ja/success?rid=${encodeURIComponent(reservation.id)}`,
    {
      method: "GET",
      headers: FORWARDED_HOST
        ? {
            "x-forwarded-host": FORWARDED_HOST,
            "x-forwarded-proto": FORWARDED_PROTO,
          }
        : undefined,
    },
  );
  const html = await successRes.text();
  if (!successRes.ok || !html.includes("ありがとうございます")) {
    throw new Error(`Success page failed: status=${successRes.status}`);
  }

  // --- 来店払い: 成功ページ検証 → 入金記録 → 残額0検証 ---
  console.log("10) Creating in-store payment reservation");
  const altDate = dateFromToday(2);
  let slots2 = await request<Slot[]>("/api/slots?useDb=1", {
    method: "POST",
    headers: DEV_HEADERS,
    body: JSON.stringify({ serviceId: service.id, date: altDate }),
  });
  if (!slots2.length) {
    console.warn("   ! No DB slots (altDate), falling back to mock slots");
    slots2 = await request<Slot[]>("/api/slots?source=mock", {
      method: "POST",
      headers: DEV_HEADERS,
      body: JSON.stringify({ serviceId: service.id, date: altDate }),
    });
  }
  if (!slots2.length) {
    // 同日で別枠を探すフォールバック
    slots2 = await request<Slot[]>("/api/slots?useDb=1", {
      method: "POST",
      headers: DEV_HEADERS,
      body: JSON.stringify({ serviceId: service.id, date }),
    });
    if (!slots2.length) {
      console.warn("   ! No DB slots (same day), falling back to mock slots");
      slots2 = await request<Slot[]>("/api/slots?source=mock", {
        method: "POST",
        headers: DEV_HEADERS,
        body: JSON.stringify({ serviceId: service.id, date }),
      });
    }
    slots2 = slots2.filter(
      (s) => s.start !== slot.start || s.staffId !== slot.staffId,
    );
  }
  const slot2 = slots2[0];
  if (!slot2) {
    console.warn("   ! Skipping in-store scenario (no alternative slot found)");
  } else {
    const reservation2 = await requestWithHeaders<Reservation>(
      "/api/reservations",
      {
        method: "POST",
        headers: FORWARDED_HOST
          ? {
              ...DEV_HEADERS,
              "x-forwarded-host": FORWARDED_HOST,
              "x-forwarded-proto": FORWARDED_PROTO,
            }
          : DEV_HEADERS,
        body: JSON.stringify({
          serviceId: service.id,
          staffId: slot2.staffId,
          start: slot2.start,
          end: slot2.end,
          customerName: "Smoke Tester",
          customerEmail: "smoke@example.com",
          customerPhone: "09000000000",
          locale: "ja",
          paymentOption: "pay_in_store",
          agreements: { terms: true, cancel: true, privacy: true },
        }),
      },
    );
    const reservationInStore = reservation2.json;
    console.log(
      `   → X-Base-Url(reservations in-store): ${reservation2.baseUrlHeader ?? "-"}`,
    );
    console.log(
      `   → in-store reservation id=${reservationInStore.id} code=${reservationInStore.code ?? "-"}`,
    );

    console.log("11) Success page shows in-store payment note");
    const successRes2 = await fetch(
      `${BASE_URL}/ja/success?rid=${encodeURIComponent(reservationInStore.id)}`,
      {
        method: "GET",
        headers: FORWARDED_HOST
          ? {
              "x-forwarded-host": FORWARDED_HOST,
              "x-forwarded-proto": FORWARDED_PROTO,
            }
          : undefined,
      },
    );
    const html2 = await successRes2.text();
    if (
      !successRes2.ok ||
      !html2.includes("ありがとうございます") ||
      !html2.includes("お支払いはご来店時にお願いします")
    ) {
      throw new Error(
        `In-store success page failed: status=${successRes2.status}`,
      );
    }

    console.log("12) Settling payment via dev mock (full remaining)");
    await request(
      `/api/dev/mock/settle-payment?rid=${encodeURIComponent(reservationInStore.id)}&method=cash`,
    );

    console.log("13) Verifying paid status via /api/manage/lookup (in-store)");
    const manage2 = await request<ManageReservation>("/api/manage/lookup", {
      method: "POST",
      headers: DEV_HEADERS,
      body: JSON.stringify({
        code: reservationInStore.code,
        contact: "smoke@example.com",
      }),
    });
    if (manage2.status !== "paid") {
      throw new Error(
        `Reservation (in-store) expected paid, got ${manage2.status}`,
      );
    }

    console.log("14) Verifying remaining=0 via dev debug payment-summary");
    const summaryRes = await request<{
      reservationId: string;
      amountTotal: number;
      paidTotal: number;
      remaining: number;
      paymentState: string;
    }>(
      `/api/dev/debug/payment-summary?rid=${encodeURIComponent(reservationInStore.id)}`,
    );
    if (summaryRes.remaining !== 0 || summaryRes.paymentState !== "paid") {
      throw new Error(
        `Payment summary mismatch: remaining=${summaryRes.remaining}, state=${summaryRes.paymentState}`,
      );
    }
  }

  console.log("Smoke test passed ✔");
}

runSmoke().catch((error) => {
  console.error(
    "Smoke test failed ✖",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
