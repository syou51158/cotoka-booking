"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import type { Stripe as StripeJs } from "@stripe/stripe-js";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { TIMEZONE } from "@/lib/config";
import { formatDisplay } from "@/lib/time";
import type { Dictionary } from "@/i18n/dictionaries";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const formSchema = z
  .object({
    customerName: z.string().min(1, "お名前は必須です"),
    customerEmail: z
      .string()
      .email("メールアドレスの形式が正しくありません")
      .optional()
      .or(z.literal("")),
    customerPhone: z
      .string()
      .min(8, "電話番号を入力してください")
      .optional()
      .or(z.literal("")),
    notes: z.string().max(500, "500文字以内で入力してください").optional(),
    terms: z.boolean().refine((value) => value, "利用規約への同意が必要です"),
    cancelPolicy: z
      .boolean()
      .refine((value) => value, "キャンセルポリシーへの同意が必要です"),
    privacy: z
      .boolean()
      .refine((value) => value, "プライバシーポリシーへの同意が必要です"),
    paymentOption: z.enum(["pay_in_store", "prepay"]),
  })
  .superRefine((values, ctx) => {
    const hasEmail = !!values.customerEmail && values.customerEmail.length > 0;
    const hasPhone = !!values.customerPhone && values.customerPhone.length > 0;
    if (!hasEmail && !hasPhone) {
      ctx.addIssue({
        path: ["customerEmail"],
        code: z.ZodIssueCode.custom,
        message: "メールまたは電話番号のいずれかを入力してください",
      });
      ctx.addIssue({
        path: ["customerPhone"],
        code: z.ZodIssueCode.custom,
        message: "メールまたは電話番号のいずれかを入力してください",
      });
    }
  });

interface ConfirmReservationFormProps {
  service: {
    id: string;
    name: string;
    price_jpy: number;
    duration_min: number;
    requires_prepayment?: boolean;
  };
  staff: {
    id: string;
    display_name: string;
  };
  slot: {
    start: string;
    end?: string;
  };
  locale: string;
  dict: Dictionary;
}

type ReservationResponse = {
  id: string;
  code?: string | null;
};

