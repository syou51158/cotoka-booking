import React from "react";
import { formatInTimeZone } from "date-fns-tz";

interface AvailableSlot {
  start: string; // ISO string in Asia/Tokyo
  end: string; // ISO string in Asia/Tokyo
  staffId: string;
  status?: "available" | "hold"; // hold = someone is currently paying
  holdExpiresAt?: string; // ISO string when hold expires
}

interface SlotDisplayProps {
  slots: AvailableSlot[];
  onSlotSelect: (slot: AvailableSlot) => void;
}

export const SlotDisplay: React.FC<SlotDisplayProps> = ({
  slots,
  onSlotSelect,
}) => {
  const formatTime = (isoString: string) => {
    return formatInTimeZone(new Date(isoString), "Asia/Tokyo", "HH:mm");
  };

  const formatHoldExpiry = (isoString: string) => {
    const expiryTime = new Date(isoString);
    const now = new Date();
    const minutesLeft = Math.ceil(
      (expiryTime.getTime() - now.getTime()) / (1000 * 60),
    );
    return minutesLeft > 0 ? `${minutesLeft}分後` : "期限切れ";
  };

  return (
    <div className="slot-grid">
      {slots.map((slot, index) => {
        const isHold = slot.status === "hold";
        const isExpired =
          slot.holdExpiresAt && new Date(slot.holdExpiresAt) <= new Date();

        return (
          <div
            key={`${slot.staffId}-${slot.start}-${index}`}
            className={`slot-item ${isHold ? "slot-hold" : "slot-available"} ${isExpired ? "slot-expired" : ""}`}
            onClick={() => !isHold && onSlotSelect(slot)}
          >
            <div className="slot-time">
              {formatTime(slot.start)} - {formatTime(slot.end)}
            </div>

            {isHold && slot.holdExpiresAt && (
              <div className="slot-hold-info">
                <div className="hold-status">💳 お支払い中</div>
                <div className="hold-expiry">
                  {formatHoldExpiry(slot.holdExpiresAt)}に解放
                </div>
              </div>
            )}

            {!isHold && <div className="slot-available-info">✅ 予約可能</div>}
          </div>
        );
      })}
    </div>
  );
};

// CSS例（Tailwind CSS使用）
export const slotStyles = `
.slot-grid {
  @apply grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3;
}

.slot-item {
  @apply p-3 rounded-lg border-2 cursor-pointer transition-all duration-200;
}

.slot-available {
  @apply border-green-300 bg-green-50 hover:border-green-500 hover:bg-green-100;
}

.slot-hold {
  @apply border-orange-300 bg-orange-50 cursor-not-allowed opacity-75;
}

.slot-expired {
  @apply border-gray-300 bg-gray-50 cursor-pointer;
}

.slot-time {
  @apply font-semibold text-gray-800 mb-2;
}

.slot-hold-info {
  @apply text-sm;
}

.hold-status {
  @apply text-orange-600 font-medium;
}

.hold-expiry {
  @apply text-orange-500 text-xs mt-1;
}

.slot-available-info {
  @apply text-green-600 text-sm font-medium;
}
`;

// 使用例
export const ExampleUsage: React.FC = () => {
  const exampleSlots: AvailableSlot[] = [
    {
      start: "2025-10-30T10:00:00+09:00",
      end: "2025-10-30T10:15:00+09:00",
      staffId: "3ffa639b-a0b1-4ae3-80cf-bbeaa4c01a2b",
      status: "available",
    },
    {
      start: "2025-10-30T10:05:00+09:00",
      end: "2025-10-30T10:20:00+09:00",
      staffId: "3ffa639b-a0b1-4ae3-80cf-bbeaa4c01a2b",
      status: "hold",
      holdExpiresAt: "2025-10-30T06:50:37+00:00",
    },
    {
      start: "2025-10-30T10:15:00+09:00",
      end: "2025-10-30T10:30:00+09:00",
      staffId: "3ffa639b-a0b1-4ae3-80cf-bbeaa4c01a2b",
      status: "available",
    },
  ];

  const handleSlotSelect = (slot: AvailableSlot) => {
    console.log("Selected slot:", slot);
    // 予約処理へ進む
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">予約可能時間</h2>
      <SlotDisplay slots={exampleSlots} onSlotSelect={handleSlotSelect} />

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">表示説明</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>
            ✅ <strong>予約可能</strong>: クリックして予約できます
          </li>
          <li>
            💳 <strong>お支払い中</strong>:
            他の方が決済中のため一時的に予約できません
          </li>
          <li>
            ⏰ <strong>解放時間</strong>:
            決済が完了しない場合、表示時間に再度予約可能になります
          </li>
        </ul>
      </div>
    </div>
  );
};
