'use client';
import Skeleton from '../Skeleton';
import Empty from '../Empty';
import CountUp from '../CountUp';
import { feeInfo } from '../../lib/fee';
import { notify } from '../../lib/toast';
import Image from 'next/image';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { supabase, UPLOAD_FORM, PAYMENT_FORM } from '../../lib/supabase';
import { nextOccurrence, nextBirthday, daysUntil, googleLink, downloadIcs, ruleFor } from '../../lib/cal';
const Budget = dynamic(() => import('./Budget'), { ssr: false, loading: () => <Skeleton /> });
const Results = dynamic(() => import('./Results'), { ssr: false, loading: () => <Skeleton /> });
const DataSupport = dynamic(() => import('./DataSupport'), { ssr: false, loading: () => <Skeleton /> });
const DataSupportAdmin = dynamic(() => import('./DataSupportAdmin'), { ssr: false, loading: () => <Skeleton /> });
const RequestsAdmin = dynamic(() => import('./RequestsAdmin'), { ssr: false, loading: () => <Skeleton /> });
const RequestTab = dynamic(() => import('./RequestTab'), { ssr: false, loading: () => <Skeleton /> });
const SendPayment = dynamic(() => import('./SendPayment'), { ssr: false, loading: () => <Skeleton /> });
import ReceivedPayments from './ReceivedPayments';
const StudentFees = dynamic(() => import('./StudentFees'), { ssr: false, loading: () => <Skeleton /> });

const money = (n) => 'GH₵ ' + Number(n || 0).toLocaleString();
const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const NETWORKS = ['MTN MoMo', 'Telecel Cash', 'AT Money'];
const TITLE = 'Daakyehene Foundation feeding payment';

