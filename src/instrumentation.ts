export async function register() {
  // Node.js ランタイム（Route Handlers / Server Components）
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  // Edge ランタイムを使う場合はここで有効化（現状は未使用）
  // if (process.env.NEXT_RUNTIME === "edge") {
  //   await import("../sentry.edge.config");
  // }
}