
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getDateOverrides,
  getOpeningHours,
  getShifts,
  getStaffDirectory,
  getSiteSettings,
} from "@/server/admin";
import { getActiveServices } from "@/server/services";
import {
  deleteDateOverrideAction,
  deleteShiftAction,
  upsertDateOverrideAction,
  upsertOpeningHourAction,
  upsertShiftAction,
  updateSiteSettingsAction,
  updateServiceSlotIntervalAction,
  updateStaffSlotIntervalAction,
} from "../actions";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export default async function AdminSchedulePage() {
  const [openingHours, overrides, staff, shifts, services, siteSettings] =
    await Promise.all([
      getOpeningHours(),
      getDateOverrides(),
      getStaffDirectory(),
      getShifts({ from: new Date().toISOString() }),
      getActiveServices(),
      getSiteSettings(),
    ]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white drop-shadow-md mb-2">
          営業設定
        </h1>
        <p className="text-slate-400">
          営業時間、休業日、スタッフシフト、予約スロット間隔を管理します。
        </p>
      </div>

      {/* Global Slot Settings */}
      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-lg font-bold text-white mb-4">予約スロット設定（全体）</h2>
        <form
          action={updateSiteSettingsAction}
          className="bg-slate-900 rounded-xl border border-slate-700 p-4"
        >
          <div className="flex items-end gap-4">
            <div className="space-y-1 flex-1">
              <Label htmlFor="default-slot-interval" className="text-xs text-slate-400">
                標準のスロット間隔（分）
              </Label>
              <Input
                id="default-slot-interval"
                name="default_slot_interval_min"
                type="number"
                min={1}
                defaultValue={siteSettings?.default_slot_interval_min ?? 15}
                className="bg-black/20 border-white/10 text-white focus:border-primary/50"
              />
            </div>
            <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-white border-0">
              保存
            </Button>
          </div>
        </form>
      </div>

      {/* Opening Hours */}
      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-lg font-bold text-white mb-4">曜日別営業時間</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {WEEKDAY_LABELS.map((label, index) => {
            const weekday = index;
            const item = openingHours.find((hour) => hour.weekday === weekday) ?? {
              weekday,
              open_at: "10:00",
              close_at: "20:00",
              is_open: true,
            };

            return (
              <form
                key={label}
                action={upsertOpeningHourAction}
                className={`p-4 rounded-xl border transition-all ${item.is_open ? 'bg-slate-900 border-slate-700' : 'bg-transparent border-dashed border-slate-800 opacity-60'}`}
              >
                <input type="hidden" name="weekday" value={weekday} />
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    {label}曜日
                    {!item.is_open && <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">休業</span>}
                  </span>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`open-enabled-${weekday}`}
                      name="is_open"
                      defaultChecked={item.is_open}
                      className="border-slate-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <label htmlFor={`open-enabled-${weekday}`} className="text-xs text-slate-400 cursor-pointer select-none">営業有効</label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <Label className="text-[10px] text-slate-500 mb-1 block">OPEN</Label>
                    <Input
                      name="open_at"
                      type="time"
                      defaultValue={item.open_at}
                      className="bg-black/20 border-white/10 text-white h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-500 mb-1 block">CLOSE</Label>
                    <Input
                      name="close_at"
                      type="time"
                      defaultValue={item.close_at}
                      className="bg-black/20 border-white/10 text-white h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" variant="ghost" size="sm" className="h-7 text-xs text-slate-400 hover:text-white hover:bg-white/10">
                    更新
                  </Button>
                </div>
              </form>
            );
          })}
        </div>
      </div>

      {/* Date Overrides */}
      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-lg font-bold text-white mb-4">休業日・特別営業</h2>
        <div className="space-y-6">
          <form
            action={upsertDateOverrideAction}
            className="grid gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl md:grid-cols-4 items-end"
          >
            <div className="space-y-1">
              <Label className="text-xs text-primary/80">日付</Label>
              <Input name="date" type="date" required className="bg-black/40 border-primary/20 text-white focus:border-primary/50" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-primary/80">OPEN</Label>
              <Input name="open_at" type="time" className="bg-black/40 border-primary/20 text-white focus:border-primary/50" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-primary/80">CLOSE</Label>
              <Input name="close_at" type="time" className="bg-black/40 border-primary/20 text-white focus:border-primary/50" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-primary/80">メモ</Label>
              <div className="flex gap-2">
                <Input name="note" type="text" className="bg-black/40 border-primary/20 text-white focus:border-primary/50" />
                <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-white">追加</Button>
              </div>
            </div>
          </form>

          <div className="space-y-2">
            {overrides.length === 0 ? (
              <div className="text-center py-8 text-slate-500 border border-dashed border-white/10 rounded-xl">特別設定はありません</div>
            ) : (
              overrides.map((override) => (
                <form
                  key={override.id}
                  action={deleteDateOverrideAction}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <input type="hidden" name="id" value={override.id} />
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-white bg-black/20 px-2 py-1 rounded text-sm">{override.date}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${override.is_open ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                      {override.is_open ? `${override.open_at} - ${override.close_at}` : "休業"}
                    </span>
                    {override.note && <span className="text-xs text-slate-400 max-w-[200px] truncate">{override.note}</span>}
                  </div>
                  <Button variant="ghost" size="sm" className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0 grid place-content-center">
                    ×
                  </Button>
                </form>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Shifts */}
      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-lg font-bold text-white mb-4">スタッフシフト</h2>
        <div className="space-y-6">
          <form action={upsertShiftAction} className="grid gap-3 p-4 bg-slate-900 border border-slate-700 rounded-xl md:grid-cols-5 items-end">
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">スタッフ</Label>
              <select name="staff_id" className="h-10 w-full rounded border border-white/10 bg-black/20 px-2 text-sm text-white focus:ring-primary focus:border-primary">
                {staff.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">開始</Label>
              <Input name="start_at" type="datetime-local" required className="bg-black/20 border-white/10 text-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">終了</Label>
              <Input name="end_at" type="datetime-local" required className="bg-black/20 border-white/10 text-white" />
            </div>
            <div className="space-y-1 md:col-span-1">
              <Label className="text-xs text-slate-400">メモ</Label>
              <Input name="note" className="bg-black/20 border-white/10 text-white" />
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" className="bg-white/10 hover:bg-white/20 text-white border border-white/10">追加</Button>
            </div>
          </form>

          <div className="space-y-2">
            {shifts.map((shift) => (
              <form key={shift.id} action={deleteShiftAction} className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-700">
                <input type="hidden" name="id" value={shift.id} />
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: staff.find(s => s.id === shift.staff_id)?.color || '#666' }} />
                    <span className="text-white font-medium">{staff.find(s => s.id === shift.staff_id)?.display_name}</span>
                  </div>
                  <span className="text-slate-400">
                    {format(new Date(shift.start_at), "M/d HH:mm")} - {format(new Date(shift.end_at), "HH:mm")}
                  </span>
                </div>
                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0">×</Button>
              </form>
            ))}
          </div>
        </div>
      </div>

      {/* Slot Intervals (Service & Staff) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-white mb-4">メニュー別スロット間隔</h2>
          <div className="space-y-4">
            {services.map((service) => (
              <form key={service.id} action={updateServiceSlotIntervalAction} className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                <input type="hidden" name="service_id" value={service.id} />
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-sm font-medium text-white">{service.name}</div>
                    <div className="text-xs text-slate-400">{service.duration_min}分 / ¥{service.price_jpy}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    name="slot_interval_min"
                    type="number"
                    min={1}
                    defaultValue={(service as any).slot_interval_min ?? ""}
                    placeholder="未設定"
                    className="bg-black/20 border-white/10 text-white h-8 text-xs"
                  />
                  <Button type="submit" size="sm" variant="ghost" className="h-8 text-xs bg-white/5 hover:bg-white/10 text-slate-300">保存</Button>
                </div>
              </form>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-white mb-4">スタッフ別スロット間隔</h2>
          <div className="space-y-4">
            {staff.map((member) => (
              <form key={member.id} action={updateStaffSlotIntervalAction} className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                <input type="hidden" name="staff_id" value={member.id} />
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-sm font-medium text-white">{member.display_name}</div>
                    <div className="text-xs text-slate-400">{member.email}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    name="slot_interval_min"
                    type="number"
                    min={1}
                    defaultValue={(member as any).slot_interval_min ?? ""}
                    placeholder="未設定"
                    className="bg-black/20 border-white/10 text-white h-8 text-xs"
                  />
                  <Button type="submit" size="sm" variant="ghost" className="h-8 text-xs bg-white/5 hover:bg-white/10 text-slate-300">保存</Button>
                </div>
              </form>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
