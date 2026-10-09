'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { nextOccurrence, previousOccurrence, daysUntil } from '../../lib/cal';

const fmt = (d) => (d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');
const fmtShort = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

// Ghana numbers: 024... -> +23324...
function intl(phone) {
  let p = String(phone || '').replace(/[^\d+]/g, '');
  if (!p) return '';
  if (p.startsWith('+')) return p;
  if (p.startsWith('00')) return '+' + p.slice(2);
  if (p.startsWith('0')) return '+233' + p.slice(1);
  return '+' + p;
}

function message(s) {
  const first = (s.full_name || 'student').split(' ')[0];
  const amt = s.amount ? `GH₵ ${Number(s.amount).toLocaleString()}` : 'your';
  const lead = s.amount ? `your feeding payment of ${amt}` : 'your feeding payment';
  if (s.status === 'overdue')
    return `Hello ${first}, we have not yet received ${lead} that was due on ${fmtShort(s.lastDue)}. Please pay and upload your receipt on the portal, or contact us if there is a problem. Thank you.`;
  if (s.days === 0)
    return `Hello ${first}, your Daakyehene Foundation feeding payment${s.amount ? ' of ' + amt : ''} is due today. Please pay and upload your receipt on the portal. Thank you!`;
  return `Hello ${first}, a friendly reminder from Daakyehene Foundation: ${lead} is due ${s.days === 1 ? 'tomorrow' : 'on'} ${fmtShort(s.next)}. After paying, please upload your receipt on the portal. Thank you!`;
}

function RemindLinks({ s }) {
  const text = message(s);
  const phone = intl(s.phone);
  const subject = s.status === 'overdue' ? 'Your feeding payment is overdue' : 'Reminder: your feeding payment is due';
  return (
    <span className="remind">
      {phone && <a className="btn alt sm" href={`sms:${phone}?body=${encodeURIComponent(text)}`}>SMS</a>}{' '}
      {phone && <a className="btn alt sm" href={`https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">WhatsApp</a>}{' '}
      {s.email && <a className="btn alt sm" href={`mailto:${s.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`}>Email</a>}
      {!phone && !s.email && <small>No contact saved</small>}
    </span>
  );
}

export default function Admin() {
  const router = useRouter();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace('/');
      const [a, b, c] = await Promise.all([
        supabase.from('profiles').select('*').order('full_name'),
        supabase.from('payments').select('user_id, amount, paid_on'),
        supabase.from('due_dates').select('user_id, due_date, frequency, amount'),
      ]);
      const me = (a.data || []).find((x) => x.id === data.session.user.id);
      if (!me?.is_admin) return router.replace('/dashboard');
      const paid = {}, pays = {};
      (b.data || []).forEach((x) => {
        paid[x.user_id] = (paid[x.user_id] || 0) + Number(x.amount);
        (pays[x.user_id] = pays[x.user_id] || []).push(x.paid_on);
      });
      const plans = {};
      (c.data || []).forEach((x) => { plans[x.user_id] = x; });
      setRows((a.data || []).map((s) => {
        const pl = plans[s.id];
        const out = { ...s, paid: paid[s.id] || 0, plan: '', next: null, days: null, lastDue: null, status: '', amount: pl?.amount };
        if (pl) {
          out.plan = `GH₵ ${pl.amount ?? ''} ${pl.frequency}`;
          out.next = nextOccurrence(pl.due_date, pl.frequency);
          out.days = out.next ? daysUntil(out.next) : null;
          out.lastDue = previousOccurrence(pl.due_date, pl.frequency);
          if (out.lastDue) {
            // overdue = no payment logged within 3 days before the last due date or since
            const from = new Date(out.lastDue.getTime() - 3 * 86400000).toISOString().slice(0, 10);
            const hasPaid = (pays[s.id] || []).some((d) => d >= from);
            if (!hasPaid) out.status = 'overdue';
          }
          if (!out.status && out.days !== null && out.days <= 1) out.status = 'soon';
        }
        return out;
      }));
    })();
  }, [router]);

  function csv() {
    const head = 'Name,Email,Phone,Level,Birthday,Option,Fees,Paid,Balance,Feeding plan,Next payment';
    const body = rows.map((s) => [s.full_name, s.email, s.phone, s.level, s.birthday, s.payment_option, s.fees_total, s.paid, s.fees_total - s.paid, s.plan, fmt(s.next)].map((v) => `"${v ?? ''}"`).join(','));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([[head, ...body].join('\n')], { type: 'text/csv' }));
    a.download = 'students.csv';
    a.click();
  }
  if (!rows) return <div className="wrap">Loading…</div>;

  const soon = rows.filter((s) => s.status === 'soon');
  const overdue = rows.filter((s) => s.status === 'overdue');
  const name = (s) => s.full_name || s.email;

  return (
    <>
      <div className="top"><b>Admin · Students</b><Link href="/dashboard">My dashboard</Link></div>
      <div className="wrap">
        <section className="card">
          <h2>Reminders to send</h2>
          <p>{soon.length} due today or tomorrow · {overdue.length} overdue. Tap a button to open the message already written, then press send.</p>
          {soon.length + overdue.length === 0 && <p>Nobody needs a reminder right now.</p>}
          {soon.map((s) => (
            <div className="row" key={s.id}>
              <span><b>{name(s)}</b> · due {s.days === 0 ? 'today' : 'tomorrow'} · {s.plan}</span>
              <RemindLinks s={s} />
            </div>
          ))}
          {overdue.map((s) => (
            <div className="row" key={s.id}>
              <span><b>{name(s)}</b> · <span className="late">overdue since {fmtShort(s.lastDue)}</span> · {s.plan}</span>
              <RemindLinks s={{ ...s, status: 'overdue' }} />
            </div>
          ))}
        </section>

        <div className="card scroll">
          <p><button className="btn" onClick={csv}>Download CSV</button></p>
          <table>
            <thead><tr><th>Name</th><th>Level</th><th>Phone</th><th>Birthday</th><th>Fees</th><th>Paid</th><th>Balance</th><th>Feeding plan</th><th>Next payment</th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}><td>{name(s)}</td><td>{s.level}</td><td>{s.phone}</td><td>{s.birthday}</td>
                  <td>{s.fees_total}</td><td>{s.paid}</td><td>{Math.max(0, s.fees_total - s.paid)}</td>
                  <td>{s.plan || 'Not set'}</td><td>{fmt(s.next)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
