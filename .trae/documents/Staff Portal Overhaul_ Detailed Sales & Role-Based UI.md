# Comprehensive Staff Portal Overhaul Plan

This plan addresses your request to move from "daily overwrite" reporting to "detailed individual transaction" reporting, and to implement role-based views for the Time Card system.

## 1. Database Engineering (Schema Updates)
We need to introduce granularity to the sales data.

### New Table: `sales_transactions`
Instead of just one number per day, we will store every single service.
- `id`: UUID (Primary Key)
- `staff_id`: UUID (Foreign Key to Staff)
- `date`: Date (The business day)
- `customer_gender`: Text (Optional, for analytics)
- `service_details`: Text (What menu/service was performed)
- `amount`: Integer (Price)
- `notes`: Text (Specific customer notes)
- `created_at`: Timestamp

### Updates to `sales_entries` (Daily Report)
- This table will remain as the "Summary" table.
- When a staff member hits "Submit Daily Report", it will calculate the total from `sales_transactions` and lock them.

## 2. Sales Reporting UI Overhaul (`/staff`)
We will transform the "Sales Report" tab into a "Daily Transaction Log".

### New Features:
1.  **Transaction Entry Form:**
    - A quick form to add *one* customer interaction.
    - Fields: Service Name, Amount, Customer Notes.
    - Button: "Add Record" (Save immediately to `sales_transactions`).
2.  **Real-time Dashboard:**
    - Shows a list of "Today's Customers" below the form.
    - Shows a running total (e.g., "Current Total: ¥45,000").
3.  **End-of-Day Submission:**
    - A "Close Day & Submit Report" button.
    - This creates the final Daily Report entry and prevents further editing of that day's transactions.

## 3. Role-Based Attendance System
We will utilize the `app_role` enum (`employee`, `contractor`, `admin`) found in your database.

### Logic:
- **Fetch Role:** On page load, check if the user is `employee` or `contractor`.

### UI Variations:
1.  **For Employees (`employee`):**
    - **Display:** "Time Card" (Standard).
    - **Actions:** "Clock In" (出勤), "Clock Out" (退勤), "Break" (休憩).
    - **Legal:** Compliant with labor time tracking.

2.  **For Contractors (`contractor` - 業務委託):**
    - **Display:** "Activity Log" (業務活動記録) or "Availability" (稼働状況).
    - **Actions:** "Start Online" (業務開始), "Finish" (業務終了).
    - **Style:** Different color scheme (e.g., Blue/Teal instead of Employee Green) to visually distinguish it.
    - **Legal Safety:** Avoids "Clock In" terminology to reduce employment misclassification risks.

## 4. History & Admin Enhancements
- **Staff History:** When viewing past reports, staff can click a day to expand and see the *list of customers* they served that day, not just the total money.
- **Admin Panel:** Admins will be able to see the breakdown of services per staff member.

## Execution Steps
1.  **Migration:** Create `sales_transactions` table via SQL.
2.  **Backend:** Create API routes for adding/deleting transactions.
3.  **Frontend:** Rebuild `DailySalesForm` to support the new "Add + List" flow.
4.  **Frontend:** Update `TimeCard` component to render conditionally based on `staff.role`.
