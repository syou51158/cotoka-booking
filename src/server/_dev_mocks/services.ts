import type { Database } from "@/types/database";

type ServiceRow = Database["public"]["Tables"]["services"]["Row"];

export async function getActiveServicesMock(): Promise<ServiceRow[]> {
  const now = new Date().toISOString();
  const items: ServiceRow[] = [
    {
      id: "mock-svc-001",
      name: "カット",
      description: "通常のカットサービス",
      duration_min: 60,
      buffer_before_min: 10,
      buffer_after_min: 10,
      price_jpy: 5000,
      requires_prepayment: false,
      currency: "JPY",
      active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: "mock-svc-002",
      name: "ヘアカラー",
      description: "ベーシックカラー（髪質に合わせて調整）",
      duration_min: 120,
      buffer_before_min: 10,
      buffer_after_min: 10,
      price_jpy: 9000,
      requires_prepayment: false,
      currency: "JPY",
      active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: "mock-svc-003",
      name: "トリートメント",
      description: "集中ケアトリートメントで艶やかな仕上がりに",
      duration_min: 45,
      buffer_before_min: 5,
      buffer_after_min: 5,
      price_jpy: 6000,
      requires_prepayment: false,
      currency: "JPY",
      active: true,
      created_at: now,
      updated_at: now,
    },
  ];
  return items;
}
