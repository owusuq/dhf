'use client';
import Skeleton from '../../Skeleton';
import Empty from '../../Empty';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';

// Ghana numbers: 024... -> +23324...
function intl(phone) {
  let p = String(phone || '').replace(/[^\d+]/g, '');
  if (!p) return '';
  if (p.startsWith('+')) return p;
  if (p.startsWith('00')) return '+' + p.slice(2);
  if (p.startsWith('0')) return '+233' + p.slice(1);
  return '+' + p;
}

const day = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const pill = {
  pending: { text: 'Pending', bg: '#fff3cd', fg: '#7a5b00' },
  accepted: { text: 'Accepted', bg: '#d9f2e3', fg: '#14532d' },
  declined: { text: 'Not accepted', bg: '#fde2e2', fg: '#7f1d1d' },
};

function Pill({ status }) {
  const p = pill[status] || pill.pending;
  return (
    <span style={{ background: p.bg, color: p.fg, fontSize: '0.8rem', padding: '3px 10px', borderRadius: 8, fontWeight: 600 }}>
      {p.text}
    </span>
  );
}

function AppCard({ a, onChange, onDelete }) {
  const [custom, setCustom] = useState(null);
  const [pw, setPw] = useState('');
  const [copiedWhat, setCopiedWhat] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const first = (a.name || 'student').split(' ')[0];
  const table = a.src === 'join' ? 'join_applications' : 'applications';
  const acceptMsg = `Hello ${first}, congratulations! Your application to the ${a.program} has been accepted. ${a.src === 'join' ? 'We will contact you with the next steps.' : 'Please check your student portal for the next steps.'} Daakyehene Foundation`;
  const declineMsg = `Hello ${first}, thank you for applying to the ${a.program}. We could not take your application this time. Please contact us if you have any questions. Daakyehene Foundation`;
  const text = custom ?? (a.status === 'accepted' ? acceptMsg : declineMsg);
  const phone = intl(a.phone);
  const subject = `Your ${a.program} application`;

  // A random password made in this browser. It is shown once here and is never saved in the database.
  function makePassword() {
    const set = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    for (;;) {
      const out = [];
      while (out.length < 12) {
        const b = new Uint8Array(1);
        crypto.getRandomValues(b);
        if (b[0] < 216) out.push(set[b[0] % set.length]); // 216 = 54 * 4, so every character is equally likely
      }
      const p = out.join('');
      if (/[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p)) return p;
    }
  }

  function generate() {
    const p = makePassword();
    setPw(p);
    let base = custom ?? acceptMsg;
    const i = base.indexOf('\n\nYour login details:');
    if (i >= 0) base = base.slice(0, i);
    setCustom(base + '\n\nYour login details:\nWebsite: ' + window.location.origin + '\nEmail: ' + a.email + '\nPassword: ' + p + '\nYou can change the password later with Forgot password on the login page.');
  }

  async function copyText(label, value) {
    try { await navigator.clipboard.writeText(value); } catch (e) { /* ignore */ }
    setCopiedWhat(label);
    setTimeout(() => setCopiedWhat(''), 1500);
  }

  async function decide(status) {
    setBusy(true);
    setErr('');
    const r = await supabase
      .from(table)
      .update({ status, decided_at: status === 'pending' ? null : new Date().toISOString() })
      .eq('id', a.id)
      .select();
    setBusy(false);
    if (r.error) return setErr(r.error.message);
    if (!r.data || !r.data.length) return setErr('Nothing was saved. Run the matching SQL file from the supabase folder in Supabase first.');
    setCustom(null);
    onChange(r.data[0]);
  }

  async function remove() {
    if (!window.confirm('Delete this declined application permanently?')) return;
    setBusy(true);
    setErr('');
    const r = await supabase.from(table).delete().eq('id', a.id).select('id');
    setBusy(false);
    if (r.error) return setErr(r.error.message);
    if (!r.data || !r.data.length) return setErr('Nothing was deleted. Run supabase/applications_delete.sql in Supabase first.');
    onDelete(a.id);
  }

  return (
    <section className="card">
      <div className="row">
        <b>{a.name || '(no name)'}</b>
        <Pill status={a.status} />
      </div>
      <p><small>{a.level || 'Level not set'} &middot; applied {day(a.created_at)}{a.src === 'join' ? ' \u00B7 via application link' : ''}</small></p>
      <p><small>{a.email}{phone ? ' \u00B7 ' + phone : ''}</small></p>
      <p><small>Why they want to join</small><br />{a.reason}</p>
      {err && <div className="msg err">{err}</div>}

      {a.status === 'pending' && (
        <p>
          <button type="button" className="btn" disabled={busy} onClick={() => decide('accepted')}>Accept</button>{' '}
          <button type="button" className="btn alt" disabled={busy} onClick={() => decide('declined')}>Decline</button>
        </p>
      )}

      {a.status !== 'pending' && (
        <>
          <label htmlFor={'m' + a.id}>Message to send (you can edit it)</label>
          <textarea id={'m' + a.id} rows={6} value={text} onChange={(e) => setCustom(e.target.value)} />
          {a.status === 'accepted' && a.src === 'join' && a.email && (
            <div style={{ border: '1px solid #d9dee5', borderRadius: 10, padding: '10px 12px', margin: '10px 0' }}>
              <p style={{ margin: '0 0 6px' }}><b>Login details for this person</b></p>
              <p style={{ margin: '0 0 8px' }}><small>Make a password, add it to the message above, then create the user in Supabase with the same email and password.</small></p>
              <p style={{ margin: '0 0 8px' }}>
                <button type="button" className="btn sm" onClick={generate}>{pw ? 'Make a different password' : 'Generate password'}</button>
              </p>
              {pw && (
                <>
                  <p style={{ margin: '0 0 4px' }}>Email: <b>{a.email}</b> <button type="button" className="btn alt sm" onClick={() => copyText('email', a.email)}>{copiedWhat === 'email' ? 'Copied' : 'Copy'}</button></p>
                  <p style={{ margin: '0 0 8px' }}>Password: <b style={{ fontFamily: 'monospace', fontSize: '1.05rem' }}>{pw}</b> <button type="button" className="btn alt sm" onClick={() => copyText('password', pw)}>{copiedWhat === 'password' ? 'Copied' : 'Copy'}</button></p>
                  <p style={{ margin: 0 }}><small>In Supabase: Authentication, then Users, then Add user, then Create new user. Paste the email and password and tick Auto Confirm User. This password is not saved anywhere, so copy it before you leave this page.</small></p>
                </>
              )}
            </div>
          )}
          <p className="remind">
            {phone && <a className="btn sm" href={`https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">WhatsApp</a>}{' '}
            {phone && <a className="btn alt sm" href={`sms:${phone}?body=${encodeURIComponent(text)}`}>SMS</a>}{' '}
            {a.email && <a className="btn alt sm" href={`mailto:${a.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`}>Email</a>}{' '}
            {!phone && !a.email && <small>No contact saved</small>}
            <button type="button" className="btn alt sm" disabled={busy} onClick={() => decide('pending')}>Change decision</button>{' '}
            {a.status === 'declined' && <button type="button" className="btn alt sm" disabled={busy} onClick={remove}>Delete</button>}
          </p>
        </>
      )}
    </section>
  );
}

export default function Applications() {
  const router = useRouter();
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.origin + '/join'); } catch (e) { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return router.replace('/');
    const me = await supabase.from('profiles').select('is_admin').eq('id', data.session.user.id).single();
    if (!me.data || !me.data.is_admin) return router.replace('/');
    const [a, p, j] = await Promise.all([
      supabase.from('applications').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, email, level, phone'),
      supabase.from('join_applications').select('*').order('created_at', { ascending: false }),
    ]);
    if (a.error) return setErr(a.error.message + ' (Run supabase/applications.sql in Supabase first.)');
    if (j.error) return setErr(j.error.message + ' (Run supabase/join_applications.sql in Supabase first.)');
    const byId = {};
    (p.data || []).forEach((x) => { byId[x.id] = x; });
    const portal = (a.data || []).map((x) => {
      const pr = byId[x.user_id] || {};
      return { ...x, src: 'portal', name: pr.full_name, email: pr.email, level: pr.level, phone: x.phone || pr.phone };
    });
    const joined = (j.data || []).map((x) => ({ ...x, src: 'join' }));
    setRows([...portal, ...joined].sort((m, n) => new Date(n.created_at) - new Date(m.created_at)));
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function clearDeclined() {
    const n = (rows || []).filter((x) => x.status === 'declined').length;
    if (!n || !window.confirm('Delete all ' + n + ' declined applications permanently?')) return;
    setErr('');
    const r = await supabase.from('applications').delete().eq('status', 'declined').select('id');
    const r2 = await supabase.from('join_applications').delete().eq('status', 'declined').select('id');
    if (r.error) return setErr(r.error.message);
    if (r2.error) return setErr(r2.error.message);
    if (!(r.data || []).length && !(r2.data || []).length) return setErr('Nothing was deleted. Run supabase/applications_delete.sql in Supabase first.');
    setRows((l) => l.filter((x) => x.status !== 'declined'));
  }

  const count = (s) => (rows || []).filter((x) => s === 'all' || x.status === s).length;
  const list = (rows || []).filter((x) => filter === 'all' || x.status === filter);
  const tabs = [['pending', 'Pending'], ['accepted', 'Accepted'], ['declined', 'Declined'], ['all', 'All']];

  return (
    <main>
      <section className="card">
        <h2>Applications</h2>
        <p>
          <Link className="btn alt sm" href="/admin">Back to admin</Link>{' '}
          <button type="button" className="btn sm" onClick={copyLink}>{copied ? 'Link copied' : 'Copy application link'}</button>
        </p>
        <div className="choice">
          {tabs.map(([k, label]) => (
            <button key={k} type="button" className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>
              {label} ({count(k)})
            </button>
          ))}
        </div>
        {filter === 'declined' && count('declined') > 0 && (
          <p><button type="button" className="btn alt sm" onClick={clearDeclined}>Clear all declined</button></p>
        )}
        {err && <div className="msg err">{err}</div>}
        {rows === null && !err && <Skeleton lines={3} />}
        {rows && list.length === 0 && <Empty icon={'\uD83D\uDCDD'} title="No applications here" />}
      </section>
      {list.map((a) => (
        <AppCard key={a.src + a.id} a={a} onDelete={(id) => setRows((l) => l.filter((x) => !(x.id === id && x.src === a.src)))} onChange={(u) => setRows((l) => l.map((x) => (x.id === u.id && x.src === a.src ? { ...x, status: u.status, decided_at: u.decided_at } : x)))} />
      ))}
    </main>
  );
}