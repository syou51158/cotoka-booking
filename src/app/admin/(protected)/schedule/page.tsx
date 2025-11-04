import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">営業設定</h1>
        <p className="text-sm text-slate-400">
          営業時間、休業日、スタッフシフト、予約スロット間隔を管理します。
        </p>
      </div>

      <Card className="border-slate-800 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="text-base text-slate-200">
            予約スロット設定（全体）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={updateSiteSettingsAction}
            className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4"
          >
            <div className="space-y-1">
              <Label
                htmlFor="default-slot-interval"
                className="text-xs text-slate-300"
              >
                標準のスロット間隔（分）
              </Label>
              <Input
                id="default-slot-interval"
                name="default_slot_interval_min"
                type="number"
                min={1}
                defaultValue={siteSettings?.default_slot_interval_min ?? 15}
                className="bg-slate-900/80 text-slate-100"
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="border-slate-700 text-slate-200"
              >
                保存
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="text-base text-slate-200">
            曜日別営業時間
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {WEEKDAY_LABELS.map((label, index) => {
            const weekday = index; // PostgreSQL: 0 = Sunday
            const item = openingHours.find(
              (hour) => hour.weekday === weekday,
            ) ?? {
              weekday,
              open_at: "10:00",
              close_at: "20:00",
              is_open: true,
            };

            return (
              <form
                key={label}
                action={upsertOpeningHourAction}
                className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4"
              >
                <input type="hidden" name="weekday" value={weekday} />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200">
                    {label}曜日
                  </span>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Label htmlFor={`open-${weekday}`}>OPEN</Label>
                    <Input
                      id={`open-${weekday}`}
                      name="open_at"
                      type="time"
                      defaultValue={item.open_at}
                      className="bg-slate-900/80 text-slate-100"
                    />
                    <Label htmlFor={`close-${weekday}`}>CLOSE</Label>
                    <Input
                      id={`close-${weekday}`}
                      name="close_at"
                      type="time"
                      defaultValue={item.close_at}
                      className="bg-slate-900/80 text-slate-100"
                    />
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`open-enabled-${weekday}`}
                        name="is_open"
                        defaultChecked={item.is_open}
                      />
                      <Label htmlFor={`open-enabled-${weekday}`}>営業</Label>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    className="border-slate-700 text-slate-200"
                  >
                    保存
                  </Button>
                </div>
              </form>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="text-base text-slate-200">
            休業日・特別営業
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            action={upsertDateOverrideAction}
            className="grid gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4 md:grid-cols-4"
          >
            <div className="space-y-1">
              <Label htmlFor="override-date" className="text-xs text-slate-300">
                日付
              </Label>
              <Input
                id="override-date"
                name="date"
                type="date"
                required
                className="bg-slate-900/80 text-slate-100"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="override-open" className="text-xs text-slate-300">
                OPEN（任意）
              </Label>
              <Input
                id="override-open"
                name="open_at"
                type="time"
                className="bg-slate-900/80 text-slate-100"
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="override-close"
                className="text-xs text-slate-300"
              >
                CLOSE（任意）
              </Label>
              <Input
                id="override-close"
                name="close_at"
                type="time"
                className="bg-slate-900/80 text-slate-100"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="override-note" className="text-xs text-slate-300">
                メモ（任意）
              </Label>
              <Input
                id="override-note"
                name="note"
                type="text"
                className="bg-slate-900/80 text-slate-100"
              />
            </div>
            <div className="col-span-full flex justify-end">
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="border-slate-700 text-slate-200"
              >
                追加
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            {overrides.length === 0 ? (
              <p className="text-xs text-slate-500">設定なし</p>
            ) : (
              overrides.map((override) => (
                <form
                  key={override.id}
                  action={deleteDateOverrideAction}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 p-4"
                >
                  <input type="hidden" name="id" value={override.id} />
                  <div>
                    <span className="font-medium text-slate-100">
                      {override.date}
                    </span>
                    <span className="ml-2 text-xs text-slate-400">
                      {override.is_open
                        ? `${override.open_at ?? "未設定"} - ${override.close_at ?? "未設定"}`
                        : "休業"}
                    </span>
                    {override.note ? (
                      <span className="ml-2 text-xs text-slate-500">
                        {override.note}
                      </span>
                    ) : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-300 hover:bg-red-500/10"
                  >
                    削除
                  </Button>
                </form>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="text-base text-slate-200">
            スタッフシフト
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            action={upsertShiftAction}
            className="grid gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4 md:grid-cols-5"
          >
            <div className="space-y-1">
              <Label htmlFor="shift-staff" className="text-xs text-slate-300">
                スタッフ
              </Label>
              <select
                id="shift-staff"
                name="staff_id"
                className="h-10 w-full rounded border border-slate-800 bg-slate-900/80 px-2 text-sm text-slate-100"
              >
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.display_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="shift-start" className="text-xs text-slate-300">
                開始
              </Label>
              <Input
                id="shift-start"
                name="start_at"
                type="datetime-local"
                required
                className="bg-slate-900/80 text-slate-100"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="shift-end" className="text-xs text-slate-300">
                終了
              </Label>
              <Input
                id="shift-end"
                name="end_at"
                type="datetime-local"
                required
                className="bg-slate-900/80 text-slate-100"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="shift-note" className="text-xs text-slate-300">
                メモ
              </Label>
              <Textarea
                id="shift-note"
                name="note"
                rows={1}
                className="bg-slate-900/80 text-slate-100"
              />
            </div>
            <div className="col-span-full flex justify-end">
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="border-slate-700 text-slate-200"
              >
                追加
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            {shifts.length === 0 ? (
              <p className="text-xs text-slate-500">設定なし</p>
            ) : (
              shifts.map((shift) => (
                <form
                  key={shift.id}
                  action={deleteShiftAction}
                  className="grid grid-cols-1 items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-4 md:grid-cols-4"
                >
                  <input type="hidden" name="id" value={shift.id} />
                  <div className="text-sm">
                    <span className="text-slate-200">
                      {staff.find((s) => s.id === shift.staff_id)
                        ?.display_name ?? "?"}
                    </span>
                  </div>
                  <div className="text-sm text-slate-300">
                    {format(new Date(shift.start_at), "M/d(EEE) HH:mm", {
                      locale: ja,
                    })}{" "}
                    -{" "}
                    {format(new Date(shift.end_at), "M/d(EEE) HH:mm", {
                      locale: ja,
                    })}
                  </div>
                  <div className="text-xs text-slate-500">
                    {shift.note ?? ""}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-300 hover:bg-red-500/10"
                    >
                      削除
                    </Button>
                  </div>
                </form>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="text-base text-slate-200">
            メニュー別スロット間隔
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {services.length === 0 ? (
            <p className="text-xs text-slate-500">サービスがありません</p>
          ) : (
            services.map((service) => (
              <form
                key={service.id}
                action={updateServiceSlotIntervalAction}
                className="grid grid-cols-1 items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-4 md:grid-cols-4"
              >
                <input type="hidden" name="service_id" value={service.id} />
                <div className="text-sm font-medium text-slate-200">
                  {service.name}
                </div>
                <div className="text-xs text-slate-400">
                  {service.duration_min}分 / ¥{service.price_jpy}
                </div>
                <div>
                  <Input
                    name="slot_interval_min"
                    type="number"
                    min={1}
                    defaultValue={(service as any).slot_interval_min ?? ""}
                    placeholder="未設定（全体設定を利用）"
                    className="bg-slate-900/80 text-slate-100"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    className="border-slate-700 text-slate-200"
                  >
                    保存
                  </Button>
                </div>
              </form>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="text-base text-slate-200">
            スタッフ別スロット間隔
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {staff.length === 0 ? (
            <p className="text-xs text-slate-500">スタッフがいません</p>
          ) : (
            staff.map((member) => (
              <form
                key={member.id}
                action={updateStaffSlotIntervalAction}
                className="grid grid-cols-1 items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-4 md:grid-cols-4"
              >
                <input type="hidden" name="staff_id" value={member.id} />
                <div className="text-sm font-medium text-slate-200">
                  {member.display_name}
                </div>
                <div className="text-xs text-slate-400">
                  {member.email ?? ""}
                </div>
                <div>
                  <Input
                    name="slot_interval_min"
                    type="number"
                    min={1}
                    defaultValue={(member as any).slot_interval_min ?? ""}
                    placeholder="未設定（サービス/全体設定を利用）"
                    className="bg-slate-900/80 text-slate-100"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    className="border-slate-700 text-slate-200"
                  >
                    保存
                  </Button>
                </div>
              </form>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
