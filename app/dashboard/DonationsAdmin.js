'use client';
import Skeleton from '../Skeleton';
import Empty from '../Empty';
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
  pending: { text: 'To confirm', bg: '#fff3cd', fg: '#7a5b00' },
  received: { text: 'Received', bg: '#d9f2e3', fg: '#14532d' },
};

function Pill({ status }) {
  const p = pill[status] || pill.pending;
  return <span style={{ background: p.bg, color: p.fg, fontSize: '0.8rem', padding: '3px 10px', borderRadius: 8, fontWeight: 600 }}>{p.text}</span>;
}

function Card({ r, onChange, onDelete }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const first = (r.name || 'friend').split(' ')[0];
  const isEmail = r.contact.includes('@');
  const phone = isEmail ? '' : intl(r.contact);
  const text = `Hello ${first}, thank you for your gift to the Daakyehene Foundation. We have received it and it will help a student stay in school. God bless you. Daakyehene Foundation`;

  async function setStatus(status) {
    setBusy(true);
    setErr('');
    const res = await supabase.from('donations').update({ status }).eq('id', r.id).select();
    setBusy(false);
    if (res.error) return setErr(res.error.message);
    if (!res.data || !res.data.length) return setErr('Nothing was saved. Run supabase/donations.sql in the Supabase SQL Editor first.');
    onChange(res.data[0]);
  }

  async function remove() {
    if (!window.confirm('Delete this donation note permanently?')) return;
    setBusy(true);
    setErr('');
    const res = await supabase.from('donations').delete().eq('id', r.id).select('id');
    setBusy(false);
    if (res.error) return setErr(res.error.message);
    if (!res.data || !res.data.length) return setErr('Nothing was deleted. Run supabase/donations.sql in the Supabase SQL Editor first.');
    onDelete(r.id);
  }

  return (
    <section className="card">
      <div className="row">
        <b>{r.name}</b>
        <Pill status={r.status} />
      </div>
      <p><small>{r.contact} · sent {day(r.created_at)}{r.amount != null ? ' · ' + money(r.amount) : ''}{r.method ? ' · ' + r.method : ''}</small></p>
      {r.message && <p><small>Message</small><br />{r.message}</p>}
      {err && <div className="msg err">{err}</div>}
      <p className="remind">
        {r.status === 'pending' && <button type="button" className="btn" disabled={busy} onClick={() => setStatus('received')}>Mark received</button>}
        {phone && <a className="btn sm" href={`https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">WhatsApp thanks</a>}
        {phone && <a className="btn alt sm" href={`sms:${phone}?body=${encodeURIComponent(text)}`}>SMS</a>}
        {isEmail && <a className="btn sm" href={`mailto:${r.contact}?subject=${encodeURIComponent('Thank you from the Daakyehene Foundation')}&body=${encodeURIComponent(text)}`}>Email thanks</a>}
        {r.status === 'received' && <button type="button" className="btn alt sm" disabled={busy} onClick={() => setStatus('pending')}>Undo</button>}
        <button type="button" className="btn del sm" disabled={busy} onClick={remove}>Delete</button>
      </p>
    </section>
  );
}

export default function DonationsAdmin({ onCount }) {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [lim, setLim] = useState(30);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await supabase.from('donations').select('*').order('created_at', { ascending: false });
      if (res.error) return setErr(res.error.message + ' (Run supabase/donations.sql in Supabase first.)');
      setRows(res.data || []);
    })();
  }, []);

  useEffect(() => {
    if (rows && onCount) onCount(rows.filter((x) => x.status === 'pending').length);
  }, [rows, onCount]);

  const link = typeof window !== 'undefined' ? window.location.origin + '/donate' : '/donate';
  const share = 'https://wa.me/?text=' + encodeURIComponent('Support a student at the Daakyehene Foundation: ' + link);

  async function copyLink() {
    try { await navigator.clipboard.writeText(link); } catch (e) { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const count = (s) => (rows || []).filter((x) => s === 'all' || x.status === s).length;
  const list = (rows || []).filter((x) => filter === 'all' || x.status === filter);
  const tabs = [['pending', 'To confirm'], ['received', 'Received'], ['all', 'All']];

  return (
    <>
      <section className="card">
        <h2>Donate link</h2>
        <p><small>Anyone can open this without logging in.</small></p>
        <p><b style={{ overflowWrap: 'anywhere' }}>{link}</b></p>
        <p>
          <button type="button" className="btn" onClick={copyLink}>{copied ? 'Copied ✓' : 'Copy link'}</button>{' '}
          <a className="btn alt" href={share} target="_blank" rel="noreferrer">Share on WhatsApp</a>
        </p>
      </section>
      <section className="card">
        <h2>Donations</h2>
        <div className="tabs">
          {tabs.map(([k, label]) => (
            <button key={k} type="button" className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>
              {label} ({count(k)})
            </button>
          ))}
        </div>
        {err && <div className="msg err">{err}</div>}
        {rows === null && !err && <Skeleton lines={3} />}
        {rows && list.length === 0 && <Empty icon="❤️" title="No donations here" />}
      </section>
      {list.slice(0, lim).map((r) => (
        <Card key={r.id} r={r} onDelete={(id) => setRows((l) => l.filter((x) => x.id !== id))} onChange={(u) => setRows((l) => l.map((x) => (x.id === u.id ? { ...x, status: u.status } : x)))} />
      ))}
      {list.length > lim && <p><button type="button" className="btn alt sm" onClick={() => setLim(lim + 30)}>Show more ({list.length - lim} left)</button></p>}
    </>
  );
}
