'use client';
import Skeleton from '../Skeleton';
import Empty from '../Empty';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const SQL_HINT = 'Run supabase/agreement.sql in the Supabase SQL Editor first.';
const when = (iso) => new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const pad = (n) => String(n).padStart(2, '0');
const toLocalInput = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const blank = { title: 'Monthly meeting', starts: '', place: '', notes: '' };

export default function MeetingsAdmin() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [f, setF] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function load() {
    const res = await supabase.from('meetings').select('*').order('starts_at', { ascending: true });
    if (res.error) return setErr(res.error.message + ' ' + SQL_HINT);
    setRows(res.data || []);
  }
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    setErr('');
    if (!f.starts) return setErr('Pick a date and time.');
    setBusy(true);
    const row = { title: f.title.trim() || 'Monthly meeting', starts_at: new Date(f.starts).toISOString(), place: f.place.trim() || null, notes: f.notes.trim() || null };
    const res = editId
      ? await supabase.from('meetings').update(row).eq('id', editId).select()
      : await supabase.from('meetings').insert(row).select();
    setBusy(false);
    if (res.error) return setErr(res.error.message + ' ' + SQL_HINT);
    if (!res.data || !res.data.length) return setErr('Nothing was saved. ' + SQL_HINT);
    setF(blank);
    setEditId(null);
    load();
  }

  function edit(m) {
    setEditId(m.id);
    setF({ title: m.title, starts: toLocalInput(m.starts_at), place: m.place || '', notes: m.notes || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function remove(m) {
    if (!window.confirm('Delete this meeting?')) return;
    const res = await supabase.from('meetings').delete().eq('id', m.id).select('id');
    if (res.error) return setErr(res.error.message);
    setRows((l) => l.filter((x) => x.id !== m.id));
  }

  async function repeat(m) {
    const d = new Date(m.starts_at);
    d.setMonth(d.getMonth() + 1);
    const res = await supabase.from('meetings').insert({ title: m.title, starts_at: d.toISOString(), place: m.place, notes: m.notes }).select();
    if (res.error) return setErr(res.error.message);
    load();
  }

  const shareText = (m) => `${m.title}: ${when(m.starts_at)}${m.place ? '\nWhere: ' + m.place : ''}${m.notes ? '\n' + m.notes : ''}\nDaakyehene Foundation`;

  if (err && rows === null) return <section className="card"><div className="msg err">{err}</div></section>;
  if (rows === null) return <section className="card"><Skeleton lines={4} /></section>;

  const now = Date.now() - 3 * 3600 * 1000;
  const upcoming = rows.filter((m) => new Date(m.starts_at).getTime() >= now);
  const past = rows.filter((m) => new Date(m.starts_at).getTime() < now).reverse();
  const nextMonth = new Date().toLocaleString('en-GB', { month: 'long' });

  const Card = ({ m }) => (
    <div style={{ padding: '.7rem 0', borderTop: '1px solid var(--line)' }}>
      <b>{m.title}</b>
      <div><small>{when(m.starts_at)}{m.place ? ' · ' + m.place : ''}</small></div>
      {m.notes && <div><small>{m.notes}</small></div>}
      <p className="remind">
        <a className="btn sm" href={'https://wa.me/?text=' + encodeURIComponent(shareText(m))} target="_blank" rel="noreferrer">Share on WhatsApp</a>
        <button type="button" className="btn alt sm" onClick={() => edit(m)}>Edit</button>
        <button type="button" className="btn alt sm" onClick={() => repeat(m)}>Repeat next month</button>
        <button type="button" className="btn del sm" onClick={() => remove(m)}>Delete</button>
      </p>
    </div>
  );

  return (
    <>
      <section className="card">
        <form onSubmit={save}>
          <h2>{editId ? 'Edit meeting' : 'Set a meeting'}</h2>
          {upcoming.length === 0 && !editId && <div className="msg">No meeting is scheduled. Set the {nextMonth} meeting below.</div>}
          <label htmlFor="mt-t">Title</label>
          <input id="mt-t" value={f.title} onChange={set('title')} maxLength={120} />
          <label htmlFor="mt-d">Date and time</label>
          <input id="mt-d" type="datetime-local" required value={f.starts} onChange={set('starts')} />
          <label htmlFor="mt-p">Place or meeting link (optional)</label>
          <input id="mt-p" value={f.place} onChange={set('place')} maxLength={300} />
          <label htmlFor="mt-n">Note (optional)</label>
          <textarea id="mt-n" rows={2} value={f.notes} onChange={set('notes')} maxLength={500} />
          {err && <div className="msg err">{err}</div>}
          <p>
            <button className="btn" disabled={busy}>{busy ? 'Saving…' : editId ? 'Save changes' : 'Add meeting'}</button>{' '}
            {editId && <button type="button" className="btn alt" onClick={() => { setEditId(null); setF(blank); }}>Cancel</button>}
          </p>
        </form>
      </section>

      <section className="card">
        <h2>Upcoming</h2>
        {upcoming.length === 0 && <Empty icon="📅" title="No upcoming meeting" />}
        {upcoming.map((m) => <Card key={m.id} m={m} />)}
      </section>

      {past.length > 0 && (
        <section className="card">
          <p><button type="button" className="btn alt sm" onClick={() => setShowPast(!showPast)}>{showPast ? 'Hide' : 'Show'} past meetings ({past.length})</button></p>
          {showPast && past.map((m) => <Card key={m.id} m={m} />)}
        </section>
      )}
    </>
  );
}
