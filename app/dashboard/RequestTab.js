'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function RequestTab({ name, contact }) {
  const blank = { name: name || '', contact: contact || '', amount: '', reason: '', note: '' };
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const { error } = await supabase.from('requests').insert({
      name: f.name.trim(),
      contact: f.contact.trim(),
      amount: f.amount === '' ? null : Number(f.amount),
      reason: f.reason.trim(),
      note: f.note.trim() || null,
    });
    setBusy(false);
    if (error) return setErr('Your request could not be sent. Please try again in a moment.');
    setSent(true);
  }

  if (sent) {
    return (
      <section className="card">
        <h2>Request sent</h2>
        <p>Thank you. The Foundation will review your request and contact you.</p>
        <p><button type="button" className="btn" onClick={() => { setSent(false); setF(blank); }}>Send another request</button></p>
      </section>
    );
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>Make a request</h2>
      <p><small>We will contact you using the details below.</small></p>
      <label htmlFor="rt-n">Your name</label>
      <input id="rt-n" required maxLength={120} value={f.name} onChange={set('name')} />
      <label htmlFor="rt-c">Phone or email</label>
      <input id="rt-c" required maxLength={120} value={f.contact} onChange={set('contact')} />
      <label htmlFor="rt-a">Amount (GH₵), if any</label>
      <input id="rt-a" type="number" min="0" step="0.01" value={f.amount} onChange={set('amount')} />
      <label htmlFor="rt-r">Reason</label>
      <textarea id="rt-r" rows={3} required maxLength={1000} value={f.reason} onChange={set('reason')} />
      <label htmlFor="rt-o">Extra note (optional)</label>
      <input id="rt-o" maxLength={500} value={f.note} onChange={set('note')} />
      {err && <div className="msg err">{err}</div>}
      <p><button className="btn" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button></p>
    </form>
  );
}
