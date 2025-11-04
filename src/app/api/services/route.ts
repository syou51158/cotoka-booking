import { getActiveServices } from "@/server/services";
import { json, assertEnv } from "@/lib/http";
import { withDataSource } from "@/lib/prodParity";

export async function GET(request: Request) {
  try {
    assertEnv(["SUPABASE_URL", "SUPABASE_ANON_KEY"]);

    const services = await getActiveServices();
    const res = json(
      services.map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description ?? null,
        duration_min: service.duration_min,
        price_jpy: service.price_jpy,
        active:
          service.active ??
          (service as { is_active?: boolean })?.is_active ??
          false,
      })),
      200,
    );
    return withDataSource(res, "db");
  } catch (error) {
    const msg = (error as any)?.message || "internal_error";
    const status = String(msg).startsWith("MISSING_ENV") ? 503 : 500;
    return json({ message: msg }, status);
  }
}