export default function ConfirmReservationForm({
  service,
  staff,
  slot,
  locale,
  dict,
}: ConfirmReservationFormProps) {
  const router = useRouter();
  const enableDevMocks = process.env.NEXT_PUBLIC_ALLOW_DEV_MOCKS === "true";
  const defaultPaymentOption = service?.requires_prepayment ? "prepay" : "prepay";
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      notes: "",
      terms: false,
      cancelPolicy: false,
      privacy: false,
      paymentOption: defaultPaymentOption,
    },
  });

  const watchName = form.watch("customerName");
  const watchEmail = form.watch("customerEmail");
  const watchPhone = form.watch("customerPhone");
  const watchTerms = form.watch("terms");
  const watchCancel = form.watch("cancelPolicy");
  const watchPrivacy = form.watch("privacy");
  const hasContact = !!(watchEmail && watchEmail.length > 0) || !!(watchPhone && watchPhone.length > 0);
  const allAgreed = !!watchTerms && !!watchCancel && !!watchPrivacy;
  const canSubmit = !!(watchName && watchName.length > 0) && hasContact && allAgreed;

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [devReservation, setDevReservation] =
    useState<ReservationResponse | null>(null);
  const [devCompleting, setDevCompleting] = useState(false);
  const [stripeUrl, setStripeUrl] = useState<string | null>(null);

  type CreateReservationResult = {
    rid: string;
    nextUrl?: string;
    checkoutUrl?: string;
    checkoutSessionId?: string;
    code?: string | null;
  };

  const createReservation = async (values: z.infer<typeof formSchema>) => {
    const reservationResponse = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: service.id,
        staffId: staff.id,
        start: slot.start,
        end: slot.end,
        customerName: values.customerName,
        customerEmail: values.customerEmail || null,
        customerPhone: values.customerPhone || null,
        notes: values.notes ? values.notes : null,
        locale,
        paymentOption: values.paymentOption,
        agreements: {
          terms: values.terms,
          cancel: values.cancelPolicy,
          privacy: values.privacy,
        },
      }),
    });

    if (!reservationResponse.ok) {
      const data = await reservationResponse.json().catch(() => ({}));
      const message =
        (data as { message?: string; code?: string }).message ??
        (data as { code?: string }).code ??
        "予約を作成できませんでした";
      setErrorMessage(message);
      return null;
    }

    return (await reservationResponse.json()) as CreateReservationResult;
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    setErrorMessage(null);
    setSubmitting(true);
    setDevReservation(null);

    try {
      const result = await createReservation(values);
      if (!result) {
        return;
      }

      if (enableDevMocks) {
        setDevReservation({ id: result.rid, code: result.code ?? null });
        return;
      }

      if (result.nextUrl) {
        router.push(result.nextUrl);
        return;
      }
      if (result.checkoutUrl) {
        // リダイレクトのフェールセーフ: replace を優先し、失敗時は新規タブを試行
        setStripeUrl(result.checkoutUrl);
        // Stripe.js によるリダイレクト（より堅牢）を優先
        try {
          if (result.checkoutSessionId && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
            const stripeJs: StripeJs | null = await loadStripe(
              process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
            );
            const redirect = await stripeJs?.redirectToCheckout({
              sessionId: result.checkoutSessionId,
            });
            if (!redirect?.error) {
              // 成功の場合はここで終了
              return;
            }
          }
        } catch {
          // Stripe.js が使えない場合は従来の replace にフォールバック
        }
        // フォールバック: 従来のトップレベルナビゲーション
        try {
          window.location.replace(result.checkoutUrl);
        } catch {
          try {
            window.open(result.checkoutUrl, "_blank", "noopener");
          } catch {}
        }
        // しばらく進まない場合は手動リンクを提示
        setTimeout(() => {
          if (document.visibilityState === "visible") {
            setErrorMessage(
              "Stripeへの遷移に時間がかかっています。下のリンクから進んでください。",
            );
          }
        }, 5000);
        return;
      }

      // フォールバック: /api/reservations が RID のみを返却した場合、
      // 予約IDを用いて /api/stripe/checkout を叩いてセッションURLを取得して遷移する
      if (result.rid && !result.checkoutUrl && !result.nextUrl) {
        try {
          const response = await fetch("/api/stripe/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reservationId: result.rid }),
          });
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            setErrorMessage(
              (data as { message?: string }).message ??
                "決済URLの取得に失敗しました",
            );
          } else {
            const payload = await response.json().catch(() => ({}));
            const url: string | undefined =
              (payload?.data?.url as string | undefined) ??
              (payload?.url as string | undefined);
            const sessionId: string | undefined =
              (payload?.data?.id as string | undefined) ??
              (payload?.id as string | undefined);
            if (url) {
              setStripeUrl(url);
              // Stripe.js を優先
              try {
                if (sessionId && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
                  const stripeJs: StripeJs | null = await loadStripe(
                    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
                  );
                  const redirect = await stripeJs?.redirectToCheckout({ sessionId });
                  if (!redirect?.error) {
                    return;
                  }
                }
              } catch {
                // ignore
              }
              // フォールバック: 従来のトップレベルナビゲーション
              try {
                window.location.replace(url);
              } catch {
                try {
                  window.open(url, "_blank", "noopener");
                } catch {}
              }
              setTimeout(() => {
                if (document.visibilityState === "visible") {
                  setErrorMessage(
                    "Stripeへの遷移に時間がかかっています。下のリンクから進んでください。",
                  );
                }
              }, 5000);
              return;
            } else {
              setErrorMessage("決済URLの取得に失敗しました");
            }
          }
        } catch (err) {
          setErrorMessage(
            err instanceof Error ? err.message : "決済URLの取得に失敗しました",
          );
        }
      }

      setErrorMessage("不明なレスポンスです。もう一度お試しください。");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "予期せぬエラーが発生しました",
      );
    } finally {
      setSubmitting(false);
    }
  });

  async function handleDevComplete() {
    if (!devReservation) return;
    setDevCompleting(true);
    try {
      const response = await fetch(
        `/api/dev/mock/checkout-complete?rid=${encodeURIComponent(devReservation.id)}`,
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          (data as { message?: string }).message ?? "DEV擬似決済に失敗しました",
        );
      }
      router.push(
        `/${locale}/success?rid=${encodeURIComponent(devReservation.id)}`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "DEV擬似決済に失敗しました",
      );
    } finally {
      setDevCompleting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="customerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.confirm.name}</FormLabel>
                <FormControl>
                  <Input placeholder="例: 山田 花子" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="customerEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.confirm.contactEmail}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="hanako@example.com"
                      inputMode="email"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    メールまたは電話番号のいずれかは必須です。
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customerPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.confirm.contactPhone}</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="09012345678"
                      inputMode="tel"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.confirm.notes}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="ご要望があればご記入ください"
                    className="resize-none"
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-3">
            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{dict.confirm.agreements.terms}</FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cancelPolicy"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{dict.confirm.agreements.cancel}</FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="privacy"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{dict.confirm.agreements.privacy}</FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

          </div>
        </div>

        <div className="rounded-lg border p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">{dict.confirm.summary}</p>
          <p>
            {dict.confirm.staff}: {staff.display_name}
          </p>
          <p>
            {dict.confirm.time}: {formatDisplay(slot.start)}
          </p>
          <p>
            {dict.confirm.total}: {formatCurrency(service.price_jpy)}
          </p>
          <p className="text-xs text-slate-400">
            すべての時刻は {TIMEZONE} 表示です。
          </p>
        </div>

        {enableDevMocks ? (
          <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            <p className="font-semibold">DEVモード</p>
            <p>
              Stripe
              接続なしで予約内容を保存し、擬似決済を行って成功ページの動作を確認できます。
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={submitting || devCompleting || !canSubmit} aria-describedby="confirm-error">
                {submitting ? "保存中…" : "予約を保存（DEV）"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!devReservation || devCompleting}
                onClick={handleDevComplete}
              >
                {devCompleting ? "擬似決済中…" : "支払い完了を擬似実行"}
              </Button>
            </div>
            {devReservation ? (
              <p className="text-xs text-amber-600">
                RID: {devReservation.id}
                {devReservation.code ? ` / CODE: ${devReservation.code}` : ""}
              </p>
            ) : (
              <p className="text-xs text-amber-600">
                まず「予約を保存（DEV）」で予約データを作成してください。
              </p>
            )}
          </div>
        ) : null}

        {errorMessage ? (
          <div id="confirm-error" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600" role="alert" aria-live="polite">
            {errorMessage}
          </div>
        ) : null}

        {stripeUrl ? (
          <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
            <p>
              Stripeへ遷移中です。進まない場合は
              <a href={stripeUrl} target="_blank" rel="noopener" className="font-semibold underline">こちら</a>
              をクリックしてください。
            </p>
          </div>
        ) : null}


        {!enableDevMocks ? (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="paymentOption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.confirm.paymentTitle}</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="支払い方法を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prepay">{dict.confirm.paymentPrepay}</SelectItem>
                        {service && !service.requires_prepayment && (
                          <SelectItem value="pay_in_store">{dict.confirm.paymentPayInStore}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={submitting || !canSubmit} aria-describedby="confirm-error">
              {submitting
                ? form.watch("paymentOption") === "prepay"
                  ? "Stripeへ転送中…"
                  : "予約を保存中…"
                : form.watch("paymentOption") === "prepay"
                ? dict.confirm.submit
                : dict.confirm.submitNoPrepayment}
            </Button>
          </div>
        ) : null}
      </form>
    </Form>
  );
}
