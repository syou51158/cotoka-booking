import { NextResponse } from "next/server";
import { getActiveServices } from "@/server/services";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const isDev = process.env.NODE_ENV !== "production";
    const allowDevMocks = process.env.ALLOW_DEV_MOCKS === "true" && process.env.NEXT_PUBLIC_ALLOW_DEV_MOCKS === "true";
    const useMock = isDev && allowDevMocks && url.searchParams.get("mock") === "1";

    if (useMock) {
      const { getActiveServicesMock } = await import("@/server/_dev_mocks/services");
      const mockServices = await getActiveServicesMock();
      const res = NextResponse.json(
        mockServices.map((service: any) => ({
          id: service.id,
          name: service.name,
          description: service.description,
          duration_min: service.duration_min,
          price_jpy: service.price_jpy,
          active: true,
        }))
      );
      res.headers.set("X-Data-Source", "mock");
      return res;
    }

    const services = await getActiveServices();
    const res = NextResponse.json(
      services.map((service) => ({
        id: service.id,
        name: service.name,
        description: (service as any).description ?? null,
        duration_min: service.duration_min,
        price_jpy: service.price_jpy,
        active: (service as any).active ?? (service as any).is_active ?? false,
      }))
    );
    res.headers.set("X-Data-Source", "db");
    return res;
  } catch (error) {
    console.error("Failed to fetch services", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
