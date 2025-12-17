# Admin Dashboard UI Design (`/admin/dashboard`)

## 1. Concept & Philosophy
**"The Captain's Bridge"**
- A high-level overview screen that allows the admin to assess the "health" of the day in 3 seconds.
- **Visual Style**: Dark, sleek, minimal. High contrast for KPIs (Green = Good, Amber = Attention).
- **No Scrolling**: Ideally, all critical real-time info fits "above the fold" on a standard laptop screen.

## 2. Layout Structure

### A. Header / Navigation
- **Left**: "Cotoka Admin" Logo.
- **Right**: User Profile, "Switch to Ledger" button (prominent).
- **Bottom border**: Subtle, 1px slate-800.

### B. Top Area: KPI Cards (4 cols)
1.  **Sales Today**: `¥XX,XXX` (vs Yesterday or Target). Click -> `/admin/sales` (future) or Scroll to list.
2.  **Reservations**: `X` bookings (Y unconfirmed). Click -> `/admin/reservations`.
3.  **Active Staff**: `X` Working / `Y` Break. Click -> Focus on Realtime Widget.
4.  **Pending Actions**: `X` Unpaid / `Y` Draft Reports. (Red/Amber indicator).

### C. Main Content Grid (2:1 Ratio)

#### Left Column (Focus: "Now & Next")
**Realtime Staff Status (Expanded)**
- **Header**: "Current Staff Status"
- **List Item Design**:
    - **Avatar**: Circle, Staff color ring if working.
    - **Name & Status Badge**: Large text.
    - **Time Info**: "Clocked in at 10:00" / "Break for 15m".
    - **Action**: Small "Msg" or "Call" icon (if applicable) or "Force Clock Out" (Admin override, hidden in menu).
- **Zero State**: "No staff currently active."

#### Right Column (Focus: "The Flow")
**Upcoming Reservations (List View)**
- **Header**: "Coming Up Next"
- **Format**: Simple list, *distinct* from the complex Timeline.
    - `14:00` **Customer Name** (Service Name)
    - `Status`: e.g., "Arriving soon" or "Confimed".
- **Interaction**: Click row opens a **Modal** (not a page jump) with Reservation Details.

## 3. Interaction Details
- **Hover Effects**: Slight lift (transform: translateY(-2px)) on KPI cards.
- **Refresh**: Auto-refresh every 60s for Realtime Widget (with visible countdown or "Live" dot).
- **Mobile Responsive**: On mobile, stack vertically. KPI cards become a horizontal swipe carousel.
