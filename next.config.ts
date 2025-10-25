import type { NextConfig } from "next";

// App Router では next.config の組み込み i18n は未対応のため、
// 動的セグメント `[locale]` と競合しないように外します。
const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
