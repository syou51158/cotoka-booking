import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import {
  SITE_NAME,
  DEFAULT_LOCALE,
  SITE_URL,
  SALON_NAME,
  SALON_ADDRESS,
  SALON_OPENING_HOURS,
  SALON_PRICE_RANGE,
  SALON_PHONE,
  SALON_LOCATION_TEXT,
} from "@/lib/config";
import { getBusinessProfile } from "@/server/settings";
import { Button } from "@/components/ui/button";
import LocaleSwitcher from "@/components/locale-switcher";
import SentryInit from "@/components/sentry-init";
import Toaster from "@/components/ui/toaster";
import ActiveHoldBanner from "@/components/ActiveHoldBanner";
import { ConditionalHeader, ConditionalFooter } from "@/components/layout/conditional-layout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${SITE_NAME} | Booking`,
  description:
    `${SITE_NAME} (烏丸御池) のオンライン予約・決済ポータル`,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: SITE_NAME,
    description:
      `${SITE_NAME} - 烏丸御池・704号室のリラクゼーションサロン。オンラインで予約から決済まで完結。`,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "ja_JP",
    type: "website",
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale?: string }>;
}

export default async function RootLayout({
  children,
  params,
}: RootLayoutProps) {
  const resolvedParams = await params;
  const locale = resolvedParams?.locale ?? DEFAULT_LOCALE;
  const showLocaleSwitcher = Boolean(resolvedParams?.locale);
  const profile = await getBusinessProfile();
  const siteName = profile.salon_name ?? SITE_NAME;
  const addressLine =
    locale === "en"
      ? (profile.address_en ?? profile.address_ja ?? "")
      : locale === "zh"
        ? (profile.address_zh ?? profile.address_ja ?? "")
        : (profile.address_ja ??
          profile.address_en ??
          profile.address_zh ??
          "");
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "@id": `${SITE_URL}#business`,
        name: SALON_NAME,
        description:
          "烏丸御池駅直結・704号室のリラクゼーションサロン。オンラインで予約から決済まで完結。",
        url: SITE_URL,
        image: `${SITE_URL}/favicon.ico`,
        address: {
          "@type": "PostalAddress",
          streetAddress: SALON_ADDRESS.streetAddress,
          addressLocality: SALON_ADDRESS.addressLocality,
          addressRegion: SALON_ADDRESS.addressRegion,
          postalCode: SALON_ADDRESS.postalCode,
          addressCountry: SALON_ADDRESS.addressCountry,
        },
        telephone: SALON_PHONE || undefined,
        openingHoursSpecification: SALON_OPENING_HOURS.map((h) => ({
          "@type": "OpeningHoursSpecification",
          dayOfWeek: h.day,
          opens: h.opens,
          closes: h.closes,
        })),
        geo: {
          "@type": "GeoCoordinates",
          latitude: 35.0094,
          longitude: 135.7631,
        },
        priceRange: SALON_PRICE_RANGE,
        sameAs: [`https://maps.google.com/?q=${encodeURIComponent(SITE_NAME)}`],
      },
      {
        "@type": "Service",
        "@id": `${SITE_URL}#service`,
        name: "リラクゼーション＆ビューティー施術",
        provider: { "@id": `${SITE_URL}#business` },
        areaServed: {
          "@type": "AdministrativeArea",
          name: "Kyoto, Japan",
        },
        availableLanguage: ["ja"],
        offers: [
          {
            "@type": "Offer",
            priceCurrency: "JPY",
            price: "9900",
            availability: "https://schema.org/InStock",
          },
        ],
      },
    ],
  };

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Browser側でSentry初期化 */}
        <SentryInit />
        <div className="flex min-h-screen flex-col">
          <ConditionalHeader>
            <header className="border-b bg-white/80 backdrop-blur">
              <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
                <Link
                  href={`/${DEFAULT_LOCALE}/booking`}
                  className="text-lg font-semibold tracking-tight"
                >
                  {siteName}
                </Link>
                <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <div className="order-3 text-right text-xs text-slate-500 sm:order-1">
                    {addressLine || SALON_LOCATION_TEXT}
                  </div>
                  <Link
                    href={`/${DEFAULT_LOCALE}/manage`}
                    className="order-2 text-sm text-slate-600 hover:text-slate-800 underline-offset-2 hover:underline sm:order-2"
                  >
                    予約を確認する
                  </Link>
                  <Button
                    asChild
                    className="order-1 inline-flex text-sm py-2 px-3 sm:order-3"
                  >
                    <Link href={`/${DEFAULT_LOCALE}/booking`}>Web予約</Link>
                  </Button>
                  <div className="order-4 sm:order-4">
                    {showLocaleSwitcher ? (
                      <LocaleSwitcher currentLocale={locale} />
                    ) : null}
                  </div>
                </div>
              </div>
            </header>
          </ConditionalHeader>
          <ActiveHoldBanner />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4">
            {children}
          </main>
          <ConditionalFooter>
            <footer className="border-t bg-white/80 backdrop-blur">
              <div className="mx-auto w-full max-w-5xl px-4 py-8">
                <div className="grid gap-8 text-sm text-slate-600 sm:grid-cols-3">
                  <div>
                    <Link
                      href={`/${DEFAULT_LOCALE}/booking`}
                      className="text-base font-semibold text-slate-900"
                    >
                      {siteName}
                    </Link>
                    <div className="mt-2 text-xs text-slate-500">
                      {addressLine || SALON_LOCATION_TEXT}
                    </div>
                  </div>
                  <div />
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      サポート
                    </div>
                    <ul className="mt-3 space-y-2">
                      <li>
                        <Link
                          href={`/${DEFAULT_LOCALE}/manage`}
                          className="hover:text-slate-900"
                        >
                          予約を確認する
                        </Link>
                      </li>
                      <li>
                        <Link
                          href={`/${DEFAULT_LOCALE}#cancel-policy`}
                          className="hover:text-slate-900"
                        >
                          キャンセルポリシー
                        </Link>
                      </li>
                      <li>
                        <Link
                          href={`/${DEFAULT_LOCALE}#access`}
                          className="hover:text-slate-900"
                        >
                          アクセス
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="mt-8 flex items-center justify-between border-t pt-3 text-xs text-slate-500">
                  <Link href={`/${DEFAULT_LOCALE}/booking`}>{siteName}</Link>
                  <span>
                    © {new Date().getFullYear()} {siteName}
                  </span>
                </div>
              </div>
            </footer>
          </ConditionalFooter>
        </div>
        <Toaster />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  );
}
