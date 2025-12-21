# Plan to Fix Sales Report Error and Enhance Staff Portal UI

## 1. Fix Database Permissions (Critical Bug Fix)
The "Error saving: {}" is likely caused by broken Row Level Security (RLS) policies. The function `get_user_staff_id()` was defined in migration `02` but referenced a column (`user_id`) that was only added in migration `04`. This likely caused the function or policies to fail creation, resulting in a default "deny all" state.

**Action:**
- Create a new migration `05_fix_rls_and_policies.sql` to:
  - Re-define `get_user_staff_id()` correctly (comparing UUIDs).
  - Re-apply RLS policies for `sales_entries`.
  - Ensure staff can insert/update their own records.

## 2. Redesign Staff Portal UI (Futuristic & User-Friendly)
Transform the simple form into a polished, modern dashboard element.

**UI Concept:**
- **Style:** Glassmorphism (translucent backgrounds), large touch-friendly controls, subtle gradients.
- **Gamification/Feedback:** Clear success messages ("Report Sent!"), animations.
- **Accessibility:** Simple labels, large fonts, clear status indicators.

**Components to Update:**
### A. `DailySalesForm` (src/components/staff/daily-sales-form.tsx)
- **Status Indicator:** A prominent status bar showing "Draft" → "Submitted" → "Approved".
- **Input Fields:** Larger inputs with clear Japanese labels and helper text.
- **Action Button:** A large, gradient-colored submit button.
- **Recent History:** A list of the last 3-5 reports below the form for quick reference.

### B. `MonthlySalesChart` (src/components/staff/monthly-sales-chart.tsx)
- **Visuals:** Use gradient colors for bars.
- **Summary:** Display "Total Sales" and "Days Reported" prominently.

### C. `StaffPortalView` (src/app/staff/staff-portal-view.tsx)
- **Layout:** Improve the tab navigation to be more distinct.
- **Header:** Add a friendly greeting (e.g., "Good morning, Akane!").

## 3. Implementation Steps
1.  **Apply Migration:** Run the SQL to fix RLS.
2.  **Update Components:** Rewrite the React components with the new design.
3.  **Verify:** Login as Akane and submit a report to confirm the fix and new UI.
