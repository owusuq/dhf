'use client';
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

function AppCard({ a, onChange }) {
  const [custom, setCustom] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const first = (a.name || 'student').split(' ')[0];
  const acceptMsg = `Hello ${first}, congratulations! Your application to the ${a.program} has been accepted. Please check your student portal for the next steps. Daakyehene Foundation`;
  const declineMsg = `Hello ${first}, thank you for applying to the ${a.program}. We could not take your application this time. Please contact us if you have any questions. Daakyehene Foundation`;
  const text = custom ?? (a.status === 'accepted' ? acceptMsg : declineMsg);
  const phone = intl(a.phone);
  const subject = `Your ${a.program} application`;

  async function decide(status) {
    setBusy(true);
    setErr('');
    const r = await supabase
      .from('applications')
      .update({ status, decided_at: status === 'pending' ? null : new Date().toISOString() })
      .eq('id', a.id)
      .select();
    setBusy(false);
    if (r.error) return setErr(r.error.message);
    if (!r.data || !r.data.length) return setErr('Nothing was saved. Run supabase/applications.sql in Supabase first.');
    setCustom(null);
    onChange(r.data[0]);
  }

  return (
    <section className="card">
      <div className="row">
        <b>{a.name || '(no name)'}</b>
        <Pill status={a.status} />
      </div>
      <p><small>{a.level || 'Level not set'} · applied {day(a.created_at)}</small></p>
      <p><small>{a.email}{phone ? ' · ' + phone : ''}</small></p>
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
          <p className="remind">
            {phone && <a className="btn sm" href={`https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">WhatsApp</a>}{' '}
            {phone && <a className="btn alt sm" href={`sms:${phone}?body=${encodeURIComponent(text)}`}>SMS</a>}{' '}
            {a.email && <a className="btn alt sm" href={`mailto:${a.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`}>Email</a>}{' '}
            {!phone && !a.email && <small>No contact saved</small>}
            <button type="button" className="btn alt sm" disabled={busy} onClick={() => decide('pending')}>Change decision</button>
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

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return router.replace('/');
    const me = await supabase.from('profiles').select('is_admin').eq('id', data.session.user.id).single();
    if (!me.data || !me.data.is_admin) return router.replace('/');
    const [a, p] = await Promise.all([
      supabase.from('applications').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, email, level, phone'),
    ]);
    if (a.error) return setErr(a.error.message + ' (Run supabase/applications.sql in Supabase first.)');
    const byId = {};
    (p.data || []).forEach((x) => { byId[x.id] = x; });
    setRows((a.data || []).map((x) => {
      const pr = byId[x.user_id] || {};
      return { ...x, name: pr.full_name, email: pr.email, level: pr.level, phone: x.phone || pr.phone };
    }));
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const count = (s) => (rows || []).filter((x) => s === 'all' || x.status === s).length;
  const list = (rows || []).filter((x) => filter === 'all' || x.status === filter);
  const tabs = [['pending', 'Pending'], ['accepted', 'Accepted'], ['declined', 'Declined'], ['all', 'All']];

  return (
    <main>
      <section className="card">
        <h2>Applications</h2>
        <p><Link className="btn alt sm" href="/admin">Back to admin</Link></p>
        <div className="choice">
          {tabs.map(([k, label]) => (
            <button key={k} type="button" className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>
              {label} ({count(k)})
            </button>
          ))}
        </div>
        {err && <div className="msg err">{err}</div>}
        {rows === null && !err && <p>Loading…</p>}
        {rows && list.length === 0 && <p><small>No applications here.</small></p>}
      </section>
      {list.map((a) => (
        <AppCard key={a.id} a={a} onChange={(u) => setRows((l) => l.map((x) => (x.id === u.id ? { ...x, status: u.status, decided_at: u.decided_at } : x)))} />
      ))}
    </main>
  );
}
