export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "Cotoka";
export const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "ja";
export const SUPPORTED_LOCALES = ["ja", "en", "zh"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE ?? "Asia/Tokyo";
export const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";
export const MIN_HOURS_BEFORE_BOOKING = 3;

export const BOOKING_CONTACT_OPTIONS = ["email", "phone"] as const;
export const SALON_LOCATION_TEXT =
  "京都市中京区・烏丸御池　エレベーターを降りて右後ろ／704号室";

// --- 店舗情報（トップページ & JSON-LD 共用） ---
export const SALON_NAME = SITE_NAME;
export const SALON_ADDRESS = {
  streetAddress: "京都市中京区 烏丸御池 704号室",
  addressLocality: "京都市",
  addressRegion: "京都府",
  postalCode: "604-0000",
  addressCountry: "JP",
};
export const SALON_PHONE = process.env.NEXT_PUBLIC_SALON_PHONE ?? ""; // 実番号がある場合は .env で設定
export const SALON_MAP_URL =
  process.env.NEXT_PUBLIC_SALON_MAP_URL ??
  "https://maps.app.goo.gl/4i7d4gRZdVhtzK4w7";
export const SALON_PRICE_RANGE = "¥¥";

// 営業時間（例: 毎日 10:00-20:00）。JSON-LDでは OpeningHoursSpecification に展開。
export const SALON_OPENING_HOURS = [
  { day: "Monday", opens: "10:00", closes: "20:00" },
  { day: "Tuesday", opens: "10:00", closes: "20:00" },
  { day: "Wednesday", opens: "10:00", closes: "20:00" },
  { day: "Thursday", opens: "10:00", closes: "20:00" },
  { day: "Friday", opens: "10:00", closes: "20:00" },
  { day: "Saturday", opens: "10:00", closes: "20:00" },
  { day: "Sunday", opens: "10:00", closes: "20:00" },
];

// トップページ用の価格表フォールバック（services API が空のときに使用）
export const FALLBACK_SERVICES = [
  {
    id: "fallback-60",
    name: "ボディケア 60分",
    duration_min: 60,
    price_jpy: 9900,
  },
  {
    id: "fallback-90",
    name: "ボディケア 90分",
    duration_min: 90,
    price_jpy: 13900,
  },
];

// キャンセルポリシー（表示用）
export const CANCEL_POLICY_TEXT =
  "キャンセルは前日まで無料、当日は施術料金の100%をご負担いただきます。";
