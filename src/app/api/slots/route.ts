import { NextResponse } from "next/server";
import { z } from "zod";
import { getAvailableSlots } from "@/server/slots";

const bodySchema = z.object({
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  staffId: z.string().min(1).optional().nullable(),
});

// モックスロットデータを生成
function generateMockSlots(serviceId: string, date: string, staffId?: string) {
  // 実際のデータベースのスタッフIDを使用
  const mockStaff = [
    { id: "3ffa639b-a0b1-4ae3-80cf-bbeaa4c01a2b", name: "Akane" },
    { id: "4b5b71d6-3eb3-4297-8f02-ae7a65ed934e", name: "Sho" }
  ];

  const targetStaff = staffId ? mockStaff.find(s => s.id === staffId) : null;
  const staffList = targetStaff ? [targetStaff] : mockStaff;
  
  const slots = [];
  
  for (const staff of staffList) {
    // 10:00から18:00までのスロットを生成（30分間隔）
    for (let hour = 10; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // 終了時刻を正しく計算（分が60を超える場合は時間を繰り上げ）
        let endHour = hour;
        let endMinute = minute + 30;
        if (endMinute >= 60) {
          endHour += 1;
          endMinute -= 60;
        }
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        
        slots.push({
          staffId: staff.id,
          start: `${date}T${startTime}:00+09:00`,
          end: `${date}T${endTime}:00+09:00`
        });
      }
    }
  }
  
  return slots;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { serviceId, date, staffId } = bodySchema.parse(body);
    
    // 開発モードでモックデータを使用する場合（強制DB指定がない場合のみ）
    const url = new URL(request.url);
    const sourceParam = url.searchParams.get("source");
    const forceDb = url.searchParams.get("useDb") === "1" || sourceParam === "db";
    const forceMock = sourceParam === "mock";
    const allowServerMocks = process.env.ALLOW_DEV_MOCKS === "true";
    const allowUiMocks = process.env.NEXT_PUBLIC_ALLOW_DEV_MOCKS === "true";
     if (allowServerMocks && (forceMock || (!forceDb && allowUiMocks))) {
        const mockSlots = generateMockSlots(serviceId, date, staffId ?? undefined);
        return NextResponse.json(mockSlots);
      }
    
    // 本番環境では実際のデータベースから取得
    const slots = await getAvailableSlots({
      serviceId,
      date,
      staffId: staffId ?? undefined,
    });
    return NextResponse.json(slots);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Failed to load slots", error);
    const errPayload = (error as any)?.message ?? JSON.stringify(error);
    return NextResponse.json(
      { message: "Internal Server Error", error: errPayload },
      { status: 500 },
    );
  }
}
