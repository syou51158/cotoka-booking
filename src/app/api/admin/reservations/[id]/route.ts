import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import type { Database } from "@/types/database";
import { getActiveServices } from "@/server/services";
import { addMinutes } from "date-fns";

async function getReservation(client: any, id: string) {
  const { data, error } = await client
    .from("reservations")
    .select("*, service:service_id(id,name,duration_min,buffer_before_min,buffer_after_min)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as any;
}

function toDate(iso: string) {
  return new Date(iso);
}

function expandInterval(start: Date, end: Date, beforeMin = 0, afterMin = 0) {
  return { start: addMinutes(start, -beforeMin), end: addMinutes(end, afterMin) };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await verifyAdmin(request);

    const { id } = await params;
    const body = await request.json();
    const { start_at, end_at, staff_id, notes } = body as {
      start_at?: string;
      end_at?: string;
      staff_id?: string;
      notes?: string | null;
    };

    const client = createSupabaseServiceRoleClient() as any;
    const current = await getReservation(client, id);
    if (!current) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    const nextStartIso = start_at ?? current.start_at;
    const nextEndIso = end_at ?? current.end_at;
    const nextStaffId = staff_id ?? current.staff_id ?? null;

    const service = current.service ?? null;
    const start = toDate(nextStartIso);
    const end = toDate(nextEndIso);

    if (end <= start) {
      return NextResponse.json({ error: "end_at must be after start_at" }, { status: 400 });
    }

    if (nextStaffId) {
      const { data: overlaps, error: ovErr } = await client
        .from("reservations")
        .select(
          "id, start_at, end_at, status, pending_expires_at, service:service_id(buffer_before_min,buffer_after_min)"
        )
        .eq("staff_id", nextStaffId)
        .neq("id", id)
        .gt("end_at", start.toISOString())
        .lt("start_at", end.toISOString())
        .or(
          `status.in.(confirmed,paid),and(status.eq.pending,pending_expires_at.gt.${new Date().toISOString()})`
        );
      if (ovErr) throw ovErr;
      const windowNext = expandInterval(
        start,
        end,
        service?.buffer_before_min ?? 0,
        service?.buffer_after_min ?? 0
      );
      const conflict = (overlaps ?? []).some((row: any) => {
        const s = new Date(row.start_at);
        const e = new Date(row.end_at);
        const before = row.service?.buffer_before_min ?? 0;
        const after = row.service?.buffer_after_min ?? 0;
        const windowExisting = expandInterval(s, e, before, after);
        return windowExisting.start < windowNext.end && windowExisting.end > windowNext.start;
      });
      if (conflict) {
        return NextResponse.json({ error: "conflict" }, { status: 409 });
      }
    }

    const updates: Partial<Database["public"]["Tables"]["reservations"]["Update"]> = {
      start_at: nextStartIso,
      end_at: nextEndIso,
      staff_id: nextStaffId ?? null,
      notes: notes ?? current.notes ?? null,
      updated_at: new Date().toISOString(),
    } as any;

    const { data, error } = await client
      .from("reservations")
      .update(updates)
      .eq("id", id)
      .select("id, start_at, end_at, staff_id")
      .maybeSingle();
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Internal Server Error" }, { status: 500 });
  }
}

