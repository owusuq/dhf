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


const money = (n) => 'GH₵ ' + Number(n || 0).toLocaleString();
const dlongD = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const PERMISSION_HELP = 'Nothing was saved. Admin editing needs a one-time permission: run supabase/admin_edit.sql in the Supabase SQL Editor.';

function StudentPayments({ s, addChange }) {
  const today = new Date().toISOString().slice(0, 10);
  const blank = { paid_on: today, amount: '', note: '' };
  const [list, setList] = useState([]);
  const [f, setF] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const { data } = await supabase.from('payments').select('*').eq('user_id', s.id).order('paid_on', { ascending: false });
    setList(data || []);
  }, [s.id]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    if (f.amount === '' || !f.paid_on) return;
    const body = { paid_on: f.paid_on, amount: Number(f.amount), note: f.note };
    const old = list.find((x) => x.id === editId);
    const r = editId
      ? await supabase.from('payments').update(body).eq('id', editId).select()
      : await supabase.from('payments').insert({ ...body, user_id: s.id }).select();
    if (r.error) return setErr(r.error.message);
    if (!r.data || !r.data.length) return setErr(PERMISSION_HELP);
    addChange(editId
      ? 'Your payment of ' + money(old.amount) + ' dated ' + dlongD(old.paid_on) + ' was changed to ' + money(body.amount) + ' dated ' + dlongD(body.paid_on) + '.'
      : 'A payment of ' + money(body.amount) + ' dated ' + dlongD(body.paid_on) + ' was recorded on your account.');
    setErr(''); setF(blank); setEditId(null); load();
  }
  async function del(x) {
    if (!confirm('Delete this payment of ' + money(x.amount) + '?')) return;
    const r = await supabase.from('payments').delete().eq('id', x.id).select();
    if (r.error) return setErr(r.error.message);
    if (!r.data || !r.data.length) return setErr(PERMISSION_HELP);
    addChange('Your payment of ' + money(x.amount) + ' dated ' + dlongD(x.paid_on) + ' was removed from your account.');
    load();
  }

  return (
    <>
      <h3 style={{ marginTop: '1rem' }}>Payments</h3>
      <div className="grid">
        <div><label htmlFor="pp1">Date paid</label><input id="pp1" type="date" value={f.paid_on} onChange={(e) => setF({ ...f, paid_on: e.target.value })} /></div>
        <div><label htmlFor="pp2">Amount (GH₵)</label><input id="pp2" type="number" min="0" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
        <div><label htmlFor="pp3">Note</label><input id="pp3" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
      </div>
      {err && <div className="msg err">{err}</div>}
      <p>
        <button type="button" className="btn sm" onClick={save}>{editId ? 'Save payment' : 'Add payment'}</button>{' '}
        {editId && <button type="button" className="btn alt sm" onClick={() => { setEditId(null); setF(blank); }}>Cancel</button>}
      </p>
      {list.length === 0 && <p><small>No payments logged.</small></p>}
      {list.map((x) => (
        <div className="row" key={x.id}>
          <span>{dlongD(x.paid_on)} · <b>{money(x.amount)}</b>{x.note ? ' · ' + x.note : ''}</span>
          <button type="button" className="btn alt sm" onClick={() => { setEditId(x.id); setF({ paid_on: x.paid_on, amount: x.amount, note: x.note || '' }); }}>Edit</button>
          <button type="button" className="btn del sm" onClick={() => del(x)}>Delete</button>
        </div>
      ))}
    </>
  );
}

