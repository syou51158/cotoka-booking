# Reservation Ledger UI Design (`/admin/reservations`)

## 1. Concept & Philosophy
**"The Controller's Workbench"**
- A dense, functional tool for manipulating the schedule. Precision is key.
- **Visual Style**: Clean lines, subtle grid, distinct colors for status. Less "flashy" than the dashboard, more utility-focused.

## 2. Layout Structure

### A. Control Bar (Sticky Top)
- **Top Row**: Date Navigation (`< [Date Picker] >`).
- **Bottom Row**: Filters & Actions.
    - **Filters**: Staff (Dropdown), Status (Pills: All/Active/Pending).
    - **Actions**: "New Reservation (+)", "CSV Export".
    - **View Switch**: Day / Week (Future) / List.

### B. Main Timeline (The Board)
- **Horizontal Scroll**: Infinite or snappy day-based scrolling.
- **Vertical Axis**: Time (Open -> Close).
- **Horizontal Axis**: Staff Columns.
- **Grid Density**: 15min slots should be ~40px high on Desktop for legibility.

### C. Reservation Block Design
- **Base**: Rounded rectangle, 2px border-left (Status Color).
- **Content**:
    - **Line 1 (Bold)**: Time range + Customer Name.
    - **Line 2**: Service Name (Truncated).
    - **Icons**: "Unpaid" (¥), "Note" (Memo icon), "New" (Sparkle).
- **Colors**:
    - *Confirmed*: Slate/Blue background, Solid Blue border.
    - *Pending*: Striped/Hatched background pattern (to indicate instability).
    - *Completed*: Dimmed/Desaturated.
    - *Walking-In*: Unique High-Vis Color (e.g., Purple).

## 3. Interaction Improvements

### Drag & Drop Safety
- **Hold-to-Move**: Require a 0.5s "Long Press" (or specific handle click) to unlock dragging. Prevents accidental slips.
- **Ghosting**: Show the original slot clearly while dragging the shadow.
- **Snap**: Magnetic snap to 15min grid.

### Mobile Optimization ("The Pivot")
- **Problem**: Dragging on mobile is terrible.
- **Solution**:
    - **Tap**: Opens a "Quick Menu" Bottom Sheet.
    - **Menu Options**: "Edit Time", "Change Status", "View Details".
    - **Edit Time**: Opens a drum-roll picker or simple "Start/End" input manual entry, instead of drag-handle.

## 4. Side Panel (Detail View)
- Instead of `<details>`, use a **Slide-over Panel** (Drawer) from the right.
- **Unpaid Flag**: Large sticky footer in the Drawer: "Total: ¥10,000 - [Pay Now]".
- **History Log**: Show "Who changed what" at the bottom of the drawer.
