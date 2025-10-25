import { headers } from "next/headers";

type Opts = { enforceHttpsInProd?: boolean; allowHosts?: string[] };

export async function resolveBaseUrl(req: Request, opts: Opts = {}) {
  const h = await headers();
  const xfHost = h.get("x-forwarded-host");
  const host = xfHost ?? h.get("host");
  let proto = h.get("x-forwarded-proto") ?? "http";

  const envUrl = process.env.SITE_URL && process.env.SITE_URL.startsWith("http")
    ? process.env.SITE_URL
    : "";

  const allow = opts.allowHosts ?? (
    process.env.ALLOWED_BASE_HOSTS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? []
  );

  let base = host ? `${proto}://${host}` : (envUrl || new URL(req.url).origin);

  const enforceHttps = opts.enforceHttpsInProd ?? process.env.NODE_ENV === "production";
  if (enforceHttps && base.startsWith("http://")) {
    base = base.replace("http://", "https://");
  }

  try {
    const u = new URL(base);
    if (allow.length && !allow.includes(u.host)) {
      if (envUrl) return envUrl;
    }
  } catch {
    // ignore URL parse error and return base as-is
  }

  return base;
}