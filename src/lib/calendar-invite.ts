function toUtcIcsStamp(dateStr: string, timeStr: string): string {
  // Tunisia is permanently UTC+1 (no daylight saving)
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, hh - 1, mm, 0));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${utc.getUTCFullYear()}${pad(utc.getUTCMonth() + 1)}${pad(utc.getUTCDate())}T${pad(
    utc.getUTCHours()
  )}${pad(utc.getUTCMinutes())}00Z`;
}

export function buildGoogleCalendarUrl(opts: {
  title: string;
  description: string;
  location?: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
}) {
  const start = toUtcIcsStamp(opts.bookingDate, opts.startTime);
  const end = toUtcIcsStamp(opts.bookingDate, opts.endTime);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${start}/${end}`,
    details: opts.description,
    location: opts.location || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadIcsReminder(opts: {
  id: string;
  title: string;
  description: string;
  location?: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
}) {
  const start = toUtcIcsStamp(opts.bookingDate, opts.startTime);
  const end = toUtcIcsStamp(opts.bookingDate, opts.endTime);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Booki//Booking Reminder//FR",
    "BEGIN:VEVENT",
    `UID:${opts.id}@booki.tn`,
    `DTSTAMP:${start}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${opts.title}`,
    `DESCRIPTION:${opts.description.replace(/\n/g, "\\n")}`,
    `LOCATION:${opts.location || ""}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT24H",
    "ACTION:DISPLAY",
    `DESCRIPTION:Rappel RDV demain - ${opts.title}`,
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:Rappel RDV dans 2h - ${opts.title}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rdv-${opts.bookingDate}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}