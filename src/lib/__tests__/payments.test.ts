import assert from 'assert';
import { computePaymentState } from '../payments';
import type { Database } from '@/types/database';

type ReservationRow = Database['public']['Tables']['reservations']['Row'];

// テスト用のモック予約データを作成するヘルパー
function createMockReservation(overrides: Partial<ReservationRow> = {}): ReservationRow {
  return {
    id: 'test-id',
    code: 'TEST001',
    status: 'confirmed',
    amount_total_jpy: 10000,
    paid_amount_jpy: 0,
    customer_name: 'Test Customer',
    customer_email: 'test@example.com',
    customer_phone: '090-1234-5678',
    start_at: '2024-01-01T10:00:00Z',
    end_at: '2024-01-01T11:00:00Z',
    service_id: 'service-id',
    staff_id: 'staff-id',
    created_at: '2024-01-01T09:00:00Z',
    updated_at: '2024-01-01T09:00:00Z',
    notes: null,
    payment_option: 'pay_in_store',
    payment_method: null,
    payment_collected_at: null,
    stripe_payment_intent_id: null,
    stripe_session_id: null,
    ...overrides,
  } as ReservationRow;
}

// テスト実行関数
function runTests() {
  console.log('🧪 支払い状態計算のテストを実行中...');
  
  // 未収状態のテスト
  console.log('  ✓ 未収状態のテスト');
  const unpaidReservation = createMockReservation({
    amount_total_jpy: 10000,
    paid_amount_jpy: 0,
  });
  const unpaidResult = computePaymentState(unpaidReservation);
  assert.strictEqual(unpaidResult.statusTag, 'unpaid');
  assert.strictEqual(unpaidResult.total, 10000);
  assert.strictEqual(unpaidResult.paid, 0);
  assert.strictEqual(unpaidResult.remaining, 10000);
  assert.strictEqual(unpaidResult.isPaid, false);
  assert.strictEqual(unpaidResult.shouldShowPaymentUI, true);

  // null値の処理テスト
  const nullPaidReservation = createMockReservation({
    amount_total_jpy: 5000,
    paid_amount_jpy: null as any,
  });
  const nullResult = computePaymentState(nullPaidReservation);
  assert.strictEqual(nullResult.statusTag, 'unpaid');
  assert.strictEqual(nullResult.paid, 0);
  assert.strictEqual(nullResult.remaining, 5000);

  // 一部入金状態のテスト
  console.log('  ✓ 一部入金状態のテスト');
  const partialReservation = createMockReservation({
    amount_total_jpy: 10000,
    paid_amount_jpy: 3000,
  });
  const partialResult = computePaymentState(partialReservation);
  assert.strictEqual(partialResult.statusTag, 'partial');
  assert.strictEqual(partialResult.total, 10000);
  assert.strictEqual(partialResult.paid, 3000);
  assert.strictEqual(partialResult.remaining, 7000);
  assert.strictEqual(partialResult.isPaid, false);
  assert.strictEqual(partialResult.shouldShowPaymentUI, true);

  // 支払い済み状態のテスト
  console.log('  ✓ 支払い済み状態のテスト');
  const paidReservation = createMockReservation({
    amount_total_jpy: 10000,
    paid_amount_jpy: 10000,
  });
  const paidResult = computePaymentState(paidReservation);
  assert.strictEqual(paidResult.statusTag, 'paid');
  assert.strictEqual(paidResult.total, 10000);
  assert.strictEqual(paidResult.paid, 10000);
  assert.strictEqual(paidResult.remaining, 0);
  assert.strictEqual(paidResult.isPaid, true);
  assert.strictEqual(paidResult.shouldShowPaymentUI, true);

  // 過払いのテスト
  const overpaidReservation = createMockReservation({
    amount_total_jpy: 10000,
    paid_amount_jpy: 12000,
  });
  const overpaidResult = computePaymentState(overpaidReservation);
  assert.strictEqual(overpaidResult.statusTag, 'paid');
  assert.strictEqual(overpaidResult.remaining, 0);
  assert.strictEqual(overpaidResult.isPaid, true);

  // キャンセル済み状態のテスト
  console.log('  ✓ キャンセル済み状態のテスト');
  const canceledReservation = createMockReservation({
    status: 'canceled',
    amount_total_jpy: 10000,
    paid_amount_jpy: 0,
  });
  const canceledResult = computePaymentState(canceledReservation);
  assert.strictEqual(canceledResult.statusTag, 'canceled');
  assert.strictEqual(canceledResult.shouldShowPaymentUI, false);
  assert.strictEqual(canceledResult.isPaid, false);

  // キャンセル済み（一部入金）のテスト
  const canceledPartialReservation = createMockReservation({
    status: 'canceled',
    amount_total_jpy: 10000,
    paid_amount_jpy: 3000,
  });
  const canceledPartialResult = computePaymentState(canceledPartialReservation);
  assert.strictEqual(canceledPartialResult.statusTag, 'canceled');
  assert.strictEqual(canceledPartialResult.shouldShowPaymentUI, false);
  assert.strictEqual(canceledPartialResult.remaining, 7000);

  // エッジケースのテスト
  console.log('  ✓ エッジケースのテスト');
  const zeroAmountReservation = createMockReservation({
    amount_total_jpy: 0,
    paid_amount_jpy: 0,
  });
  const zeroResult = computePaymentState(zeroAmountReservation);
  assert.strictEqual(zeroResult.statusTag, 'unpaid');
  assert.strictEqual(zeroResult.total, 0);
  assert.strictEqual(zeroResult.remaining, 0);

  console.log('✅ すべてのテストが成功しました！');
}

// テストを実行（このファイルが直接実行された場合）
if (require.main === module) {
  runTests();
}

export { runTests };