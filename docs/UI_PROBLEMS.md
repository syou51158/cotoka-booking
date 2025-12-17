# UI Implementation Problems & Improvement Analysis

## 1. General Observations
- **Visual Consistency**: The current UI uses a mix of raw Tailwind classes and Shadcn components, but some areas feel "heavy" with dark mode defaults (slate-900/950).
- **Mobile Experience**: Many components (especially `AdminReservationTimetable`) are optimized for desktop (drag & drop, broad tables) and likely hard to use on touch devices.

## 2. Admin Dashboard (`/admin/dashboard`)
- **Information Overload**:
    - The new "Dashboard" view (if separate) needs to be distinct from the "Ledger". Currently, `page.tsx` seems to mix them or redirect.
    - `RealtimeStaffStatus` is a good start but takes up vertical space that could be used for KPIs.
- **Navigation**:
    - Filters are visible but might clutter the top area if not collapsible.
    - Jumping between days requires multiple clicks or text input (date picker is improved but day-by-day nav is basic).

## 3. Reservation Ledger (`/admin/reservations`)
- **Usability**:
    - `AdminReservationTimetable.tsx` implements complex drag-and-drop which is:
        1.  **Risky**: Easy to accidentally move a reservation.
        2.  **Unintuitive**: "Resize top/bottom" hit areas are small (8px).
    - **Visual Clutter**: Overlapping logic (`resolveOverlap`) creates thin slivers that are hard to read.
- **Detail View**:
    - The `<details>` / `<summary>` implementation for Reservation Details is functional but clunky. Opening multiple rows expands the page vertically, making it hard to compare times.
    - **Actions**: "Cancel" and "Save Note" buttons are hidden inside the detail expansion.

## 4. Staff Portal (Contractor / Employee)
- **Undefined Path**:
    - The layout and entry point for staff (Contractor vs Employee) are not clearly differentiated in the directory structure yet (likely under-construction).
- **Time Card UX**:
    - `TimeCard` component is functional but bare-bones. It lacks a "history" view right on the main screen (user has to scroll or it's hidden).
- **Reward Reporting**:
    - Contractors (LINE migration) need a flow that mimics the simplicity of sending a message. Current `RewardReportModal` is a standard form. Ideally, this should be a "One-Thumb" mobile flow.

## 5. Summary of Key Issues
1.  **Desktop-Centricity**: Shifts and block modifications rely on mouse pointers.
2.  **Safety**: Drag-and-drop on the timetable lacks "Undo" or sufficient friction against accidental moves (despite the confirm dialog).
3.  **Visual Hierarchy**: Status badges (Paid, Pending, etc.) are small and compete with other text.
