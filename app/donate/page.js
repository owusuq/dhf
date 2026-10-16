'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

// Change these lines if the details ever change.
const MOMO_NETWORK = 'MTN';
const MOMO_NUMBER = '0598124922';
const MOMO_NAME = 'Kwadjo Owusu-Ansah Quarshie';
const MOMO_REF = 'dhf';
const EMAIL = 'daakyehenefoundation@outlook.com';
const GOFUNDME = 'https://gofund.me/ded4e4e50';

const blank = { name: '', contact: '', amount: '', method: 'Mobile Money', message: '', website: '' };

export default function Donate() {
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function copy(text, key) {
    try { await navigator.clipboard.writeText(text); } catch (e) {
      const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } catch (x) { /* ignore */ }
      t.remove();
    }
    setCopied(key);
    setTimeout(() => setCopied(''), 1800);
  }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (f.website) { setSent(true); return; } // hidden field: bots fill it, people don't
    setBusy(true);
    const { error } = await supabase.from('donations').insert({
      name: f.name.trim(),
      contact: f.contact.trim(),
      amount: f.amount === '' ? null : Number(f.amount),
      method: f.method,
      message: f.message.trim() || null,
    });
    setBusy(false);
    if (error) return setErr('Your message could not be sent. Please try again in a moment.');
    setSent(true);
    setF(blank);
  }

  const link = typeof window !== 'undefined' ? window.location.origin + '/donate' : '/donate';
  const share = 'https://wa.me/?text=' + encodeURIComponent('Support a student at the Daakyehene Foundation: ' + link);

  return (
    <main>
      <section className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '.8rem' }}>
          <Link href="/" aria-label="Daakyehene Foundation home" style={{ display: 'flex', border: 0, padding: 0, background: 'none' }}><img src="/logo.jpeg" alt="Daakyehene Foundation" width="64" height="64" style={{ borderRadius: '50%' }} /></Link>
          <h2 style={{ margin: 0 }}>Support a student ❤️</h2>
        </div>
        <p>Your gift helps students at the Daakyehene Foundation stay in school. Thank you!</p>
        <p><Link className="btn alt sm" href="/">Back to home</Link></p>
      </section>

      <section className="card">
        <h2>Give by Mobile Money</h2>
        <p>{MOMO_NETWORK} Mobile Money</p>
        <p style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '.03em', margin: '.2rem 0' }}>{MOMO_NUMBER}</p>
        <p>{MOMO_NAME}<br />Payment reference: <b>{MOMO_REF}</b></p>
        <p><button type="button" className="btn" onClick={() => copy(MOMO_NUMBER, 'num')}>{copied === 'num' ? 'Copied ✓' : 'Copy number'}</button></p>
        <p><a className="btn alt" href={GOFUNDME} target="_blank" rel="noopener noreferrer">💧 Clean drinking water project · GoFundMe</a></p>
        <p><small>Giving from abroad, by bank transfer, or a large amount? Please email <a href={'mailto:' + EMAIL}>{EMAIL}</a></small></p>
      </section>

      <section className="card">
        {sent ? (
          <>
            <h2>Thank you 🙏</h2>
            <p>The Foundation has your message and will confirm your gift. God bless you.</p>
            <p><button type="button" className="btn alt" onClick={() => setSent(false)}>Send another</button></p>
          </>
        ) : (
          <form onSubmit={submit}>
            <h2>Tell us about your gift</h2>
            <p><small>Optional, but it helps us thank you. No account needed.</small></p>
            <label htmlFor="dn-n">Your name</label>
            <input id="dn-n" required maxLength={120} value={f.name} onChange={set('name')} />
            <label htmlFor="dn-c">Phone or email</label>
            <input id="dn-c" required maxLength={120} value={f.contact} onChange={set('contact')} />
            <label htmlFor="dn-a">Amount (GH₵)</label>
            <input id="dn-a" type="number" min="0" step="0.01" value={f.amount} onChange={set('amount')} />
            <label htmlFor="dn-m">How you gave or will give</label>
            <select id="dn-m" value={f.method} onChange={set('method')}>
              <option>Mobile Money</option>
              <option>GoFundMe</option>
              <option>Bank transfer</option>
              <option>Cash</option>
              <option>Other</option>
            </select>
            <label htmlFor="dn-g">Message (optional)</label>
            <textarea id="dn-g" rows={3} maxLength={500} value={f.message} onChange={set('message')} />
            <input
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
              value={f.website}
              onChange={set('website')}
            />
            {err && <div className="msg err">{err}</div>}
            <p><button className="btn" disabled={busy}>{busy ? 'Sending…' : 'Send'}</button></p>
          </form>
        )}
      </section>

      <section className="card">
        <h2>Share this page</h2>
        <p>
          <a className="btn" href={share} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>{' '}
          <button type="button" className="btn alt" onClick={() => copy(link, 'link')}>{copied === 'link' ? 'Link copied ✓' : 'Copy link'}</button>
        </p>
      </section>
    </main>
  );
}
