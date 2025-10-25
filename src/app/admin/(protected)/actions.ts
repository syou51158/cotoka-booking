"use server";

import { revalidatePath } from "next/cache";
import {
  cancelReservation,
  upsertDateOverride,
  upsertOpeningHour,
  upsertShift,
  deleteDateOverride,
  deleteShift,
  updateReservationNotes,
  settleReservationPayment,
  updateSiteSettings,
  updateServiceSlotInterval,
  updateStaffSlotInterval,
} from "@/server/admin";

export async function cancelReservationAction(formData: FormData) {
  const id = formData.get("reservationId");
  const reason = formData.get("reason");
  if (!id || typeof id !== "string") {
    throw new Error("reservationId is required");
  }
  await cancelReservation(
    id,
    typeof reason === "string" && reason ? reason : undefined,
  );
  revalidatePath("/admin");
}

export async function updateReservationNotesAction(formData: FormData) {
  const id = formData.get("reservationId");
  const notes = formData.get("notes");
  if (!id || typeof id !== "string") {
    throw new Error("reservationId is required");
  }

  await updateReservationNotes(
    id,
    typeof notes === "string" ? (notes.length > 0 ? notes : null) : null,
  );
  revalidatePath("/admin");
}

export async function upsertOpeningHourAction(formData: FormData) {
  const weekday = Number(formData.get("weekday"));
  const open_at = (formData.get("open_at") ?? "").toString();
  const close_at = (formData.get("close_at") ?? "").toString();
  const is_open = formData.get("is_open") === "on";
  if (!Number.isInteger(weekday)) {
    throw new Error("weekday is required");
  }
  await upsertOpeningHour({ weekday, open_at, close_at, is_open });
  revalidatePath("/admin/schedule");
}

export async function upsertDateOverrideAction(formData: FormData) {
  const id = formData.get("id");
  const date = (formData.get("date") ?? "").toString();
  const open_at = formData.get("open_at");
  const close_at = formData.get("close_at");
  const is_open = formData.get("is_open") === "on";
  const note = formData.get("note");

  if (!date) {
    throw new Error("date is required");
  }

  await upsertDateOverride({
    id: typeof id === "string" && id.length > 0 ? id : undefined,
    date,
    open_at: open_at ? open_at.toString() : null,
    close_at: close_at ? close_at.toString() : null,
    is_open,
    note: note ? note.toString() : null,
  });

  revalidatePath("/admin/schedule");
}

export async function deleteDateOverrideAction(formData: FormData) {
  const id = formData.get("id");
  if (!id || typeof id !== "string") {
    throw new Error("id is required");
  }
  await deleteDateOverride(id);
  revalidatePath("/admin/schedule");
}

export async function upsertShiftAction(formData: FormData) {
  const staff_id = formData.get("staff_id");
  const start_at = formData.get("start_at");
  const end_at = formData.get("end_at");
  const note = formData.get("note");
  const id = formData.get("id");

  if (!staff_id || !start_at || !end_at) {
    throw new Error("shift payload missing");
  }

  await upsertShift({
    id: typeof id === "string" && id ? id : undefined,
    staff_id: staff_id.toString(),
    start_at: new Date(start_at.toString()).toISOString(),
    end_at: new Date(end_at.toString()).toISOString(),
    note: note ? note.toString() : null,
  });

  revalidatePath("/admin/schedule");
}

export async function deleteShiftAction(formData: FormData) {
  const id = formData.get("id");
  if (!id || typeof id !== "string") {
    throw new Error("id is required");
  }
  await deleteShift(id);
  revalidatePath("/admin/schedule");
}

export async function settleReservationAction(formData: FormData) {
  const id = formData.get("reservationId");
  const method = formData.get("method");
  const amountRaw = formData.get("amount");
  if (!id || typeof id !== "string") {
    throw new Error("reservationId is required");
  }
  if (!method || typeof method !== "string") {
    throw new Error("method is required");
  }
  const amount = amountRaw && typeof amountRaw === "string"
    ? Number(amountRaw)
    : undefined;
  await settleReservationPayment(id, method as any, amount);
  revalidatePath("/admin");
}

export async function updateSiteSettingsAction(formData: FormData) {
  const minRaw = formData.get("default_slot_interval_min");
  const minutes = minRaw && typeof minRaw === "string" ? Number(minRaw) : NaN;
  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw new Error("default_slot_interval_min must be a positive number");
  }
  await updateSiteSettings(minutes);
  revalidatePath("/admin/schedule");
}

export async function updateServiceSlotIntervalAction(formData: FormData) {
  const serviceId = formData.get("service_id");
  const minRaw = formData.get("slot_interval_min");
  if (!serviceId || typeof serviceId !== "string") {
    throw new Error("service_id is required");
  }
  const minutes = typeof minRaw === "string" && minRaw.length > 0
    ? Number(minRaw)
    : null;
  if (typeof minutes === "number" && (!Number.isFinite(minutes) || minutes <= 0)) {
    throw new Error("slot_interval_min must be a positive number");
  }
  await updateServiceSlotInterval(serviceId, minutes);
  revalidatePath("/admin/schedule");
}

export async function updateStaffSlotIntervalAction(formData: FormData) {
  const staffId = formData.get("staff_id");
  const minRaw = formData.get("slot_interval_min");
  if (!staffId || typeof staffId !== "string") {
    throw new Error("staff_id is required");
  }
  const minutes = typeof minRaw === "string" && minRaw.length > 0
    ? Number(minRaw)
    : null;
  if (typeof minutes === "number" && (!Number.isFinite(minutes) || minutes <= 0)) {
    throw new Error("slot_interval_min must be a positive number");
  }
  await updateStaffSlotInterval(staffId, minutes);
  revalidatePath("/admin/schedule");
}
