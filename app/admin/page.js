'use client';
import { useEffect, useState, useCallback } from 'react';
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
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(null);
  const text = custom ?? message(s);
  const phone = intl(s.phone);
  const subject = s.status === 'overdue' ? 'Your feeding payment is overdue' : 'Reminder: your feeding payment is due';
  return (
    <span className="remind">
      <button type="button" className="btn sm" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Edit message'}</button>{' '}
      {phone && <a className="btn alt sm" href={`sms:${phone}?body=${encodeURIComponent(text)}`}>SMS</a>}{' '}
      {phone && <a className="btn alt sm" href={`https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">WhatsApp</a>}{' '}
      {s.email && <a className="btn alt sm" href={`mailto:${s.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`}>Email</a>}
      {!phone && !s.email && <small>No contact saved</small>}
      {open && (
        <span style={{ flex: '1 1 100%' }}>
          <textarea rows={6} value={text} onChange={(e) => setCustom(e.target.value)} />
          {custom !== null && <button type="button" className="btn alt sm" onClick={() => setCustom(null)}>Reset message</button>}
        </span>
      )}
    </span>
  );
}


function EditPanel({ s, onClose, onSaved }) {
  const pl = s.rawPlan;
  const [orig] = useState(s.rawPlan); // what the student originally requested (frozen when the panel opens)
  const [decision, setDecision] = useState('Approved as requested');
  const [f, setF] = useState({ full_name: s.full_name || '', level: s.level || '', phone: s.phone || '', fees_total: s.fees_total ?? 0 });
  const [freq, setFreq] = useState(pl?.frequency || 'monthly');
  const [start, setStart] = useState(pl?.due_date || '');
  const [amount, setAmount] = useState(pl?.amount ?? '');
  const [net, setNet] = useState(pl?.payment_network || '');
  const [extra, setExtra] = useState('');
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);
  const [custom, setCustom] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    const a = await supabase.from('profiles').update({ full_name: f.full_name, level: f.level, phone: f.phone, fees_total: Number(f.fees_total) || 0 }).eq('id', s.id);
    if (a.error) return setErr(a.error.message);
    if (start && amount !== '') {
      const body = { frequency: freq, due_date: start, amount: Number(amount), repeat_monthly: freq === 'monthly', payment_network: net || null, note: 'Feeding' };
      const b = pl ? await supabase.from('due_dates').update(body).eq('id', pl.id) : await supabase.from('due_dates').insert({ ...body, user_id: s.id });
      if (b.error) return setErr(b.error.message);
    }
    setErr(''); setSaved(true); onSaved();
  }

  const first = (f.full_name || 'student').split(' ')[0];
  const planLine = start && amount !== ''
    ? `Your feeding plan is GH₵ ${Number(amount).toLocaleString()} every ${freq === 'weekly' ? 'week' : 'month'}${net ? ' by ' + net : ' by Mobile Money'}, starting ${fmtShort(new Date(start + 'T00:00:00Z'))}.`
    : '';
  const feesLine = Number(f.fees_total) ? ` Your total fees are GH₵ ${Number(f.fees_total).toLocaleString()}.` : '';
  const declined = decision === 'Not approved';
  const text = (declined
    ? `Hello ${first}, we are not able to approve your feeding payment plan at this time.${extra ? ' ' + extra : ''} Please check the student portal or contact us.`
    : `Hello ${first}, your feeding payment plan is ${decision.toLowerCase()}.${planLine}${feesLine}${extra ? ' ' + extra : ''} Please pay on time and upload your receipt on the portal.`
  ).replace(/\s+/g, ' ') + ' Daakyehene Foundation';
  const phone = intl(f.phone);

  const dlong = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const per = (fr) => (fr === 'weekly' ? 'week' : 'month');
  const describe = (x) => [`- Amount: GH₵ ${Number(x.amount).toLocaleString()}`, `- How often: Every ${per(x.frequency)}`, `- Pay with: ${x.payment_network || 'Mobile Money'} (we accept Mobile Money only)`, `- First payment date: ${dlong(x.due_date)}`];
  const hasPlan = start && amount !== '';
  const autoEmail = [
    `Dear ${first},`, '',
    'Thank you for setting up your feeding payment plan with the Daakyehene Foundation. Here is our decision.', '',
    `DECISION: ${decision}`, '',
    ...(orig && orig.amount != null ? ['What you requested', ...describe(orig), ''] : []),
    ...(hasPlan && !declined ? [decision === 'Approved as requested' ? 'Your plan (unchanged)' : 'Your plan now', ...describe({ amount, frequency: freq, payment_network: net, due_date: start }), ''] : []),
    ...(declined ? ['We are not able to approve this plan at this time.', ''] : []),
    ...(extra ? ['Note from the Foundation', extra, ''] : []),
    ...(Number(f.fees_total) ? [`Your total fees: GH₵ ${Number(f.fees_total).toLocaleString()}`, ''] : []),
    'What to do next',
    '1. Pay by Mobile Money on or before each due date.',
    '2. Upload your receipt and log the payment on the student portal.',
    '3. You can see your plan any time under the Feeding plan tab.', '',
    'If anything looks wrong, please reply to this email.', '',
    'Thank you,', 'Daakyehene Foundation', 'Empowering People · Building Communities · Creating a Brighter Future',
  ].join('\n');
  const emailText = custom ?? autoEmail;
  const subject = `Your feeding payment plan: ${decision}`;

  return (
    <section className="card edit-panel">
      <h2>Edit {s.full_name || s.email}</h2>
      <form onSubmit={save}>
        <div className="grid">
          <div><label htmlFor="ef1">Full name</label><input id="ef1" value={f.full_name} onChange={set('full_name')} /></div>
          <div><label htmlFor="ef2">Level</label><input id="ef2" value={f.level} onChange={set('level')} /></div>
          <div><label htmlFor="ef3">Phone</label><input id="ef3" type="tel" value={f.phone} onChange={set('phone')} /></div>
          <div><label htmlFor="ef4">Total fees (GH₵)</label><input id="ef4" type="number" min="0" value={f.fees_total} onChange={set('fees_total')} /></div>
        </div>
        <h3 style={{ marginTop: '1rem' }}>Feeding plan</h3>
        <div className="choice">
          <button type="button" className={freq === 'weekly' ? 'on' : ''} onClick={() => setFreq('weekly')}>Every week</button>
          <button type="button" className={freq === 'monthly' ? 'on' : ''} onClick={() => setFreq('monthly')}>Every month</button>
        </div>
        <div className="grid">
          <div><label htmlFor="ef5">First payment date</label><input id="ef5" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div><label htmlFor="ef6">Amount each time (GH₵)</label><input id="ef6" type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div><label htmlFor="ef7">MoMo network</label>
            <select id="ef7" value={net} onChange={(e) => setNet(e.target.value)}>
              <option value="">Choose…</option><option>MTN MoMo</option><option>Telecel Cash</option><option>AT Money</option>
            </select></div>
        </div>
        <label htmlFor="ef9">Your decision</label>
        <select id="ef9" value={decision} onChange={(e) => { setDecision(e.target.value); setCustom(null); }}>
          <option>Approved as requested</option><option>Approved with changes</option><option>Not approved</option>
        </select>
        <label htmlFor="ef8">Note to the student (reason or extra information)</label>
        <input id="ef8" placeholder="e.g. Payments are due before 6pm." value={extra} onChange={(e) => { setExtra(e.target.value); setCustom(null); }} />
        {err && <div className="msg err">{err}</div>}
        {saved && <div className="msg">Saved. Now send the student what you decided:</div>}
        <p>
          <button className="btn">Save changes</button>{' '}
          <button type="button" className="btn alt" onClick={onClose}>Close</button>
        </p>
      </form>
      {saved && (
        <>
        <label htmlFor="em">Email draft (you can edit the wording before sending)</label>
        <textarea id="em" className="draft" rows={14} value={emailText} onChange={(e) => setCustom(e.target.value)} />
        <p className="remind">
          {s.email && <a className="btn sm" href={`mailto:${s.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailText)}`}>Email student</a>}{' '}
          {phone && <a className="btn alt sm" href={`sms:${phone}?body=${encodeURIComponent(text)}`}>SMS</a>}{' '}
          {phone && <a className="btn alt sm" href={`https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">WhatsApp</a>}
        </p>
        </>
      )}
    </section>
  );
}