function EditPanel({ s, onClose, onSaved }) {
  const [pl, setPl] = useState(s.rawPlan);
  const [orig] = useState(s.rawPlan); // what the student originally requested (frozen when the panel opens)
  const start0 = { full_name: s.full_name || '', email: s.email || '', level: s.level || '', birthday: s.birthday || '', phone: s.phone || '', payment_option: s.payment_option || '', fees_total: s.fees_total ?? 0 };
  const [base, setBase] = useState(start0);
  const [origEmail] = useState(s.email || '');
  const [decision, setDecision] = useState('Approved as requested');
  const [f, setF] = useState(start0);
  const [freq, setFreq] = useState(pl?.frequency || 'monthly');
  const [start, setStart] = useState(pl?.due_date || '');
  const [amount, setAmount] = useState(pl?.amount ?? '');
  const [net, setNet] = useState(pl?.payment_network || '');
  const [extra, setExtra] = useState('');
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);
  const [custom, setCustom] = useState(null);
  const [changes, setChanges] = useState([]);
  const [customChange, setCustomChange] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const addChange = (t) => { setChanges((c) => [...c, t]); setCustomChange(null); };

  const per = (fr) => (fr === 'weekly' ? 'week' : 'month');
  const planDesc = (x) => money(x.amount) + ' every ' + per(x.frequency) + ' by ' + (x.payment_network || 'Mobile Money') + ', starting ' + dlongD(x.due_date);

  async function save(e) {
    e.preventDefault();
    const clean = { ...f, full_name: f.full_name.trim(), email: f.email.trim(), level: f.level.trim(), phone: f.phone.trim(), fees_total: Number(f.fees_total) || 0 };
    const a = await supabase.from('profiles').update({ ...clean, birthday: clean.birthday || null }).eq('id', s.id).select('id');
    if (a.error) return setErr(a.error.message);
    if (!a.data || !a.data.length) return setErr(PERMISSION_HELP);

    const found = [];
    [['full_name', 'name'], ['email', 'email address'], ['level', 'level'], ['birthday', 'birthday'], ['phone', 'phone number'], ['payment_option', 'payment option'], ['fees_total', 'total fees']].forEach(([k, label]) => {
      const show = (v) => (k === 'fees_total' ? money(v) : k === 'birthday' && v ? dlongD(v) : String(v));
      const o = k === 'fees_total' ? Number(base[k]) || 0 : String(base[k] || '').trim();
      const n = clean[k];
      if (o === n || (k === 'fees_total' && !o && !n)) return;
      if (!o) found.push('Your ' + label + ' was added: ' + show(n) + '.');
      else if (!n) found.push('Your ' + label + ' was removed.');
      else found.push('Your ' + label + ' was changed from ' + show(o) + ' to ' + show(n) + '.');
    });

    if (start && amount !== '') {
      const body = { frequency: freq, due_date: start, amount: Number(amount), repeat_monthly: freq === 'monthly', payment_network: net || null, note: 'Feeding' };
      const b = pl
        ? await supabase.from('due_dates').update(body).eq('id', pl.id).select()
        : await supabase.from('due_dates').insert({ ...body, user_id: s.id }).select();
      if (b.error) return setErr(b.error.message);
      if (!b.data || !b.data.length) return setErr(PERMISSION_HELP);
      const nw = { ...body };
      if (!pl) found.push('A feeding payment plan was set up for you: ' + planDesc(nw) + '.');
      else if (pl.frequency !== nw.frequency || pl.due_date !== nw.due_date || Number(pl.amount) !== nw.amount || (pl.payment_network || null) !== nw.payment_network)
        found.push('Your feeding payment plan was changed from ' + planDesc(pl) + ' to ' + planDesc(nw) + '.');
      setPl(b.data[0]);
    }
    setBase(clean);
    if (found.length) { setChanges((c) => [...c, ...found]); setCustomChange(null); }
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

  const dlong = dlongD;
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

  const changeEmail = [
    `Dear ${first},`, '',
    'We are writing to let you know that the Daakyehene Foundation has updated your student record. ' + changes.join(' '), '',
    'If any of this is not correct, please reply to this email and we will put it right.', '',
    'Kind regards,', 'Daakyehene Foundation',
  ].join('\n');
  const changeText = customChange ?? changeEmail;
  const changeSubject = 'Update to your Daakyehene Foundation student record';
  const ccOld = origEmail && f.email.trim() && origEmail !== f.email.trim() ? '&cc=' + encodeURIComponent(origEmail) : '';

  return (
    <section className="card edit-panel">
      <h2>Edit {s.full_name || s.email}</h2>
      <form onSubmit={save}>
        <div className="grid">
          <div><label htmlFor="ef1">Full name</label><input id="ef1" value={f.full_name} onChange={set('full_name')} /></div>
          <div><label htmlFor="ef0">Email (contact email)</label><input id="ef0" type="email" value={f.email} onChange={set('email')} /></div>
          <div><label htmlFor="ef2">Level</label><input id="ef2" value={f.level} onChange={set('level')} /></div>
          <div><label htmlFor="efb">Birthday</label><input id="efb" type="date" value={f.birthday} onChange={set('birthday')} /></div>
          <div><label htmlFor="ef3">Phone</label><input id="ef3" type="tel" value={f.phone} onChange={set('phone')} /></div>
          <div><label htmlFor="efo">Payment option</label>
            <select id="efo" value={f.payment_option} onChange={set('payment_option')}>
              <option value="">Choose…</option><option>Weekly</option><option>Monthly</option><option>Full payment</option>
            </select></div>
          <div><label htmlFor="ef4">Total fees (GH₵)</label><input id="ef4" type="number" min="0" value={f.fees_total} onChange={set('fees_total')} /></div>
        </div>
        <p><small>Changing the email here changes the contact email used for messages. The student still logs in with the email they signed up with.</small></p>
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
        <label htmlFor="ef9">Plan decision (for the approval email)</label>
        <select id="ef9" value={decision} onChange={(e) => { setDecision(e.target.value); setCustom(null); }}>
          <option>Approved as requested</option><option>Approved with changes</option><option>Not approved</option>
        </select>
        <label htmlFor="ef8">Note to the student (reason or extra information)</label>
        <input id="ef8" placeholder="e.g. Payments are due before 6pm." value={extra} onChange={(e) => { setExtra(e.target.value); setCustom(null); }} />
        {err && <div className="msg err">{err}</div>}
        {saved && <div className="msg">Saved.</div>}
        <p>
          <button className="btn">Save changes</button>{' '}
          <button type="button" className="btn alt" onClick={onClose}>Close</button>
        </p>
      </form>

      <StudentPayments s={s} addChange={addChange} />

      {changes.length > 0 && (
        <>
          <h3 style={{ marginTop: '1rem' }}>Message about the changes</h3>
          <label htmlFor="cm">Email draft (you can edit the wording before sending)</label>
          <textarea id="cm" className="draft" rows={12} value={changeText} onChange={(e) => setCustomChange(e.target.value)} />
          <p className="remind">
            {f.email.trim() && <a className="btn sm" href={`mailto:${f.email.trim()}?subject=${encodeURIComponent(changeSubject)}${ccOld}&body=${encodeURIComponent(changeText)}`}>Email student</a>}{' '}
            {phone && <a className="btn alt sm" href={`https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(changeText)}`} target="_blank" rel="noreferrer">WhatsApp</a>}{' '}
            <button type="button" className="btn alt sm" onClick={() => { setChanges([]); setCustomChange(null); }}>Clear</button>
          </p>
        </>
      )}

      {saved && (
        <details style={{ marginTop: '1rem' }}>
          <summary>Feeding plan decision email (approval)</summary>
          <label htmlFor="em">Email draft (you can edit the wording before sending)</label>
          <textarea id="em" className="draft" rows={14} value={emailText} onChange={(e) => setCustom(e.target.value)} />
          <p className="remind">
            {f.email && <a className="btn sm" href={`mailto:${f.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailText)}`}>Email student</a>}{' '}
            {phone && <a className="btn alt sm" href={`sms:${phone}?body=${encodeURIComponent(text)}`}>SMS</a>}{' '}
            {phone && <a className="btn alt sm" href={`https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">WhatsApp</a>}
          </p>
        </details>
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
  const [q, setQ] = useState('');
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

  async function removeStudent(s) {
    const who = s.full_name || s.email;
    if (!confirm('Delete ' + who + '?\n\nThis permanently removes their login (email and password) and all their details, payments and applications. They will no longer be able to sign in. This cannot be undone.')) return;
    setNote('');
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/delete-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (data.session ? data.session.access_token : '') },
        body: JSON.stringify({ userId: s.id }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'Delete failed');
      if (editing === s.id) setEditing(null);
      setNote(who + ' was deleted.');
      load();
    } catch (e) {
      setNote(e.message);
    }
  }

  function csv() {
    const head = 'Name,Email,Phone,Level,Birthday,Option,Fees,Paid,Balance,Feeding plan,Next payment';
    const body = rows.map((s) => [s.full_name, s.email, s.phone, s.level, s.birthday, s.payment_option, s.fees_total, s.paid, (s.fees_owing != null ? s.fees_owing : s.fees_total - s.paid), s.plan, fmt(s.next)].map((v) => `"${v ?? ''}"`).join(','));
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
  const t = q.trim().toLowerCase();
  const shown = rows.filter((s) => !t || String(name(s) || '').toLowerCase().includes(t) || String(s.email || '').toLowerCase().includes(t));

  return (
    <>
      <div className="top"><b>Admin · Students</b><Link href="/dashboard">My dashboard</Link></div>
      <div className="wrap">
        {editing && rows.find((x) => x.id === editing) && (
          <EditPanel key={editing} s={rows.find((x) => x.id === editing)} onClose={() => setEditing(null)} onSaved={load} />
        )}
        <section className="card">
          <h2>People with accounts ({rows.length})</h2>
          <p><Link className="btn alt sm" href="/admin/applications">Applications</Link></p>
          <input placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} />
          {note && <div className="msg">{note}</div>}
          {shown.length === 0 && <p><small>No one found.</small></p>}
          {shown.map((s) => (
            <div className="row" key={s.id}>
              <span><b>{name(s)}</b><br /><small>{s.email}{s.is_admin ? ' · Admin' : ''}</small></span>
              <button type="button" className="btn sm" onClick={() => { setEditing(s.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button>
              {s.id !== meId && !s.is_admin && <button type="button" className="btn del sm" onClick={() => removeStudent(s)}>Delete</button>}
            </div>
          ))}
        </section>

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
        </section>

        <div className="card scroll">
          <p><button className="btn" onClick={csv}>Download CSV</button></p>
          {note && <div className="msg">{note}</div>}
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Level</th><th>Phone</th><th>Birthday</th><th>Fees</th><th>Paid</th><th>Balance</th><th>Feeding plan</th><th>Next payment</th><th>Access</th><th>Details</th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}><td>{name(s)}</td><td>{s.email}</td><td>{s.level}</td><td>{s.phone}</td><td>{s.birthday}</td>
                  <td>{s.fees_total}</td><td>{s.paid}</td><td>{s.fees_owing != null ? s.fees_owing : Math.max(0, s.fees_total - s.paid)}</td>
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
