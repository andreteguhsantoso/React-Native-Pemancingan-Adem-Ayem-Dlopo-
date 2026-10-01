export function wibDateKey(now: Date = new Date()) {
  return new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function normalizeDate(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  const result = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const date = new Date(`${result}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === result ? result : null;
}

export function parseDecimal(value: string) {
  return Number(value.trim().replace(',', '.'));
}

export function effectiveBookingStatus(status: string, expiresAt: string | null, now = Date.now()) {
  return status === 'awaiting_payment' && expiresAt && new Date(expiresAt).getTime() <= now ? 'expired' : status;
}

export function isSold(status: string) { return status === 'paid' || status === 'confirmed'; }

export function matchesLeaderboardPeriod(date: string, period: string, eventId: string | null, selectedEvent: string, now: Date = new Date()) {
  const today = wibDateKey(now);
  if (period === 'Hari Ini') return date === today;
  if (period === 'Bulanan') return date.slice(0, 7) === today.slice(0, 7);
  return selectedEvent === 'all' || eventId === selectedEvent;
}