export default function Admin() {
  const router = useRouter();
  const [rows, setRows] = useState(null);
  const [meId, setMeId] = useState(null);
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(null);
  const [dismissed, setDismissed] = useState({});
  useEffect(() => { try { setDismissed(JSON.parse(localStorage.getItem('daakyehene-dismissed') || '{}')); } catch (e) { /* ignore */ } }, []);
  const keep = (next) => { setDismissed(next); try { localStorage.setItem('daakyehene-dismissed', JSON.stringify(next)); } catch (e) { /* ignore */ } };
  const notOverdue = (s) => keep({ ...dismissed, [s.id]: s.lastDue.toISOString().slice(0, 10) });

  const load = useCallback(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace('/');
      const [a, b, c] = await Promise.all([
        supabase.from('profiles').select('*').order('full_name'),
        supabase.from('payments').select('user_id, amount, paid_on'),
        supabase.from('due_dates').select('*'),
      ]);
      const me = (a.data || []).find((x) => x.id === data.session.user.id);
      if (!me?.is_admin) return router.replace('/dashboard');
      setMeId(me.id);
      const paid = {}, pays = {};
      (b.data || []).forEach((x) => {
        paid[x.user_id] = (paid[x.user_id] || 0) + Number(x.amount);
        (pays[x.user_id] = pays[x.user_id] || []).push(x.paid_on);
      });
      const plans = {};
      (c.data || []).forEach((x) => { plans[x.user_id] = x; });
      setRows((a.data || []).map((s) => {
        const pl = plans[s.id];
        const out = { ...s, rawPlan: pl || null, paid: paid[s.id] || 0, plan: '', next: null, days: null, lastDue: null, status: '', amount: pl?.amount };
        if (pl) {
          out.plan = `GH₵ ${pl.amount ?? ''} ${pl.frequency}${pl.payment_network ? ' · ' + pl.payment_network : ''}`;
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
  useEffect(() => { load(); }, [load]);

  async function toggleAdmin(s) {
    const make = !s.is_admin;
    if (!confirm(make ? `Make ${s.full_name || s.email} an admin? They will see all students.` : `Remove admin access from ${s.full_name || s.email}?`)) return;
    const { error } = await supabase.rpc('set_admin', { target: s.id, flag: make });
    setNote(error ? error.message : (make ? 'Admin added.' : 'Admin removed.'));
    load();
  }

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
  const isHidden = (s) => s.lastDue && dismissed[s.id] === s.lastDue.toISOString().slice(0, 10);
  const overdueAll = rows.filter((s) => s.status === 'overdue');
  const overdue = overdueAll.filter((s) => !isHidden(s));
  const hidden = overdueAll.length - overdue.length;
  const name = (s) => s.full_name || s.email;

  return (
    <>
      <div className="top"><b>Admin · Students</b><Link href="/dashboard">My dashboard</Link></div>
      <div className="wrap">
        {editing && rows.find((x) => x.id === editing) && (
          <EditPanel key={editing} s={rows.find((x) => x.id === editing)} onClose={() => setEditing(null)} onSaved={load} />
        )}
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
              <RemindLinks s={{ ...s, status: 'overdue' }} />{' '}
              <button className="btn del sm" onClick={() => notOverdue(s)}>Not overdue</button>
            </div>
          ))}
          {hidden > 0 && <p><small>{hidden} marked not overdue.</small>{' '}<button className="btn alt sm" onClick={() => keep({})}>Show again</button></p>}
        </section>

        <div className="card scroll">
          <p><button className="btn" onClick={csv}>Download CSV</button></p>
          {note && <div className="msg">{note}</div>}
          <table>
            <thead><tr><th>Name</th><th>Level</th><th>Phone</th><th>Birthday</th><th>Fees</th><th>Paid</th><th>Balance</th><th>Feeding plan</th><th>Next payment</th><th>Access</th><th>Details</th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}><td>{name(s)}</td><td>{s.level}</td><td>{s.phone}</td><td>{s.birthday}</td>
                  <td>{s.fees_total}</td><td>{s.paid}</td><td>{Math.max(0, s.fees_total - s.paid)}</td>
                  <td>{s.plan || 'Not set'}</td><td>{fmt(s.next)}</td>
                  <td>{s.id === meId ? <small>You (admin)</small> : <button className={'btn sm ' + (s.is_admin ? 'del' : 'alt')} onClick={() => toggleAdmin(s)}>{s.is_admin ? 'Remove admin' : 'Make admin'}</button>}</td>
                  <td><button className="btn sm" onClick={() => { setEditing(s.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
