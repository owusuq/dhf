'use client';
import Image from 'next/image';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { supabase, UPLOAD_FORM, PAYMENT_FORM } from '../../lib/supabase';
import { nextOccurrence, nextBirthday, daysUntil, googleLink, downloadIcs, ruleFor } from '../../lib/cal';
const Budget = dynamic(() => import('./Budget'), { ssr: false, loading: () => <p><small>Loading…</small></p> });
const Results = dynamic(() => import('./Results'), { ssr: false, loading: () => <p><small>Loading…</small></p> });
const DataSupport = dynamic(() => import('./DataSupport'), { ssr: false, loading: () => <p><small>Loading…</small></p> });
const DataSupportAdmin = dynamic(() => import('./DataSupportAdmin'), { ssr: false, loading: () => <p><small>Loading…</small></p> });
const RequestsAdmin = dynamic(() => import('./RequestsAdmin'), { ssr: false, loading: () => <p><small>Loading…</small></p> });
const RequestTab = dynamic(() => import('./RequestTab'), { ssr: false, loading: () => <p><small>Loading…</small></p> });
const SendPayment = dynamic(() => import('./SendPayment'), { ssr: false, loading: () => <p><small>Loading…</small></p> });
import ReceivedPayments from './ReceivedPayments';
const StudentFees = dynamic(() => import('./StudentFees'), { ssr: false, loading: () => <p><small>Loading…</small></p> });

const money = (n) => 'GH₵ ' + Number(n || 0).toLocaleString();
const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const NETWORKS = ['MTN MoMo', 'Telecel Cash', 'AT Money'];
const TITLE = 'Daakyehene Foundation feeding payment';

