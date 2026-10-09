'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, UPLOAD_FORM, PAYMENT_FORM } from '../../lib/supabase';
import { nextOccurrence, nextBirthday, daysUntil, googleLink, downloadIcs, ruleFor } from '../../lib/cal';

const money = (n) => 'GH₵ ' + Number(n || 0).toLocaleString();
const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const TITLE = 'Daakyehene Foundation feeding payment';

function FeedingPlan({ userId, plan, reload }) {
  const [edit, setEdit] = useState(!plan);
  const [freq, setFreq] = useState(plan?.frequency || 'monthly');
  const [start, setStart] = useState(plan?.due_date || '');
  const [amount, setAmount] = useState(plan?.amount || '');
  const [err, setErr] = useState('');

  async function save(e) {
    e.preventDefault();
    const body = { frequency: freq, due_date: start, amount: Number(amount), repeat_monthly: freq === 'monthly', note: 'Feeding' };
    const { error } = plan
      ? await supabase.from('due_dates').update(body).eq('id', plan.id)
      : await supabase.from('due_dates').insert({ ...body, user_id: userId });
    if (error) return setErr(error.message);
    setErr(''); setEdit(false); reload();
  }
  async function remove() {
    if (!confirm('Remove your feeding plan?')) return;
    await supabase.from('due_dates').delete().eq('id', plan.id);
    setStart(''); setAmount(''); setEdit(true); reload();
  }

  if (plan && !edit) {
    const next = nextOccurrence(plan.due_date, plan.frequency);
    const rule = ruleFor(plan.frequency);
    return (
      <section className="card">
        <h2>Your feeding plan</h2>
        <p className="plan-big">{money(plan.amount)} every {plan.frequency === 'weekly' ? 'week' : 'month'}</p>
        <p>{next ? `Next payment: ${fmt(next)} (${daysUntil(next)} ${daysUntil(next) === 1 ? 'day' : 'days'})` : 'Your start date has passed. Tap Change to set a new one.'}</p>
        <p>This repeats every {plan.frequency === 'weekly' ? 'week' : 'month'} until you remove it. Add it to your calendar once and it repeats by itself and reminds you the day before.</p>
        <p className="note">Changed your plan? Delete the old calendar event and add the new one, because calendars don't update by themselves.</p>
        <p>
          <a className="btn" href={googleLink(TITLE, plan.due_date, rule)} target="_blank" rel="noreferrer">Add to Google Calendar</a>{' '}
          <button className="btn alt" onClick={() => downloadIcs(TITLE, plan.due_date, rule)}>Add to my phone</button>
        </p>
        <p>
          <button className="btn alt sm" onClick={() => setEdit(true)}>Change</button>{' '}
          <button className="btn del sm" onClick={remove}>Remove</button>
        </p>
      </section>
    );
  }
  return (
    <form className="card" onSubmit={save}>
      <h2>Set up your feeding payment</h2>
      <p>Three quick steps. You only do this once.</p>
      <label>1. How often will you pay?</label>
      <div className="choice">
        <button type="button" className={freq === 'weekly' ? 'on' : ''} onClick={() => setFreq('weekly')}>Every week</button>
        <button type="button" className={freq === 'monthly' ? 'on' : ''} onClick={() => setFreq('monthly')}>Every month</button>
      </div>
      <label htmlFor="start">2. When is your first payment?</label>
      <input id="start" type="date" required value={start} onChange={(e) => setStart(e.target.value)} />
      <label htmlFor="amt">3. How much each time? (GH₵)</label>
      <input id="amt" type="number" min="1" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
      {err && <div className="msg err">{err}</div>}
      <p>
        <button className="btn">Save my feeding plan</button>{' '}
        {plan && <button type="button" className="btn alt" onClick={() => setEdit(false)}>Cancel</button>}
      </p>
    </form>
  );
}

