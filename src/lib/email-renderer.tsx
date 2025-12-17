import { ConfirmationEmail } from "@/components/email/ConfirmationEmail";
import { ReminderEmail } from "@/components/email/ReminderEmail";
import { CancellationEmail } from "@/components/email/CancellationEmail";
import { getDictionary } from "@/i18n/dictionaries";
import {
  createReservationCalendarEvent,
  generateCalendarLinks,
} from "@/lib/calendar";
import type { SupportedLocale } from "@/lib/config";
import { SITE_NAME } from "@/lib/config";
import { getBusinessProfile } from "@/server/settings";
import { getMagicLinkViewTtlMinutes } from "@/server/tokens";

interface BaseReservation {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  start_at: string;
  total_amount: number;
  status: string;
  code: string;
  notes?: string;
  service?: {
    name: string;
    duration_min: number;
  } | null;
  staff?: {
    display_name: string;
    email: string;
  } | null;
}

interface EmailTemplate {
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

export async function renderConfirmationEmail(
  reservation: BaseReservation,
  locale: SupportedLocale = "ja",
  viewUrl?: string,
): Promise<EmailTemplate> {
  const dict = getDictionary(locale);
  const profile = await getBusinessProfile();
  const brand = {
    siteName: profile.salon_name,
    addressLine:
      locale === "en"
        ? (profile.address_en ?? profile.address_ja)
        : locale === "zh"
          ? (profile.address_zh ?? profile.address_ja)
          : profile.address_ja,
    phone: profile.phone,
    websiteUrl: profile.website_url,
    mapUrl: profile.map_url,
  };

  // Manage URL (absolute) with prefilled query
  const baseUrl =
    brand.websiteUrl && brand.websiteUrl.startsWith("http")
      ? brand.websiteUrl.replace(/\/+$/, "")
      : process.env.SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://cotoka.jp";
  const prefillContact =
    reservation.customer_email || reservation.customer_phone || "";
  const manageUrl = `${baseUrl}/${locale}/manage?code=${encodeURIComponent(reservation.code)}${prefillContact ? `&contact=${encodeURIComponent(prefillContact)}` : ""}`;

  // TTL days for footer note
  const ttlMin = getMagicLinkViewTtlMinutes();
  const ttlDays = Math.max(1, Math.round(ttlMin / (24 * 60))); // round to nearest day, min 1

  // Generate calendar event and links
  const calendarEvent = createReservationCalendarEvent(reservation, locale, {
    siteName: brand.siteName,
    addressLine: brand.addressLine,
    organizerEmail: profile.email_from,
  });
  const calendarLinks = generateCalendarLinks(calendarEvent);

  // Render email HTML
  const { renderToStaticMarkup } = await import("react-dom/server");
  const html = renderToStaticMarkup(
    <ConfirmationEmail
      dict={dict}
      locale={locale}
      reservation={reservation}
      calendarLinks={calendarLinks}
      viewUrl={viewUrl}
      manageUrl={manageUrl}
      ttlDays={ttlDays}
      brand={brand}
    />,
  );

  // Generate ICS attachment
  const icsContent = generateICS(calendarEvent);
  const serviceName = reservation.service?.name || "service";
  const icsAttachment = {
    filename: `reservation-${serviceName.replace(/\s+/g, "-")}.ics`,
    content: Buffer.from(icsContent).toString("base64"),
    contentType: "text/calendar",
  };

  const subject = dict.email.confirmation.subject
    .replace("{serviceName}", serviceName)
    .replace("{code}", reservation.code)
    .replace(/Cotoka/g, brand.siteName ?? dict.email.common.siteName);

  return {
    subject,
    html: `<!DOCTYPE html>${html}`,
    attachments: [icsAttachment],
  };
}

export async function renderReminderEmail(
  reservation: BaseReservation,
  type: "24h" | "2h",
  locale: SupportedLocale = "ja",
): Promise<EmailTemplate> {
  const dict = getDictionary(locale);
  const profile = await getBusinessProfile();
  const brand = {
    siteName: profile.salon_name,
    addressLine:
      locale === "en"
        ? (profile.address_en ?? profile.address_ja)
        : locale === "zh"
          ? (profile.address_zh ?? profile.address_ja)
          : profile.address_ja,
    phone: profile.phone,
    websiteUrl: profile.website_url,
    mapUrl: profile.map_url,
  };

  // Generate calendar event and links
  const calendarEvent = createReservationCalendarEvent(reservation, locale, {
    siteName: brand.siteName,
    addressLine: brand.addressLine,
    organizerEmail: profile.email_from,
  });
  const calendarLinks = generateCalendarLinks(calendarEvent);

  // Render email HTML
  const { renderToStaticMarkup } = await import("react-dom/server");
  const html = renderToStaticMarkup(
    <ReminderEmail
      dict={dict}
      locale={locale}
      type={type}
      reservation={reservation}
      calendarLinks={calendarLinks}
      brand={brand}
    />,
  );

  const serviceName = reservation.service?.name || "service";
  const baseSubject =
    type === "24h"
      ? dict.email.reminder.subject24h
      : dict.email.reminder.subject2h;
  const subject = baseSubject
    .replace("{serviceName}", serviceName)
    .replace(/Cotoka/g, brand.siteName ?? dict.email.common.siteName);

  return {
    subject,
    html: `<!DOCTYPE html>${html}`,
  };
}

export async function renderCancellationEmail(
  reservation: BaseReservation & { hasPrepayment: boolean },
  locale: SupportedLocale = "ja",
): Promise<EmailTemplate> {
  const dict = getDictionary(locale);
  const profile = await getBusinessProfile();
  const brand = {
    siteName: profile.salon_name,
    addressLine:
      locale === "en"
        ? (profile.address_en ?? profile.address_ja)
        : locale === "zh"
          ? (profile.address_zh ?? profile.address_ja)
          : profile.address_ja,
    phone: profile.phone,
    websiteUrl: profile.website_url,
    mapUrl: profile.map_url,
  };

  // Generate rebooking URL
  const rebookingUrl = `${process.env.NEXT_PUBLIC_BASE_URL || process.env.SITE_URL || "https://cotoka.jp"}/${locale}/booking`;

  // Render email HTML
  const { renderToStaticMarkup } = await import("react-dom/server");
  const html = renderToStaticMarkup(
    <CancellationEmail
      dict={dict}
      locale={locale}
      reservation={reservation}
      rebookingUrl={rebookingUrl}
      brand={brand}
    />,
  );

  const serviceName = reservation.service?.name || "service";
  const subject = dict.email.cancellation.subject
    .replace("{serviceName}", serviceName)
    .replace(/Cotoka/g, brand.siteName ?? dict.email.common.siteName);

  return {
    subject,
    html: `<!DOCTYPE html>${html}`,
  };
}

// Helper function to generate ICS content (imported from calendar.ts)
function generateICS(event: any): string {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const escapeText = (text: string): string => {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");
  };

  const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@cotoka.jp`;
  const now = new Date();

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${SITE_NAME.replace(/\s+/g, '')}//Booking System//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatDate(now)}`,
    `DTSTART:${formatDate(event.startTime)}`,
    `DTEND:${formatDate(event.endTime)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `LOCATION:${escapeText(event.location)}`,
  ];

  if (event.organizer) {
    icsContent.push(
      `ORGANIZER;CN=${escapeText(event.organizer.name)}:mailto:${event.organizer.email}`,
    );
  }

  icsContent.push(
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  );

  return icsContent.join("\r\n");
}
