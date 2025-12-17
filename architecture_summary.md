# Cotoka Booking Architecture Summary (Updated)

本ドキュメントは、報酬計算（Contractor）および勤怠管理（Employee）、管理者ダッシュボード（Admin）の実装統合に伴う、最終的なアーキテクチャ構成をまとめたものです。

## 1. API エンドポイント構成

### 業務委託 (Contractor)
| Method | Path | Description | 内部呼び出し (Service) |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/contractor/rewards` | 報酬履歴の取得 | `rewards.ts` -> `getStaffRewards` |
| `POST` | `/api/contractor/rewards` | 施術報告・報酬計算・保存 | `rewards.ts` -> `reportTreatmentCompletion` |

### 雇用スタッフ (Employee)
| Method | Path | Description | 内部呼び出し (Service) |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/employee/attendance` | 本日の勤怠状況・レコード取得 | `attendance.ts` -> `getTodayAttendance` |
| `POST` | `/api/attendance/[action]` | 打刻アクション実行<br>(`clock_in`, `clock_out`, `break_start`, `break_end`) | `attendance.ts` -> `clockIn`, `clockOut`, `startBreak`, `endBreak` |

### 管理者 (Admin)
| Method | Path | Description | 内部呼び出し (Service) |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/dashboard/summary` | ダッシュボードKPI集計 (売上/報酬/勤怠) | `admin-dashboard.ts` -> `getDashboardSummary` |

---

## 2. サービス層 (Server Actions / Logic)

ビジネスロジックは以下のファイルに集約され、API ルートおよび Server Components から呼び出されます。

- **`src/server/rewards.ts`**
  - `calculateCommission`: `commission_rules` テーブルに基づく報酬計算ロジック（固定/歩合）。
  - `reportTreatmentCompletion`: 予約IDと売上から報酬を計算し、`treatment_rewards` に保存。
  - `getStaffRewards`: スタッフ個人の報酬履歴取得。

- **`src/server/attendance.ts`**
  - `clockIn`, `clockOut`, `startBreak`, `endBreak`: 勤怠ステータス遷移と時間の計算。
  - `getTodayAttendance`: 当日の勤怠レコード取得。

- **`src/server/admin-dashboard.ts`**
  - `getDashboardSummary`: 期間指定での売上・報酬・労働時間の集計。
  - `getRealtimeStaffStatus`: 全スタッフの現在の出勤状況とステータスを取得（ダッシュボード初期表示用）。

---

## 3. UI コンポーネントとデータフロー

### Admin Dashboard (`src/app/admin/(protected)/dashboard/page.tsx`)
- **構成**: 
  - `DashboardSummary` (KPI)
  - `RealtimeStaffStatus` (リアルタイム出勤状況)
  - `TodayReservations` (今日の予約リスト)
- **役割**: 全体の状況を把握するための閲覧専用画面。

### Admin Reservations (`src/app/admin/(protected)/reservations/page.tsx`)
- **構成**: `AdminReservationTimetable` (予約タイムテーブル)
- **役割**: 予約やシフトの調整を行うための作業用画面。
- **機能**: 日付移動、フィルタ、CSV出力。

### Employee TimeCard (`src/components/employee/time-card.tsx`)
- **参照**: `/api/employee/attendance` (GET) で初期状態を表示。
- **更新**: `/api/attendance/[action]` (POST) で打刻し、状態を再取得して更新。

### Contractor Reward Tools
- **`RewardReportModal`**: `/api/contractor/rewards` (POST) を叩き、計算結果を表示・保存。
- **`RewardTimeline`**: `/api/contractor/rewards` (GET) で履歴を表示。

---

## 4. データベース変更 (前提)
`supabase/migrations/01_enhance_rewards_attendance.sql` が適用されていることを前提とします。
- `treatment_rewards` へのカラム追加 (`status`, `calc_source`, `paid_at` 等)
- `commission_rules` テーブル作成
- `attendance_records` へのカラム追加 (`last_break_start_at`)
- 関連する RLS ポリシーの設定
