import { formatInTimeZone } from "date-fns-tz";
import { addHours, isBefore } from "date-fns";
import { TIMEZONE } from "./config";

export function toZonedISOString(date: Date | string, timezone = TIMEZONE) {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(dateObj, timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

export function formatDisplay(
  date: Date | string,
  format = "MM/dd (EEE) HH:mm",
  timezone = TIMEZONE,
) {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(dateObj, timezone, format);
}

export function isWithinMinLeadTime(slotStart: Date, minLeadHours: number) {
  const leadLimit = addHours(new Date(), minLeadHours);
  return isBefore(slotStart, leadLimit);
}
