'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

const blank = { name: '', contact: '', amount: '', reason: '', note: '', website: '' };

export default function RequestPage() {
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErr(''); };

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (f.website) { setSent(true); return; } // hidden field: bots fill it, people don't
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
    setF(blank);
  }

  async function copy() {
    try { await navigator.clipboard.writeText(window.location.origin + '/request'); } catch (x) { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main>
      <section className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '.8rem' }}>
          <Link href="/" aria-label="Daakyehene Foundation home" style={{ display: 'flex', border: 0, padding: 0, background: 'none' }}><img src="/logo.jpeg" alt="Daakyehene Foundation" width="64" height="64" style={{ borderRadius: '50%' }} /></Link>
          <h2 style={{ margin: 0 }}>Make a request</h2>
        </div>
        <p>You do not need an account. Tell us what you need and the Foundation will contact you.</p>
      </section>

      <section className="card">
        {sent ? (
          <>
            <h2>Request sent</h2>
            <p>Thank you. The Foundation will review your request and contact you.</p>
            <p>
              <button type="button" className="btn alt" onClick={() => setSent(false)}>Send another</button>{' '}
              <Link className="btn alt" href="/">Back to home</Link>
            </p>
          </>
        ) : (
          <form onSubmit={submit}>
            <label htmlFor="rp-n">Your name</label>
            <input id="rp-n" required maxLength={120} value={f.name} onChange={set('name')} />
            <label htmlFor="rp-c">Phone or email</label>
            <input id="rp-c" required maxLength={120} value={f.contact} onChange={set('contact')} />
            <label htmlFor="rp-a">Amount (GHS), if any</label>
            <input id="rp-a" type="number" min="0" step="0.01" value={f.amount} onChange={set('amount')} />
            <label htmlFor="rp-r">Reason</label>
            <textarea id="rp-r" rows={4} required maxLength={1000} value={f.reason} onChange={set('reason')} />
            <label htmlFor="rp-o">Extra note (optional)</label>
            <input id="rp-o" maxLength={500} value={f.note} onChange={set('note')} />
            <input
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
              value={f.website}
              onChange={set('website')}
            />
            {err && <div className="msg err">{err}</div>}
            <p><button className="btn" disabled={busy}>{busy ? 'Sending...' : 'Send request'}</button></p>
          </form>
        )}
      </section>

      <section className="card">
        <h2>Share this link</h2>
        <p>
          <a className="btn" href={'https://wa.me/?text=' + encodeURIComponent('Make a request to the Daakyehene Foundation here: ' + (typeof window !== 'undefined' ? window.location.origin : '') + '/request')} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>{' '}
          <button type="button" className="btn alt" onClick={copy}>{copied ? 'Link copied' : 'Copy link'}</button>
        </p>
      </section>
    </main>
  );
}