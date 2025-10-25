import { formatInTimeZone } from "date-fns-tz";
import { nanoid } from "nanoid";

interface MakeIcsArgs {
  title: string;
  start: string | Date;
  end: string | Date;
  location: string;
  description?: string;
}

function toDate(value: string | Date) {
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date value passed to makeIcs");
  }
  return parsed;
}

function toUtcString(date: Date) {
  return formatInTimeZone(date, "UTC", "yyyyMMdd'T'HHmmss'Z'");
}

function escapeText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
}

export function makeIcs({
  title,
  start,
  end,
  location,
  description = "",
}: MakeIcsArgs) {
  const startDate = toDate(start);
  const endDate = toDate(end);
  const uid = `${nanoid()}@cotoka-booking`;
  const dtStamp = toUtcString(new Date());
  const dtStart = toUtcString(startDate);
  const dtEnd = toUtcString(endDate);

  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cotoka Relax & Beauty SPA//Booking//JP",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeText(title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `LOCATION:${escapeText(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return body.join("\r\n");
}
