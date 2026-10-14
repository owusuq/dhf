'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const money = (n) => 'GH₵ ' + Number(n || 0).toLocaleString();
const day = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// Ghana numbers: 024... -> +23324...
function intl(phone) {
  let p = String(phone || '').replace(/[^\d+]/g, '');
  if (!p) return '';
  if (p.startsWith('+')) return p;
  if (p.startsWith('00')) return '+' + p.slice(2);
  if (p.startsWith('0')) return '+233' + p.slice(1);
  return '+' + p;
}

const pill = {
  pending: { text: 'Pending', bg: '#fff3cd', fg: '#7a5b00' },
  approved: { text: 'Approved', bg: '#d9f2e3', fg: '#14532d' },
  declined: { text: 'Declined', bg: '#fde2e2', fg: '#7f1d1d' },
};

function Pill({ status }) {
  const p = pill[status] || pill.pending;
  return <span style={{ background: p.bg, color: p.fg, fontSize: '0.8rem', padding: '3px 10px', borderRadius: 8, fontWeight: 600 }}>{p.text}</span>;
}

function Card({ r, onChange, onDelete }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const first = (r.name || 'there').split(' ')[0];
  const isEmail = r.contact.includes('@');
  const phone = isEmail ? '' : intl(r.contact);
  const text = r.status === 'approved'
    ? `Hello ${first}, your request to the Daakyehene Foundation has been approved. We will be in touch with the next steps. Daakyehene Foundation`
    : `Hello ${first}, thank you for your request to the Daakyehene Foundation. We are not able to approve it this time. Please contact us if you have any questions. Daakyehene Foundation`;

  async function decide(status) {
    setBusy(true);
    setErr('');
    const res = await supabase.from('requests').update({ status }).eq('id', r.id).select();
    setBusy(false);
    if (res.error) return setErr(res.error.message);
    if (!res.data || !res.data.length) return setErr('Nothing was saved. Run supabase/requests.sql in the Supabase SQL Editor first.');
    onChange(res.data[0]);
  }

  async function remove() {
    if (!window.confirm('Delete this request permanently?')) return;
    setBusy(true);
    setErr('');
    const res = await supabase.from('requests').delete().eq('id', r.id).select('id');
    setBusy(false);
    if (res.error) return setErr(res.error.message);
    if (!res.data || !res.data.length) return setErr('Nothing was deleted. Run supabase/requests.sql in the Supabase SQL Editor first.');
    onDelete(r.id);
  }

  return (
    <section className="card">
      <div className="row">
        <b>{r.name}</b>
        <Pill status={r.status} />
      </div>
      <p><small>{r.contact} · sent {day(r.created_at)}{r.amount != null ? ' · ' + money(r.amount) : ''}</small></p>
      <p><small>Reason</small><br />{r.reason}</p>
      {r.note && <p><small>Note</small><br />{r.note}</p>}
      {err && <div className="msg err">{err}</div>}
      {r.status === 'pending' ? (
        <p>
          <button type="button" className="btn" disabled={busy} onClick={() => decide('approved')}>Approve</button>{' '}
          <button type="button" className="btn alt" disabled={busy} onClick={() => decide('declined')}>Decline</button>
        </p>
      ) : (
        <p className="remind">
          {phone && <a className="btn sm" href={`https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">WhatsApp</a>}
          {phone && <a className="btn alt sm" href={`sms:${phone}?body=${encodeURIComponent(text)}`}>SMS</a>}
          {isEmail && <a className="btn sm" href={`mailto:${r.contact}?subject=${encodeURIComponent('Your request to the Daakyehene Foundation')}&body=${encodeURIComponent(text)}`}>Email</a>}
          <button type="button" className="btn alt sm" disabled={busy} onClick={() => decide('pending')}>Change decision</button>
          <button type="button" className="btn del sm" disabled={busy} onClick={remove}>Delete</button>
        </p>
      )}
    </section>
  );
}

export default function RequestsAdmin({ onCount }) {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [lim, setLim] = useState(30);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      const res = await supabase.from('requests').select('*').order('created_at', { ascending: false });
      if (res.error) return setErr(res.error.message + ' (Run supabase/requests.sql in Supabase first.)');
      setRows(res.data || []);
    })();
  }, []);

  useEffect(() => {
    if (rows && onCount) onCount(rows.filter((x) => x.status === 'pending').length);
  }, [rows, onCount]);

  async function clearMany(label, status) {
    const n = count(status);
    if (!n || !window.confirm('Delete all ' + n + ' ' + label + ' requests permanently? This cannot be undone.')) return;
    setErr('');
    let q = supabase.from('requests').delete();
    q = status === 'all' ? q.neq('id', '00000000-0000-0000-0000-000000000000') : q.eq('status', status);
    const res = await q.select('id');
    if (res.error) return setErr(res.error.message);
    if (!res.data || !res.data.length) return setErr('Nothing was deleted. Run supabase/requests.sql in the Supabase SQL Editor first.');
    setRows((l) => l.filter((x) => status !== 'all' && x.status !== status));
  }

  const count = (s) => (rows || []).filter((x) => s === 'all' || x.status === s).length;
  const list = (rows || []).filter((x) => filter === 'all' || x.status === filter);
  const tabs = [['pending', 'Pending'], ['approved', 'Approved'], ['declined', 'Declined'], ['all', 'All']];

  return (
    <>
      <section className="card">
        <h2>Requests</h2>
        <div className="tabs">
          {tabs.map(([k, label]) => (
            <button key={k} type="button" className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>
              {label} ({count(k)})
            </button>
          ))}
        </div>
        {filter === 'declined' && count('declined') > 0 && (
          <p><button type="button" className="btn del sm" onClick={() => clearMany('declined', 'declined')}>Clear all declined</button></p>
        )}
        {filter === 'all' && count('all') > 0 && (
          <p><button type="button" className="btn del sm" onClick={() => clearMany('', 'all')}>Delete everything</button></p>
        )}
        {err && <div className="msg err">{err}</div>}
        {rows === null && !err && <p>Loading…</p>}
        {rows && list.length === 0 && <p><small>No requests here.</small></p>}
      </section>
      {list.slice(0, lim).map((r) => (
        <Card key={r.id} r={r} onDelete={(id) => setRows((l) => l.filter((x) => x.id !== id))} onChange={(u) => setRows((l) => l.map((x) => (x.id === u.id ? { ...x, status: u.status } : x)))} />
      ))}
      {list.length > lim && <p><button type="button" className="btn alt sm" onClick={() => setLim(lim + 30)}>Show more ({list.length - lim} left)</button></p>}
    </>
  );
}
