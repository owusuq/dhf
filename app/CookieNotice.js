'use client';
import { useEffect, useState } from 'react';

const KEY = 'dhf-consent';
const EMAIL = 'daakyehenefoundation@outlook.com';

export default function CookieNotice() {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState(false);

  useEffect(() => {
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) { /* ignore */ }
    if (!saved) setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener('dhf-consent-open', reopen);
    return () => window.removeEventListener('dhf-consent-open', reopen);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('has-consent-bar', open);
    return () => document.documentElement.classList.remove('has-consent-bar');
  }, [open]);

  function choose(value) {
    try { localStorage.setItem(KEY, value); } catch (e) { /* ignore */ }
    setOpen(false);
  }

  return (
    <>
      {open && (
        <div className="ck" role="dialog" aria-label="Cookies and storage">
          <b>Cookies and storage</b>
          <p>
            Essential storage keeps you signed in and always stays on. Choose whether we may also keep optional extras.{' '}
            <button type="button" className="lg-link" onClick={() => setInfo(true)}>Privacy</button>
          </p>
          <div className="ck-btns">
            <button type="button" className="btn alt" onClick={() => choose('essential')}>Reject optional</button>
            <button type="button" className="btn" onClick={() => choose('all')}>Accept all</button>
          </div>
        </div>
      )}
      {info && (
        <div className="rq-ov" onClick={(e) => { if (e.target === e.currentTarget) setInfo(false); }}>
          <div className="rq-card" role="dialog" aria-modal="true" aria-labelledby="ck-title">
            <h2 id="ck-title">Privacy</h2>
            <p>This portal does not use advertising or tracking. It stores only what it needs on your device: your sign-in session, dark mode, where you moved the floating buttons, and your choice here.</p>
            <p>Questions about your data? Email <a href={'mailto:' + EMAIL}>{EMAIL}</a>.</p>
            <p><button type="button" className="btn" onClick={() => setInfo(false)}>Close</button></p>
          </div>
        </div>
      )}
    </>
  );
}