function FeedingPlan({ userId, plan, reload, phone }) {
  const [edit, setEdit] = useState(!plan);
  const [freq, setFreq] = useState(plan?.frequency || 'monthly');
  const [start, setStart] = useState(plan?.due_date || '');
  const [amount, setAmount] = useState(plan?.amount || '');
  const [net, setNet] = useState(plan?.payment_network || '');
  const [ph, setPh] = useState(phone || '');
  const [err, setErr] = useState('');

  async function save(e) {
    e.preventDefault();
    if (!net) return setErr('Please choose your Mobile Money network.');
    const body = { payment_network: net, frequency: freq, due_date: start, amount: Number(amount), repeat_monthly: freq === 'monthly', note: 'Feeding' };
    const { error } = plan
      ? await supabase.from('due_dates').update(body).eq('id', plan.id)
      : await supabase.from('due_dates').insert({ ...body, user_id: userId });
    if (error) return setErr(error.message);
    const pr = await supabase.from('profiles').update({ phone: ph.trim() }).eq('id', userId);
    if (pr.error) return setErr(pr.error.message);
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
        <p>Pay by Mobile Money: <b>{plan.payment_network || 'network not chosen'}</b></p>
        <p>Reminders go to: <b>{phone || 'no phone saved'}</b>. Tap Change to update it.</p>
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
      <p>We accept <b>Mobile Money (MoMo) only</b>. Five quick steps. You only do this once.</p>
      <label>1. How often will you pay?</label>
      <div className="choice">
        <button type="button" className={freq === 'weekly' ? 'on' : ''} onClick={() => setFreq('weekly')}>Every week</button>
        <button type="button" className={freq === 'monthly' ? 'on' : ''} onClick={() => setFreq('monthly')}>Every month</button>
      </div>
      <label htmlFor="start">2. When is your first payment?</label>
      <input id="start" type="date" required value={start} onChange={(e) => setStart(e.target.value)} />
      <label htmlFor="amt">3. How much each time? (GH₵)</label>
      <input id="amt" type="number" min="1" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
      <label>4. Which Mobile Money network will you pay with?</label>
      <div className="choice three">
        {NETWORKS.map((n) => <button type="button" key={n} className={net === n ? 'on' : ''} onClick={() => setNet(n)}>{n}</button>)}
      </div>
      <label htmlFor="ph">5. Your MoMo phone number (we send reminders here too)</label>
      <input id="ph" type="tel" required placeholder="e.g. 0241234567" value={ph} onChange={(e) => setPh(e.target.value)} />
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
  const [application, setApplication] = useState(null);
  const [msg, setMsg] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [pending, setPending] = useState(0);
  const isAdminUser = !!(p && p.is_admin);
  useEffect(() => {
    if (!isAdminUser) return;
    supabase.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'pending').then(({ count }) => setPending(count || 0));
  }, [isAdminUser]);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return router.replace('/');
    const uid = data.session.user.id;
    setUser(uid);
    const [a, b, c, d] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('due_dates').select('*').eq('user_id', uid).order('created_at').limit(1),
      supabase.from('payments').select('*').eq('user_id', uid).order('paid_on', { ascending: false }),
      supabase.from('applications').select('status').eq('user_id', uid).eq('program', 'Daakyehene Foundation').maybeSingle(),
    ]);
    if (a.error || !a.data) { await supabase.auth.signOut(); return router.replace('/'); }
    setP(a.data); setPlan((b.data || [])[0] || null); setPays(c.data || []);
    setApplication(d.data || null);
  }, [router]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    try { if (localStorage.getItem('dhf-results')) { localStorage.removeItem('dhf-results'); setTab('results'); } } catch (e) { /* ignore */ }
  }, []);

  if (!p) return <div className="wrap">Loading…</div>;

  const paid = pays.reduce((s, x) => s + Number(x.amount), 0);
  const total = Number(p.fees_total || 0);
  const owing = p.fees_owing != null ? Number(p.fees_owing) : Math.max(0, total - paid);
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const next = plan ? nextOccurrence(plan.due_date, plan.frequency) : null;
  const bday = nextBirthday(p.birthday);
  const bd = bday ? daysUntil(bday) : null;

  async function saveProfile(e) {
    e.preventDefault();
    const { full_name, level, birthday, phone, payment_option } = p;
    const { error } = await supabase.from('profiles').update({ full_name, level, birthday: birthday || null, phone, payment_option }).eq('id', user);
    setMsg(error ? error.message : 'Saved.');
  }
  const sp = (k) => (e) => setP({ ...p, [k]: e.target.value });

  return (
    <>
      <div className="top">
        <Link href="/dashboard" className="logo-link" aria-label="Home" onClick={() => { setTab('home'); setNavOpen(false); }}><Image src="/logo.jpeg" alt="" width={92} height={92} priority onError={(e) => (e.target.style.display = 'none')} />
        <b>Daakyehene Foundation</b></Link>
        {p.is_admin && <Link href="/admin">Admin</Link>}
        <button onClick={async () => { await supabase.auth.signOut(); router.replace('/'); }}>Sign out</button>
      </div>
      <div className="wrap">
        <>
        <style dangerouslySetInnerHTML={{ __html: ".gnav-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}.gnav-bar button{width:48px;height:40px;border:1px solid rgba(0,0,0,.12);border-radius:8px;background:#fff;font-size:22px;line-height:1;cursor:pointer}.gnav{background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:12px;padding:8px 10px;margin-bottom:14px}.gnav-g+.gnav-g{margin-top:6px;padding-top:6px;border-top:1px solid rgba(0,0,0,.08)}.gnav-t{font-size:12px;color:#7a7a7a;padding:4px 6px}.gnav-r{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:6px}.gnav-r button{height:42px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(0,0,0,.12);border-radius:8px;background:transparent;color:inherit;font-size:14px;cursor:pointer}.gnav-r button.on{background:#1e3a5f;border-color:#1e3a5f;color:#fff;font-weight:600}" }} />
        <div className="gnav-bar"><b>{({ home: 'Home', results: 'Results', data: 'Data Support', plan: 'Feeding plan', me: 'Profile', budget: 'Budget \u00a3', requests: 'Requests', request: 'Request', sendpay: 'Send payment', fees: 'Student fees' })[tab]}</b><button type="button" aria-label="Menu" aria-expanded={navOpen} onClick={() => setNavOpen(!navOpen)}>{'\u22ef'}{pending > 0 && <span className="rq-badge rq-corner">{pending > 99 ? '99+' : pending}</span>}</button></div>
        {navOpen && <nav className="gnav" role="tablist">
          {[
            ['Overview', [['home', 'Home']]],
            ['Learning', [['results', 'Results'], ['data', 'Data Support']]],
            ['My account', [['plan', 'Feeding plan'], ['me', 'Profile'], ['request', 'Request']]],
            ...(p.is_admin ? [['Admin tools', [['budget', 'Budget \u00a3'], ['requests', 'Requests'], ['sendpay', 'Send payment'], ['fees', 'Student fees']]]] : []),
          ].map(([title, items]) => (
            <div className="gnav-g" key={title}>
              <div className="gnav-t">{title}</div>
              <div className="gnav-r">
                {items.map(([k, label]) => (
                  <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setNavOpen(false); }}>{label}{k === 'requests' && pending > 0 && <span className="rq-badge">{pending > 99 ? '99+' : pending}</span>}</button>
                ))}
              </div>
            </div>
          ))}
        </nav>}
        </>

        {tab === 'home' && (<>
          {p.is_admin && <Link className="btn admin-go" href="/admin">Open Admin panel</Link>}
          {p.is_admin && <Link className="btn admin-go" href="/admin/applications">Applications</Link>}
          {p.is_admin && <Link className="btn admin-go" href="/admin/delete">Delete students</Link>}
          <ReceivedPayments userId={user} />
          {bd === 0 && <div className="party">Happy birthday, {p.full_name || 'friend'}! 🎉</div>}
          <section className="card hero">
            <h2>{(() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; })()}{p.full_name ? ', ' + p.full_name.split(' ')[0] : ''}</h2>
            <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100"><i style={{ width: pct + '%' }} /></div>
            <div className="grid">
              <div className="stat"><small>Paid</small><b>{money(paid)}</b></div>
              <div className="stat"><small>Balance</small><b>{money(owing)}</b></div>
              <div className="stat"><small>Next payment</small><b>{next ? `${fmt(next)} (${daysUntil(next)}d)` : 'Not set'}</b></div>
              <div className="stat"><small>Birthday</small><b>{bd === null ? 'Add yours in Profile' : bd === 0 ? 'Today' : bd + ' days'}</b></div>
            </div>
          </section>
          <section className="card" style={{ border: '2px solid #c9a227', background: '#fff8e1' }}>
            <h2>Your fees</h2>
            {(total > 0 || p.fees_owing != null) ? (<>
              <p style={{ fontSize: '1.6rem', margin: '4px 0' }}><b>{owing > 0 ? `You owe ${money(owing)}` : 'Nothing owing. Thank you!'}</b></p>
              {total > 0 && <p><small>Full fees {money(total)}</small></p>}
            </>) : <p>Your full fees have not been entered yet. The Foundation will update this soon.</p>}
          </section>
          <section className="card">
            <h2>Apply to the Daakyehene Foundation</h2>
            {application
              ? <p>Your application: <b>{application.status === 'pending' ? 'Pending' : application.status === 'accepted' ? 'Accepted' : 'Not accepted'}</b></p>
              : <p>Want to join? Send your application in a few minutes.</p>}
            <Link className="btn" href="/apply">{application ? 'View application' : 'Apply now'}</Link>
          </section>
          {!plan && <section className="card"><h2>Set up your feeding plan</h2><p>Choose how often you pay and get calendar reminders.</p><button className="btn" onClick={() => setTab('plan')}>Set it up</button></section>}
          <section className="card">
            <h2>Forms</h2>
            <a className="btn" href={UPLOAD_FORM} target="_blank" rel="noreferrer">Upload a receipt</a>{' '}
            <a className="btn alt" href={PAYMENT_FORM} target="_blank" rel="noreferrer">Payment form</a>
          </section>
          <Payments userId={user} rows={pays} reload={load} />
        </>)}

        {tab === 'budget' && p.is_admin && <Budget userId={user} />}

        {tab === 'requests' && p.is_admin && <RequestsAdmin onCount={setPending} />}

        {tab === 'sendpay' && p.is_admin && <SendPayment adminId={user} />}

        {tab === 'fees' && p.is_admin && <StudentFees />}

        {tab === 'request' && <RequestTab name={p.full_name} contact={p.phone || p.email} />}

        {tab === 'results' && <Results isAdmin={!!p.is_admin} />}

        {tab === 'data' && (p.is_admin ? <DataSupportAdmin /> : <DataSupport />)}

        {tab === 'plan' && <FeedingPlan key={plan?.id || 'new'} userId={user} plan={plan} reload={load} phone={p.phone} />}

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
              <div><label htmlFor="f">Total fees (GH₵)</label><input id="f" type="number" value={p.fees_total ?? 0} readOnly disabled title="Set by the Foundation" /></div>
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