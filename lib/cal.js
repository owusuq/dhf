const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
const parse = (s) => new Date(s + 'T00:00:00Z');
const today = () => parse(new Date().toISOString().slice(0, 10));

// frequency: 'weekly' | 'monthly' (true is treated as monthly, false/null as one-off)
export const ruleFor = (frequency) =>
  frequency === 'weekly' ? 'FREQ=WEEKLY' : frequency === 'monthly' || frequency === true ? 'FREQ=MONTHLY' : null;

export function nextOccurrence(dateStr, frequency) {
  const t = today();
  let d = parse(dateStr);
  if (d >= t) return d;
  if (frequency === 'weekly') {
    const weeks = Math.ceil((t - d) / (7 * 86400000));
    return new Date(d.getTime() + weeks * 7 * 86400000);
  }
  if (frequency !== 'monthly' && frequency !== true) return null;
  const day = d.getUTCDate();
  let y = d.getUTCFullYear(), m = d.getUTCMonth();
  while (d < t) {
    m += 1;
    const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    d = new Date(Date.UTC(y, m, Math.min(day, last)));
  }
  return d;
}
export const daysUntil = (d) => Math.round((d - today()) / 86400000);

export function nextBirthday(bday) {
  if (!bday) return null;
  const b = parse(bday), t = today();
  let n = new Date(Date.UTC(t.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()));
  if (n < t) n = new Date(Date.UTC(t.getUTCFullYear() + 1, b.getUTCMonth(), b.getUTCDate()));
  return n;
}

export function googleLink(title, dateStr, rule) {
  const s = parse(dateStr), e = new Date(s.getTime() + 86400000);
  const p = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${ymd(s)}/${ymd(e)}` });
  if (rule) p.set('recur', 'RRULE:' + rule);
  return 'https://calendar.google.com/calendar/render?' + p.toString();
}

export function downloadIcs(title, dateStr, rule) {
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Daakyehene Foundation//Portal//EN',
    'BEGIN:VEVENT', `UID:${dateStr}-${Math.random().toString(36).slice(2)}@daakyehene`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${dateStr.replace(/-/g, '')}`,
    ...(rule ? ['RRULE:' + rule] : []),
    `SUMMARY:${title}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, 'TRIGGER:-P1D', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = 'reminder.ics';
  a.click();
}

// Most recent due date strictly before today (null if the plan has not started yet or never repeats)
export function previousOccurrence(dateStr, frequency) {
  const t = today();
  const start = parse(dateStr);
  if (start >= t) return null;
  if (frequency === 'weekly') {
    const weeks = Math.ceil((t - start) / (7 * 86400000)) - 1;
    return new Date(start.getTime() + weeks * 7 * 86400000);
  }
  if (frequency === 'monthly') {
    const day = start.getUTCDate();
    let y = start.getUTCFullYear(), m = start.getUTCMonth(), d = start, prev = start;
    while (d < t) {
      prev = d;
      m += 1;
      const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      d = new Date(Date.UTC(y, m, Math.min(day, last)));
    }
    return prev;
  }
  return start;
}
