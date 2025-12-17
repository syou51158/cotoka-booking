# UI Implementation Checklist (TODO)

This list is for the implementation team (TRAE) to execute the UI/UX Phase.

## 1. Architecture & Layout
- [ ] **Refactor Layouts**: Ensure `/admin` uses a shared AdminLayout with the new header design.
- [ ] **Create Staff Layout**: Create a separate layout for `/staff` (or `/employee`) optimized for mobile (hide admin sidebars).

## 2. Admin Dashboard (`/admin/dashboard`)
- [ ] **New Component**: `KPIGrid` - Create 4-col grid for top-level metrics.
- [ ] **Refactor**: Move `RealtimeStaffStatus` to the left column of the main content area.
- [ ] **New Component**: `UpcomingReservationsList` - Simple table/list view for "Today's Flow".
- [ ] **Clean Up**: Remove the old "Summary Cards" if they duplicate `KPIGrid` data.

## 3. Reservation Ledger (`/admin/reservations`)
- [ ] **Component Update**: `AdminReservationTimetable`
    - [ ] Add "Long Press" logic for mobile drag-and-drop.
    - [ ] Increase slot height/width for better touch targets.
- [ ] **New Component**: `ReservationDrawer` (Side Panel).
    - [ ] Move content from `ReservationDetails.tsx` (details/summary) into this Drawer.
    - [ ] Add explicit "Save" and "Close" buttons.
- [ ] **Filter UI**: Move filters to a sticky top bar.

## 4. Staff Portal (`/staff`)
- [ ] **New Page**: Create `/staff/dashboard` (or reuse `/employee`).
- [ ] **UI Polish**: `TimeCard`
    - [ ] Style the "Clock In" buttons to be large and touch-friendly (Hero UI).
    - [ ] Add "Today's Reservations" list below the clock-in controls.
- [ ] **UI Polish**: `RewardReportModal`
    - [ ] Optimize for mobile width.
    - [ ] Add "Quick Chips" for common notes if possible.

## 5. Review & Polish
- [ ] **Dark Mode Check**: Ensure all new cards/panels look correct in `slate-950` theme.
- [ ] **Mobile Check**: Verify all Admin pages are at least *viewable* on mobile, and Staff pages are *excellent* on mobile.
