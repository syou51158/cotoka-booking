import { z } from "zod";

// Expected Supabase project ref (hostname prefix)
// Allow override via env; if not provided, skip mismatch check.
const EXPECTED_PROJECT_REF_ENV = process.env.EXPECTED_PROJECT_REF;
export const EXPECTED_PROJECT_REF =
  EXPECTED_PROJECT_REF_ENV && EXPECTED_PROJECT_REF_ENV.length > 0
    ? EXPECTED_PROJECT_REF_ENV
    : null;

const EnvSchema = z.object({
  SITE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.string().min(1),
  NEXT_PUBLIC_TIMEZONE: z.string().min(1),
  // Dev mock flags
  ALLOW_DEV_MOCKS: z.string().optional(),
  NEXT_PUBLIC_ALLOW_DEV_MOCKS: z.string().optional(),
  // Email provider
  RESEND_API_KEY: z.string().optional(),
  NOTIFY_FROM_EMAIL: z.string().optional(),
  // Sentry
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
});

function extractProjectRef(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    return host.split(".")[0] ?? null;
  } catch {
    return null;
  }
}

function mask(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 6) return value; // too short to mask meaningfully
  const head = value.slice(0, 3);
  const tail = value.slice(-3);
  return `${head}…${tail}`;
}

const parsed = EnvSchema.safeParse({
  SITE_URL: process.env.SITE_URL,
  // Allow fallback to NEXT_PUBLIC_* if server-side vars are not set
  SUPABASE_URL:
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY:
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
  NEXT_PUBLIC_TIMEZONE: process.env.NEXT_PUBLIC_TIMEZONE,
  ALLOW_DEV_MOCKS: process.env.ALLOW_DEV_MOCKS,
  NEXT_PUBLIC_ALLOW_DEV_MOCKS: process.env.NEXT_PUBLIC_ALLOW_DEV_MOCKS,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  NOTIFY_FROM_EMAIL: process.env.NOTIFY_FROM_EMAIL,
  SENTRY_DSN: process.env.SENTRY_DSN,
  SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
});

if (!parsed.success) {
  // Log a concise warning listing missing keys (mask secrets implicitly)
  const issues = parsed.error.issues.map((i) => i.path.join("."));
  console.warn(
    `[env] Missing/invalid variables: ${issues.join(", ")}. Some features may not work.`,
  );
}

export const env = parsed.success
  ? parsed.data
  : {
      SITE_URL: process.env.SITE_URL ?? "",
      SUPABASE_URL:
        process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      SUPABASE_ANON_KEY:
        process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "ja",
      NEXT_PUBLIC_TIMEZONE: process.env.NEXT_PUBLIC_TIMEZONE ?? "Asia/Tokyo",
      ALLOW_DEV_MOCKS: process.env.ALLOW_DEV_MOCKS,
      NEXT_PUBLIC_ALLOW_DEV_MOCKS: process.env.NEXT_PUBLIC_ALLOW_DEV_MOCKS,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      NOTIFY_FROM_EMAIL: process.env.NOTIFY_FROM_EMAIL,
      SENTRY_DSN: process.env.SENTRY_DSN,
      SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
    };

export const currentProjectRef = extractProjectRef(env.SUPABASE_URL);
export const projectRefMismatch = EXPECTED_PROJECT_REF
  ? !!currentProjectRef && currentProjectRef !== EXPECTED_PROJECT_REF
  : false;

// Startup guard/logging
if (projectRefMismatch) {
  const envRefMasked = mask(currentProjectRef);
  const expectedMasked = mask(EXPECTED_PROJECT_REF);
  console.warn(
    `[env] Supabase projectRef mismatch. expected=${expectedMasked}, got=${envRefMasked}`,
  );
  if (process.env.NODE_ENV === "production") {
    throw new Error("Supabase projectRef mismatch in production environment.");
  }
}

export function getEnvHealth() {
  return {
    projectRef: mask(currentProjectRef),
    siteUrl: mask(env.SITE_URL),
    haveAnonKey: Boolean(env.SUPABASE_ANON_KEY && env.SUPABASE_ANON_KEY.length > 0),
    haveServiceRole: Boolean(env.SUPABASE_SERVICE_ROLE_KEY && env.SUPABASE_SERVICE_ROLE_KEY.length! > 0),
    devMocks:
      env.ALLOW_DEV_MOCKS === "true" && env.NEXT_PUBLIC_ALLOW_DEV_MOCKS === "true",
    emailFromMasked: mask(env.NOTIFY_FROM_EMAIL),
    haveResendKey: Boolean(env.RESEND_API_KEY && env.RESEND_API_KEY.length! > 0),
    sentryEnv: env.SENTRY_ENVIRONMENT ?? null,
    haveSentryDsn: Boolean(env.SENTRY_DSN && env.SENTRY_DSN.length! > 0),
  } as const;
}

export { extractProjectRef, mask };