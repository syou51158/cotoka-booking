# Cotoka SPA Admin - System Design & Specification (Phase 1 & 2)

## 1. Role Capabilities & Flow

### Admin
**Capabilities:**
- **Dashboard**: View real-time staff status (Working/Break/Off), daily/weekly sales summary, and attendance aggregation.
- **Reservation Management**: View daily timetable, edit reservation status, manage payments (partial/full).
- **Staff Management**: Manage commission rules (`commission_rules`), shifts, and roles.
- **Reports**: Export CSV data for reservations and rewards.

**Flow:**
`Login` -> `Admin Dashboard ((protected)/page.tsx)` -> `Timetable / Realtime Status`

### Employee
**Capabilities:**
- **Attendance**: Clock In/Out, Start/End Break via Time Card UI.
- **Self-Check**: View own daily attendance summary.

**Flow:**
`Login` -> `Employee Portal` -> `Time Card ((protected)/employee/page.tsx)` -> `Action (Clock In/Out)`

### Contractor
**Capabilities:**
- **Reward Reporting**: Report completion of treatments to calculate rewards matching `commission_rules`.
- **History**: View historical reward records and their status (Draft/Approved/Paid).
- **Draft Management**: Update report details (sales amount, notes) while in `draft` status.

**Flow:**
`Login` -> `Contractor Portal` -> `Reward Timeline` -> `Report Modal (on Reservation)`

---

## 2. Database Schema Overview

| Table | Role | Key Enhancements (TRAE & Current) |
| :--- | :--- | :--- |
| **reservations** | Core booking data | `status` (added 'completed'), `staff_id` linked. |
| **attendance_records** | Staff time tracking | `break_minutes`, `last_break_start_at` (for accurate duration), `status` (working/break/clocked_out). |
| **treatment_rewards** | Calculated commissions | `status` (draft/approved/paid), `calc_source` (audit trail of rule used), `commission_rate`, `reward_amount_jpy`. |
| **commission_rules** | Logic configuration | `staff_id`, `service_id` (nullable for default), `rate_type` (fixed/%), `active` flag. |
| **staff** | Staff profiles | `role`, `user_id` (Auth linkage), `color` (for UI). |

---

## 3. Simplified OpenAPI Specification

### Contractor Rewards API
**Base URL**: `/api/contractor/rewards`

| Method | Endpoint | Description | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | List own rewards | - | `TreatmentReward[]` |
| `POST` | `/` | Create/Update Report | `{ reservationId: string, totalSales?: number, note?: string }` | `TreatmentReward` (200) |

### Employee Attendance API
**Base URL**: `/api/attendance` & `/api/employee/attendance`

| Method | Endpoint | Description | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/employee/attendance` | Get current status | - | `{ status: "working"\|... , ...record }` |
| `POST` | `/api/attendance/[action]` | Perform Action | `{}` | `AttendanceRecord` |

**Actions (`[action]`)**:
- `clock_in`: Start work (Error if already started).
- `clock_out`: End work (Calculates totals).
- `break_start`: Enter break (Sets `last_break_start_at`).
- `break_end`: Exit break (Adds diff to `break_minutes`).

### Admin Dashboard API
**Base URL**: `/api/admin/dashboard`

| Method | Endpoint | Description | Query Params | Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/realtime` | Staff status list | - | `[{ staff, attendance: { status, ... } }, ...]` |
| `GET` | `/summary` | Aggregated stats | `from`, `to` | `{ sales, rewards, attendance }` |

---

## 4. Business Rules & Logic

### Commission Calculation Logic
**Source**: `src/server/rewards.ts` -> `calculateCommission`
1.  **Fetch Active Rules**: Query `commission_rules` for the staff, order by `created_at` DESC.
2.  **Match Priority**:
    *   **Priority 1**: Rule with matching `service_id`.
    *   **Priority 2**: Rule with `service_id IS NULL` (Default rule).
3.  **Calculation**:
    *   `fixed`: Reward = `rate_value`.
    *   `percentage`: Reward = `floor(totalSales * (rate_value / 100))`.
4.  **Fallback**: If no rule found, Reward = 0.

### Attendance State Machine
**Source**: `src/server/attendance.ts`
*   `null` (Not Started) --(clock_in)--> `working`
*   `working` --(break_start)--> `break`
*   `break` --(break_end)--> `working` (Accumulates `break_minutes`)
*   `working` --(clock_out)--> `clocked_out`

**Break Calculation**:
*   On `break_end`: `break_minutes += differenceInMinutes(now, last_break_start_at)`.
*   On `clock_out`: If status was `break`, auto-end break first and then clock out.

---

## 5. Test Cases (Key Use Cases)

| Use Case | Input / Action | Expected Result | Error Case |
| :--- | :--- | :--- | :--- |
| **Contractor Report** | POST report for Reservation A (Sales ¥10,000) | Reward created (Draft), Status `completed` (optional), Reward = ¥10,000 * Rate. | Reservation already completed/canceled. |
| **Contractor Re-calc** | POST report again with Note update | Update existing Draft record. | Status is already `approved` (400 Error). |
| **Employee Break** | Action `break_start` | Status `break`, `last_break_start_at` set. | Already on break or clocked out. |
| **Employee Resume** | Action `break_end` (after 30m) | Status `working`, `break_minutes` += 30. | Not on break. |
| **Admin Monitor** | Load Dashboard | Table shows Staff A as "Break", Staff B as "Working". | - |

---

## 6. Priority Task List for TRAE

This list guides the next steps for finalizing the implementation.

- [ ] **DB Migration Check**: Ensure `01_enhance_rewards_attendance.sql` is applied to the target environment.
- [ ] **Admin UI**:
    - [ ] `DashboardSummary` component needs to be created or integrated if keeping old summary cards.
    - [ ] Add "Approve" button for Admin to change Reward status from `draft` -> `approved`.
- [ ] **Contractor UI**:
    - [ ] Verify `RewardReportModal` opens correctly from the timeline or reservation list.
    - [ ] UI for "Draft" vs "Approved" visual distinction is implemented (`RewardTimeline`).
- [ ] **Employee UI**:
    - [ ] Finalize `TimeCard` styling and integration into the layout.
- [ ] **Validation**:
    - [ ] Run `reportTreatmentCompletion` with various `commission_rules` scenarios to verify calculation accuracy.
