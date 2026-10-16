'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

// Change this one line to rename the programme everywhere on this page.
const PROGRAM = 'Daakyehene Foundation';

const blank = { name: '', phone: '', email: '', level: '', reason: '', website: '' };

export default function Join() {
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
    if (f.name.trim().length < 2) return setErr('Enter your full name.');
    if (f.phone.trim().length < 5) return setErr('Enter a phone number we can reach you on.');
    if (f.reason.trim().length < 10) return setErr('Tell us a bit about why you want to join.');
    setBusy(true);
    const { error } = await supabase.from('join_applications').insert({
      program: PROGRAM,
      name: f.name.trim(),
      phone: f.phone.trim(),
      email: f.email.trim() || null,
      level: f.level.trim() || null,
      reason: f.reason.trim(),
    });
    setBusy(false);
    if (error) return setErr('Your application could not be sent. Please try again in a moment.');
    setSent(true);
    setF(blank);
  }

  async function copy() {
    const link = window.location.origin + '/join';
    try { await navigator.clipboard.writeText(link); } catch (x) { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main>
      <section className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '.8rem' }}>
          <img src="/logo.jpeg" alt="Daakyehene Foundation" width="64" height="64" style={{ borderRadius: '50%' }} />
          <h2 style={{ margin: 0 }}>Apply to the {PROGRAM}</h2>
        </div>
        <p>Fill in the form below. No account is needed. The Foundation will contact you with the decision.</p>
      </section>

      <section className="card">
        {sent ? (
          <>
            <h2>Application received 🙏</h2>
            <p>Thank you for applying. The Foundation has your application and will contact you on the phone number you gave.</p>
            <p><Link className="btn alt" href="/">Back to home</Link></p>
          </>
        ) : (
          <form onSubmit={submit}>
            <label htmlFor="jn-n">Full name</label>
            <input id="jn-n" required maxLength={120} value={f.name} onChange={set('name')} />
            <label htmlFor="jn-p">Phone number (WhatsApp if possible)</label>
            <input id="jn-p" type="tel" required maxLength={40} value={f.phone} onChange={set('phone')} />
            <label htmlFor="jn-e">Email (optional)</label>
            <input id="jn-e" type="email" maxLength={120} value={f.email} onChange={set('email')} />
            <label htmlFor="jn-l">Level or school (optional)</label>
            <input id="jn-l" maxLength={120} value={f.level} onChange={set('level')} placeholder="e.g. Level 200, KTU" />
            <label htmlFor="jn-r">Why do you want to join?</label>
            <textarea id="jn-r" rows={5} required maxLength={1500} value={f.reason} onChange={set('reason')} placeholder="Tell us a bit about yourself" />
            <input
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
              value={f.website}
              onChange={set('website')}
            />
            {err && <div className="msg err">{err}</div>}
            <p><button className="btn" disabled={busy}>{busy ? 'Sending…' : 'Submit application'}</button></p>
          </form>
        )}
      </section>

      <section className="card">
        <h2>Share this link</h2>
        <p>
          <a className="btn" href={'https://wa.me/?text=' + encodeURIComponent('Apply to the Daakyehene Foundation here: ' + (typeof window !== 'undefined' ? window.location.origin : '') + '/join')} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>{' '}
          <button type="button" className="btn alt" onClick={copy}>{copied ? 'Link copied ✓' : 'Copy link'}</button>
        </p>
      </section>
    </main>
  );
}