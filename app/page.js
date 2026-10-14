'use client';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { WHATSAPP_DISPLAY, WHATSAPP_INTL } from '../lib/config';
import RequestButton from './RequestButton';
import InstallPrompt from './InstallPrompt';

const FLAG = 'dhf-apply';
const rememberApply = () => { try { localStorage.setItem(FLAG, '1'); } catch (e) { /* ignore */ } };
const takeApply = () => {
  try {
    const v = localStorage.getItem(FLAG);
    if (v) localStorage.removeItem(FLAG);
    return !!v;
  } catch (e) { return false; }
};

const rememberResults = () => { try { localStorage.setItem('dhf-results', '1'); } catch (e) { /* ignore */ } };

async function destination(uid) {
  if (!takeApply()) return '/dashboard';
  const a = await supabase.from('applications').select('id').eq('user_id', uid).eq('program', 'Daakyehene Foundation').maybeSingle();
  return a.data ? '/dashboard' : '/apply';
}

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState('in');
  const [applying, setApplying] = useState(false);
  const [viewingResults, setViewingResults] = useState(false);
  const [f, setF] = useState({ email: '', password: '', name: '' });
  const [msg, setMsg] = useState(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    router.prefetch('/dashboard');
    supabase.auth.getSession().then(async ({ data }) => { if (data.session) router.replace(await destination(data.session.user.id)); });
  }, [router]);

  async function go(e) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const res = mode === 'in'
        ? await supabase.auth.signInWithPassword({ email: f.email, password: f.password })
        : await supabase.auth.signUp({ email: f.email, password: f.password, options: { data: { full_name: f.name } } });
      if (res.error) return setMsg({ err: true, t: res.error.message });
      if (mode === 'up' && !res.data.session) return setMsg({ t: 'Check your email to confirm your account, then sign in. After you sign in, you will go straight to the application form.' });
      router.replace(await destination(res.data.session.user.id));
    } finally {
      setBusy(false);
    }
  }
  async function forgot() {
    if (!f.email) return setMsg({ err: true, t: 'Enter your email above first, then tap Forgot password.' });
    const { error } = await supabase.auth.resetPasswordForEmail(f.email, { redirectTo: window.location.origin + '/reset' });
    if (error) return setMsg({ err: true, t: error.message });
    setMsg({ t: 'If that email has an account, a reset link is on its way. Check your inbox and spam folder.' });
  }
  function startResults() {
    rememberResults();
    setViewingResults(true);
    setMode('in');
  }
  function startApply() {
    rememberApply();
    setApplying(true);
    setMode('up');
  }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const shine = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
    e.currentTarget.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
  };
  const EMAIL = 'daakyehenefoundation@outlook.com';
  const busyMode = applying || viewingResults;
  return (
    <div className="gl">
      <div className="gl-orbs" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="gl-stage">
        <div className="gl-bar gl-glass" role="banner">
          <Link href="/" className="gl-brand" aria-label="Daakyehene Foundation home"><Image src="/logo.jpeg" alt="" width={92} height={92} priority onError={(e) => (e.target.style.display = 'none')} /><b>Daakyehene Foundation</b></Link>
        </div>

        <main className="gl-split">
          <section className="gl-hero">
            <span className="gl-tag">Student Portal</span>
            <h1>Your student life, <span>made clear.</span></h1>
            <p>Fees, reminders, results and support in one simple place.</p>
            <ul className="gl-chips">
              <li className="gl-glass"><span aria-hidden="true">💳</span> Fees</li>
              <li className="gl-glass"><span aria-hidden="true">🔔</span> Reminders</li>
              <li className="gl-glass"><span aria-hidden="true">🎓</span> Results</li>
            </ul>
          </section>

          <form className="gl-card gl-glass gl-shine" onSubmit={go} onPointerMove={shine}>
            <div className={'gl-seg' + (mode === 'up' ? ' up' : '')} role="tablist">
              <span className="gl-thumb" aria-hidden="true" />
              <button type="button" role="tab" aria-selected={mode === 'in'} className={mode === 'in' ? 'on' : ''} onClick={() => setMode('in')}>Sign in</button>
              <button type="button" role="tab" aria-selected={mode === 'up'} className={mode === 'up' ? 'on' : ''} onClick={() => setMode('up')}>Create account</button>
            </div>
            <h2>{mode === 'in' ? 'Welcome back' : 'Create your account'}</h2>
            <p className="gl-sub">{mode === 'in' ? 'Sign in to see your fees, payment dates and receipts.' : 'It takes less than a minute.'}</p>
            {applying && <div className="gl-msg">To apply, you need an account. {mode === 'up' ? 'Create one below.' : 'Sign in below.'} You will go straight to the application form afterwards.</div>}
            {viewingResults && <div className="gl-msg">Sign in to see your results.</div>}
            {mode === 'up' && (<div className="gl-fld"><label htmlFor="n">Full name</label><input id="n" required autoComplete="name" placeholder="e.g. Kofi Mensah" value={f.name} onChange={set('name')} /></div>)}
            <div className="gl-fld"><label htmlFor="e">Email</label><input id="e" type="email" required autoComplete="email" placeholder="you@example.com" value={f.email} onChange={set('email')} /></div>
            <div className="gl-fld">
              <div className="gl-pwhead">
                <label htmlFor="p">Password</label>
                {mode === 'in' && <button type="button" className="gl-link" onClick={forgot}>Forgot password?</button>}
              </div>
              <div className="gl-pw">
                <input id="p" type={show ? 'text' : 'password'} minLength={6} required autoComplete={mode === 'in' ? 'current-password' : 'new-password'} placeholder={mode === 'in' ? 'Your password' : 'At least 6 characters'} value={f.password} onChange={set('password')} />
                <button type="button" className="gl-eye" onMouseDown={(e) => e.preventDefault()} onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? 'Hide' : 'Show'}</button>
              </div>
            </div>
            {msg && <div className={'gl-msg' + (msg.err ? ' err' : '')} role="alert">{msg.t}</div>}
            <button className="gl-btn gl-go" disabled={busy}>{busy ? 'Please wait…' : (mode === 'in' ? 'Sign in' : 'Create account')}</button>
            {!busyMode && (
              <>
                <div className="gl-or"><span>or</span></div>
                <div className="gl-quick">
                  <button type="button" className="gl-btn gl-alt" onClick={startApply}>Apply to the Foundation</button>
                  <button type="button" className="gl-btn gl-alt" onClick={startResults}>View my results</button>
                </div>
              </>
            )}
          </form>
        </main>

        <div className="gl-dock gl-glass" id="contact" role="navigation" aria-label="Contact us">
          <a href={'https://wa.me/' + WHATSAPP_INTL + '?text=' + encodeURIComponent('Hello Daakyehene Foundation, I have a question about the student portal.')} target="_blank" rel="noopener noreferrer"><b aria-hidden="true">💬</b>WhatsApp</a>
          <a href={'mailto:' + EMAIL + '?subject=Student%20Portal%20enquiry'}><b aria-hidden="true">✉️</b>Email</a>
          <a href={'tel:+' + WHATSAPP_INTL}><b aria-hidden="true">📞</b>{WHATSAPP_DISPLAY}</a>
        </div>
      </div>
      <RequestButton />
      <InstallPrompt />
    </div>
  );
}
