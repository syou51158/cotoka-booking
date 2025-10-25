import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || undefined,
  environment: process.env.SENTRY_ENVIRONMENT || "staging",
  // Reasonable defaults; tune later if needed
  tracesSampleRate: 0.05,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  debug: process.env.NODE_ENV !== "production",
});