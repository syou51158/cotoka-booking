import { SALON_NAME, SALON_ADDRESS } from "@/lib/config";
import { SITE_NAME } from "@/lib/config";

interface CalendarEvent {
  title: string;
  description: string;
  location: string;
  startTime: Date;
  endTime: Date;
  organizer?: {
    name: string;
    email: string;
  };
}

export function generateICS(event: CalendarEvent): string {
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

  const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@${SITE_NAME.toLowerCase().replace(/\s+/g, '')}.jp`;
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

export function generateCalendarLinks(event: CalendarEvent): {
  google: string;
  apple: string;
  ics: string;
} {
  const formatGoogleDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const encodeURIParam = (text: string): string => {
    return encodeURIComponent(text);
  };

  // Google Calendar URL
  const googleParams = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatGoogleDate(event.startTime)}/${formatGoogleDate(event.endTime)}`,
    details: event.description,
    location: event.location,
    ctz: "Asia/Tokyo",
  });
  const googleUrl = `https://calendar.google.com/calendar/render?${googleParams.toString()}`;

  // Apple Calendar (webcal) - we'll use a data URL for the ICS
  const icsContent = generateICS(event);
  const icsBlob = new Blob([icsContent], { type: "text/calendar" });
  const icsDataUrl = `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`;

  return {
    google: googleUrl,
    apple: icsDataUrl, // Apple devices will handle this appropriately
    ics: icsDataUrl,
  };
}

export function createReservationCalendarEvent(
  reservation: {
    customer_name: string;
    start_at: string;
    service?: {
      name: string;
      duration_min: number;
    } | null;
    staff?: {
      display_name: string;
    } | null;
    notes?: string;
  },
  locale: string = "ja",
  brand?: {
    siteName?: string;
    addressLine?: string;
    organizerEmail?: string;
  },
): CalendarEvent {
  const startTime = new Date(reservation.start_at);
  const duration = reservation.service?.duration_min || 60;
  const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

  const serviceName = reservation.service?.name || "サービス";
  const staffName = reservation.staff?.display_name || "スタッフ";

  const siteName = brand?.siteName ?? SALON_NAME;
  const titles = {
    ja: `${serviceName} - ${siteName}`,
    en: `${serviceName} - ${siteName}`,
    zh: `${serviceName} - ${siteName}`,
  };

  const descriptions = {
    ja: `サービス: ${serviceName}\n担当: ${staffName}\nお客様: ${reservation.customer_name}${reservation.notes ? `\n備考: ${reservation.notes}` : ""}`,
    en: `Service: ${serviceName}\nTherapist: ${staffName}\nCustomer: ${reservation.customer_name}${reservation.notes ? `\nNotes: ${reservation.notes}` : ""}`,
    zh: `服務: ${serviceName}\n理療師: ${staffName}\n客戶: ${reservation.customer_name}${reservation.notes ? `\n備註: ${reservation.notes}` : ""}`,
  };

  const salonAddressLine =
    brand?.addressLine ??
    `〒${SALON_ADDRESS.postalCode} ${SALON_ADDRESS.addressRegion}${SALON_ADDRESS.addressLocality} ${SALON_ADDRESS.streetAddress}`;
  const locations = {
    ja: `${salonAddressLine} ${siteName}`,
    en: `${salonAddressLine} ${siteName}`,
    zh: `${salonAddressLine} ${siteName}`,
  };

  return {
    title: titles[locale as keyof typeof titles] || titles.ja,
    description:
      descriptions[locale as keyof typeof descriptions] || descriptions.ja,
    location: locations[locale as keyof typeof locations] || locations.ja,
    startTime,
    endTime,
    organizer: {
      name: siteName,
      email: brand?.organizerEmail ?? `info@${SITE_NAME.toLowerCase().replace(/\s+/g, '')}.jp`,
    },
  };
}
