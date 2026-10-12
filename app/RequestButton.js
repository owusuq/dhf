'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const blank = { name: '', contact: '', amount: '', reason: '', note: '', website: '' };

export default function RequestButton() {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  function close() {
    setOpen(false);
    setErr('');
    if (sent) { setSent(false); setF(blank); }
  }

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

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

  return (
    <>
      <button type="button" className="rq-fab" onClick={() => setOpen(true)}>Request</button>
      {open && (
        <div className="rq-ov" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="rq-card" role="dialog" aria-modal="true" aria-labelledby="rq-title">
            {sent ? (
              <>
                <h2 id="rq-title">Request sent</h2>
                <p>Thank you. The Foundation will review your request and contact you.</p>
                <p><button type="button" className="btn" onClick={close}>Close</button></p>
              </>
            ) : (
              <form onSubmit={submit}>
                <h2 id="rq-title">Make a request</h2>
                <p><small>You do not need an account. We will contact you using the details below.</small></p>
                <label htmlFor="rq-n">Your name</label>
                <input id="rq-n" required maxLength={120} value={f.name} onChange={set('name')} />
                <label htmlFor="rq-c">Phone or email</label>
                <input id="rq-c" required maxLength={120} value={f.contact} onChange={set('contact')} />
                <label htmlFor="rq-a">Amount (GH₵), if any</label>
                <input id="rq-a" type="number" min="0" step="0.01" value={f.amount} onChange={set('amount')} />
                <label htmlFor="rq-r">Reason</label>
                <textarea id="rq-r" rows={3} required maxLength={1000} value={f.reason} onChange={set('reason')} />
                <label htmlFor="rq-o">Extra note (optional)</label>
                <input id="rq-o" maxLength={500} value={f.note} onChange={set('note')} />
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
                  value={f.website}
                  onChange={set('website')}
                />
                {err && <div className="msg err">{err}</div>}
                <p>
                  <button className="btn" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>{' '}
                  <button type="button" className="btn alt" onClick={close}>Cancel</button>
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