function Payments({ userId, rows, reload }) {
  const blank = { paid_on: '', amount: '', note: '' };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');
  async function save(e) {
    e.preventDefault();
    const body = { paid_on: form.paid_on, amount: Number(form.amount), note: form.note };
    const { error } = editing
      ? await supabase.from('payments').update(body).eq('id', editing)
      : await supabase.from('payments').insert({ ...body, user_id: userId });
    if (error) return setErr(error.message);
    setErr(''); setForm(blank); setEditing(null); reload();
  }
  async function del(id) {
    if (!confirm('Delete this payment?')) return;
    await supabase.from('payments').delete().eq('id', id);
    reload();
  }
  return (
    <section className="card">
      <h2>My payments</h2>
      <p>After you upload a receipt, log the payment here so your progress updates.</p>
      <form onSubmit={save}>
        <div className="grid">
          <div><label htmlFor="po">Date paid</label><input id="po" type="date" required value={form.paid_on} onChange={(e) => setForm({ ...form, paid_on: e.target.value })} /></div>
          <div><label htmlFor="pa">Amount (GH₵)</label><input id="pa" type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <div><label htmlFor="pn">Note</label><input id="pn" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
        </div>
        {err && <div className="msg err">{err}</div>}
        <p>
          <button className="btn">{editing ? 'Save changes' : 'Add payment'}</button>{' '}
          {editing && <button type="button" className="btn alt" onClick={() => { setEditing(null); setForm(blank); }}>Cancel</button>}
        </p>
      </form>
      {rows.length === 0 && <p>No payments yet. Add your first one above.</p>}
      {rows.map((r) => (
        <div className="row" key={r.id}>
          <span>{fmt(new Date(r.paid_on + 'T00:00:00Z'))} · {money(r.amount)}{r.note ? ' · ' + r.note : ''}</span>
          <button className="btn alt sm" onClick={() => { setEditing(r.id); setForm({ paid_on: r.paid_on, amount: r.amount, note: r.note || '' }); }}>Edit</button>
          <button className="btn del sm" onClick={() => del(r.id)}>Delete</button>
        </div>
      ))}
    </section>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [tab, setTab] = useState('home');
  const [user, setUser] = useState(null);
  const [p, setP] = useState(null);
  const [plan, setPlan] = useState(null);
  const [pays, setPays] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return router.replace('/');
    const uid = data.session.user.id;
    setUser(uid);
    const [a, b, c] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('due_dates').select('*').eq('user_id', uid).order('created_at').limit(1),
      supabase.from('payments').select('*').eq('user_id', uid).order('paid_on', { ascending: false }),
    ]);
    if (a.error || !a.data) { await supabase.auth.signOut(); return router.replace('/'); }
    setP(a.data); setPlan((b.data || [])[0] || null); setPays(c.data || []);
  }, [router]);
  useEffect(() => { load(); }, [load]);

  if (err) return <div className="wrap"><div className="msg err">{err}</div></div>;
  if (!p) return <div className="wrap">Loading…</div>;

  const paid = pays.reduce((s, x) => s + Number(x.amount), 0);
  const total = Number(p.fees_total || 0);
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const next = plan ? nextOccurrence(plan.due_date, plan.frequency) : null;
  const bday = nextBirthday(p.birthday);
  const bd = bday ? daysUntil(bday) : null;

  async function saveProfile(e) {
    e.preventDefault();
    const { full_name, level, birthday, phone, payment_option, fees_total } = p;
    const { error } = await supabase.from('profiles').update({ full_name, level, birthday: birthday || null, phone, payment_option, fees_total: Number(fees_total) || 0 }).eq('id', user);
    setMsg(error ? error.message : 'Saved.');
  }
  const sp = (k) => (e) => setP({ ...p, [k]: e.target.value });

  return (
    <>
      <div className="top">
        <img src="/logo.jpeg" alt="" onError={(e) => (e.target.style.display = 'none')} />
        <b>Daakyehene Foundation</b>
        {p.is_admin && <Link href="/admin">Admin</Link>}
        <button onClick={async () => { await supabase.auth.signOut(); router.replace('/'); }}>Sign out</button>
      </div>
      <div className="wrap">
        <nav className="tabs" role="tablist">
          {[['home', 'Home'], ['plan', 'Feeding plan'], ['me', 'Profile']].map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
          ))}
        </nav>

        {tab === 'home' && (<>
          {p.is_admin && <Link className="btn admin-go" href="/admin">Open Admin panel</Link>}
          {bd === 0 && <div className="party">Happy birthday, {p.full_name || 'friend'}! 🎉</div>}
          <section className="card hero">
            <h2>Hello{p.full_name ? ', ' + p.full_name.split(' ')[0] : ''}</h2>
            <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100"><i style={{ width: pct + '%' }} /></div>
            <div className="grid">
              <div className="stat"><small>Paid</small><b>{money(paid)}</b></div>
              <div className="stat"><small>Balance</small><b>{money(Math.max(0, total - paid))}</b></div>
              <div className="stat"><small>Next payment</small><b>{next ? `${fmt(next)} (${daysUntil(next)}d)` : 'Not set'}</b></div>
              <div className="stat"><small>Birthday</small><b>{bd === null ? 'Add yours in Profile' : bd === 0 ? 'Today' : bd + ' days'}</b></div>
            </div>
          </section>
          {!plan && <section className="card"><h2>Set up your feeding plan</h2><p>Choose how often you pay and get calendar reminders.</p><button className="btn" onClick={() => setTab('plan')}>Set it up</button></section>}
          <section className="card">
            <h2>Forms</h2>
            <a className="btn" href={UPLOAD_FORM} target="_blank" rel="noreferrer">Upload a receipt</a>{' '}
            <a className="btn alt" href={PAYMENT_FORM} target="_blank" rel="noreferrer">Payment form</a>
          </section>
          <Payments userId={user} rows={pays} reload={load} />
        </>)}

        {tab === 'plan' && <FeedingPlan key={plan?.id || 'new'} userId={user} plan={plan} reload={load} />}

        {tab === 'me' && (
          <form className="card" onSubmit={saveProfile}>
            <h2>My details</h2>
            <div className="grid">
              <div><label htmlFor="a">Full name</label><input id="a" value={p.full_name || ''} onChange={sp('full_name')} /></div>
              <div><label htmlFor="b">Level</label><input id="b" value={p.level || ''} onChange={sp('level')} /></div>
              <div><label htmlFor="c">Birthday</label><input id="c" type="date" value={p.birthday || ''} onChange={sp('birthday')} /></div>
              <div><label htmlFor="d">Phone</label><input id="d" type="tel" value={p.phone || ''} onChange={sp('phone')} /></div>
              <div><label htmlFor="e">Payment option</label>
                <select id="e" value={p.payment_option || ''} onChange={sp('payment_option')}>
                  <option value="">Choose…</option><option>Weekly</option><option>Monthly</option><option>Full payment</option>
                </select></div>
              <div><label htmlFor="f">Total fees (GH₵)</label><input id="f" type="number" min="0" value={p.fees_total ?? 0} onChange={sp('fees_total')} /></div>
            </div>
            {msg && <div className="msg">{msg}</div>}
            <p>
              <button className="btn">Save details</button>{' '}
              {p.birthday && <button type="button" className="btn alt" onClick={() => downloadIcs('Birthday', p.birthday, 'FREQ=YEARLY')}>Add birthday to calendar</button>}
            </p>
          </form>
        )}
      </div>
    </>
  );
}
