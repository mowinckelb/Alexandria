// Display-only formatter. Storage stays UTC ISO 8601 (parseable, sortable,
// timezone-unambiguous). Founder reads dashboard/email in SF time so display
// fields format here. Auto-switches PST/PDT via the IANA zone.

const PT_PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit',
  hour12: false,
  timeZoneName: 'short',
});

export function formatPT(d: Date | string | number | null | undefined): string {
  if (d === null || d === undefined) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  const parts = PT_PARTS.formatToParts(date);
  const get = (t: string) => parts.find(p => p.type === t)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')} ${get('timeZoneName')}`;
}