// Read-only: shows the student the terms the Foundation has set (Term 1, Term 2 ...) with the fee and the
// amount owing typed for each one. Students cannot change these. Only the admin can, from the Student fees tab.
function FeeTerms({ terms }) {
  if (!terms || !terms.length) return null;
  const rows = terms.map((t) => {
    const fee = Number(t.amount || 0);
    const ow = t.owing == null ? fee : Number(t.owing || 0);
    return { ...t, fee, ow };
  });
  const years = [];
  rows.forEach((r) => { const y = (r.year_label || '').trim(); if (!years.includes(y)) years.push(y); });
  return (
    <div className="ft">
      <style dangerouslySetInnerHTML={{ __html: '.ft{margin-top:14px;border-top:1px solid var(--line);padding-top:10px}.ft h3{margin:0 0 6px;font-size:1rem}.ft-yr{display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 10px;margin-top:8px;padding:7px 10px;border-radius:10px;background:#f5f8fb;font-size:.9rem}.ft-row{display:flex;align-items:center;gap:10px;padding:.55rem .1rem;border-top:1px solid var(--line)}.ft-row>span:first-child{flex:1;min-width:0;overflow-wrap:anywhere}.ft-row small{display:block;color:#6b7785}.ft-row .fee-tag{margin:0;white-space:nowrap}html.dark .ft-yr{background:rgba(255,255,255,.07)}html.dark .ft-row small{color:#9fb0c4}' }} />
      <h3>Your terms</h3>
      {years.map((y) => {
        const g = rows.filter((r) => (r.year_label || '').trim() === y);
        const yt = g.reduce((t, r) => t + r.fee, 0);
        const yo = g.reduce((t, r) => t + r.ow, 0);
        return (
          <div key={y || 'none'}>
            {(years.length > 1 || y) && <div className="ft-yr"><b>{y ? 'Year ' + y : 'Other'}</b><span>Fees {money(yt)} · Owing {money(yo)}</span></div>}
            {g.map((r) => {
              const info = feeInfo(r.fee, r.ow, r.fee > 0 ? Math.max(0, Math.min(100, Math.round(((r.fee - r.ow) / r.fee) * 100))) : 0);
              return (
                <div className="ft-row" key={r.id}>
                  <span><b>{r.term_name}</b><small>Fee {money(r.fee)}</small></span>
                  <span className={'fee-tag sm ' + info.cls}>{r.ow > 0 ? 'Owing ' + money(r.ow) : 'Paid'}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

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
    notify('Feeding plan saved'); setErr(''); setEdit(false); reload();
  }
  async function remove() {
    if (!confirm('Remove your feeding plan?')) return;
    await supabase.from('due_dates').delete().eq('id', plan.id);
    notify('Feeding plan removed'); setStart(''); setAmount(''); setEdit(true); reload();
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
    notify(editing ? 'Payment updated' : 'Payment added'); setErr(''); setForm(blank); setEditing(null); reload();
  }
  async function del(id) {
    if (!confirm('Delete this payment?')) return;
    await supabase.from('payments').delete().eq('id', id);
    notify('Payment deleted');
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
      {rows.length === 0 && <Empty icon="💳" title="No payments yet" hint="Add your first one above." />}
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
  const [terms, setTerms] = useState([]);
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
    const [a, b, c, d, e] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('due_dates').select('*').eq('user_id', uid).order('created_at').limit(1),
      supabase.from('payments').select('*').eq('user_id', uid).order('paid_on', { ascending: false }),
      supabase.from('applications').select('status').eq('user_id', uid).eq('program', 'Daakyehene Foundation').maybeSingle(),
      supabase.from('fee_terms').select('*').eq('user_id', uid).order('created_at'),
    ]);
    if (a.error || !a.data) { await supabase.auth.signOut(); return router.replace('/'); }
    setP(a.data); setPlan((b.data || [])[0] || null); setPays(c.data || []);
    setApplication(d.data || null);
    setTerms(e && !e.error ? (e.data || []) : []);
  }, [router]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    try { if (localStorage.getItem('dhf-results')) { localStorage.removeItem('dhf-results'); setTab('results'); } } catch (e) { /* ignore */ }
  }, []);

  if (!p) return <div className="wrap"><Skeleton hero /></div>;

  const paid = pays.reduce((s, x) => s + Number(x.amount), 0);
  const total = Number(p.fees_total || 0);
  const owing = p.fees_owing != null ? Number(p.fees_owing) : Math.max(0, total - paid);
  const pct = total > 0 ? Math.max(0, Math.min(100, Math.round(((terms.length ? total - owing : paid) / total) * 100))) : 0; // with terms, progress = fees minus owing
  const fee = (total > 0 || p.fees_owing != null) ? feeInfo(total, owing, pct) : null;
  const next = plan ? nextOccurrence(plan.due_date, plan.frequency) : null;
  const bday = nextBirthday(p.birthday);
  const bd = bday ? daysUntil(bday) : null;

  async function saveProfile(e) {
    e.preventDefault();
    const { full_name, level, birthday, phone, payment_option } = p;
    const { error } = await supabase.from('profiles').update({ full_name, level, birthday: birthday || null, phone, payment_option }).eq('id', user);
    setMsg(error ? error.message : (notify('Details saved') ? '' : 'Saved.'));
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
            {fee && <div className="fee-line"><span className={'fee-tag ' + fee.cls}>{fee.label}</span><small>{pct}% paid</small></div>}
            <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100"><i style={{ width: pct + '%', background: fee ? fee.bg : undefined }} /></div>
            <div className="grid">
              <div className="stat"><small>Paid</small><b><CountUp prefix="GH₵ " value={paid} /></b></div>
              <div className="stat"><small>Balance</small><b><CountUp prefix="GH₵ " value={owing} /></b></div>
              <div className="stat"><small>Next payment</small><b>{next ? `${fmt(next)} (${daysUntil(next)}d)` : 'Not set'}</b></div>
              <div className="stat"><small>Birthday</small><b>{bd === null ? 'Add yours in Profile' : bd === 0 ? 'Today' : bd + ' days'}</b></div>
            </div>
          </section>
          <section className="card fees-card">
            <h2>Your fees</h2>
            {(total > 0 || p.fees_owing != null) ? (<>
              <p style={{ fontSize: '1.6rem', margin: '4px 0' }}><b>{owing > 0 ? `You owe ${money(owing)}` : 'Nothing owing. Thank you!'}</b></p>
              {total > 0 && <p><small>Full fees {money(total)}</small></p>}
            </>) : <p>Your full fees have not been entered yet. The Foundation will update this soon.</p>}
            <FeeTerms terms={terms} />
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
      <div className="btabs" role="navigation" aria-label="Main tabs">
        {[['home', 'Home', '🏠'], ['results', 'Results', '🎓'], ['data', 'Data', '📶'], ['plan', 'Plan', '🗓️'], ['me', 'Profile', '👤']].map(([k, label, ic]) => (
          <button key={k} type="button" className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined} onClick={() => { setTab(k); setNavOpen(false); window.scrollTo({ top: 0 }); }}>
            <span aria-hidden="true">{ic}</span><small>{label}</small>
          </button>
        ))}
        <button type="button" className={!['home', 'results', 'data', 'plan', 'me'].includes(tab) || navOpen ? 'on' : ''} aria-expanded={navOpen} onClick={() => { setNavOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <span aria-hidden="true">⋯</span><small>More</small>{pending > 0 && <span className="rq-badge">{pending > 99 ? '99+' : pending}</span>}
        </button>
      </div>
    </>
  );
}
