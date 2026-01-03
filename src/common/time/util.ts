import { DateTime } from 'luxon';

export type UtcRangeIso = Readonly<{
  startIso: string;
  endIso: string;
}>;

export function toDbDate(wibDay: DateTime): Date {
  // untuk kolom @db.Date: kirim UTC midnight di "tanggal WIB" tsb
  return new Date(Date.UTC(wibDay.year, wibDay.month - 1, wibDay.day));
}

export function toUtcRangeParams(wibDay: DateTime): UtcRangeIso {
  const startUtc = wibDay.startOf('day').toUTC();
  const endUtc = wibDay.endOf('day').toUTC();

  return {
    startIso: startUtc.toISO()!,
    endIso: endUtc.toISO()!,
  };
}

// Mengubah Date jobDate (disimpan sebagai UTC midnight) ke string "YYYY-MM-DD" di zona WIB
export function ToWibString(jobDate: Date): string {
  return DateTime.fromJSDate(jobDate, { zone: 'UTC' }) // DATE disimpan sebagai UTC midnight
    .setZone('Asia/Jakarta')
    .toISODate()!; // "YYYY-MM-DD"
}
