# Staff Portal UI Design (`/staff` or `/employee`)

## 1. Concept & Philosophy
**"Mobile First, Thumb Driven"**
- Staff members are standing, holding a phone in one hand.
- **Key Goal**: Clock in/out and Report Sales in < 5 seconds.
- **Authentication**: Long-lived sessions. No repeated logins.

## 2. Navigation Structure
- **Global Tab Bar (Bottom)**:
    1.  **Today** (Home)
    2.  **History** (Earnings/Attendance)
    3.  **Profile** (Settings)

## 3. Screen: "Today" (Home)

### A. Header (Personalized)
- "Good Morning, [Name]".
- **Status Badge**: "OFF" (Grey) or "WORKING" (Green Pulse).

### B. The "Big Button" (Action Area)
- **State: OFF** -> Giant Circle Button "CLOCK IN".
- **State: WORKING** -> Two Buttons:
    - Primary: "START BREAK" (Coffee Icon).
    - Secondary: "CLOCK OUT" (Door Icon).
- **State: BREAK** -> "END BREAK" (Play Icon).

### C. "My Tasks" (Below Buttons)
- List of **Today's Reservations** assigned to me.
- **Card**:
    - `14:00` Customer Name
    - **Action**: "REPORT" (Checkmark Icon).
    - *If Reported*: Show "Done" badge.

## 4. Screen: Reward Reporting (The "LINE" Replacement)
**Context**: User clicks "REPORT" on a reservation.

### Step-by-Step UI (Wizard or Single Form)
1.  **Sales Check**:
    - "Amount: ¥9,800" (Auto-filled from reservation).
    - [Edit] button if adjustment needed.
2.  **Options** (Toggle Chips):
    - [ ] Extension (+10min)
    - [ ] Nomination
    - [ ] Merchandise
3.  **Notes**:
    - Simple textarea: "Client late", "Foreigner", etc.
4.  **Submit**:
    - Large Bottom Button: "SUBMIT REPORT".
    - **Feedback**: Confetti or specific sound effect (Positive reinforcement).

## 5. Screen: History
- **Monthly Graph**: Bar chart of earnings.
- **List**:
    - **Date Header**
    - **Row**: `Time` | `Service` | `¥Reward` | `Status (Draft/Paid)`
- **Detailed View**: Click row to see calculation logic ("Why is this ¥3,000?").
