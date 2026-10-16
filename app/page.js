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

function nextPath() {
  try {
    const n = new URLSearchParams(window.location.search).get('next');
    return n && n.startsWith('/') && !n.startsWith('//') ? n : null;
  } catch (e) { return null; }
}

async function destination(uid) {
  const next = nextPath();
  if (next) return next;
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
          <a href={'https://wa.me/' + WHATSAPP_INTL + '?text=' + encodeURIComponent('Hello Daakyehene Foundation, I have a question about the student portal.')} target="_blank" rel="noopener noreferrer"><b aria-hidden="true"><svg viewBox="0 0 24 24" width="1.15em" height="1.15em" fill="#25D366" style={{verticalAlign:'-0.2em'}}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg></b>WhatsApp</a>
          <a href={'mailto:' + EMAIL + '?subject=Student%20Portal%20enquiry'}><b aria-hidden="true">✉️</b>Email</a>
          <a href={'tel:+' + WHATSAPP_INTL}><b aria-hidden="true">📞</b>{WHATSAPP_DISPLAY}</a>
        </div>
      </div>
      <RequestButton />
      <InstallPrompt />
    </div>
  );
}
