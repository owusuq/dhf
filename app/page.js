'use client';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
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
  useEffect(() => {
    router.prefetch('/dashboard');
    supabase.auth.getSession().then(async ({ data }) => { if (data.session) router.replace(await destination(data.session.user.id)); });
  }, [router]);

  async function go(e) {
    e.preventDefault();
    setMsg(null);
    const res = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email: f.email, password: f.password })
      : await supabase.auth.signUp({ email: f.email, password: f.password, options: { data: { full_name: f.name } } });
    if (res.error) return setMsg({ err: true, t: res.error.message });
    if (mode === 'up' && !res.data.session) return setMsg({ t: 'Check your email to confirm your account, then sign in. After you sign in, you will go straight to the application form.' });
    router.replace(await destination(res.data.session.user.id));
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
  const EMAIL = 'daakyehenefoundation@outlook.com';
  const busyMode = applying || viewingResults;
  return (
    <>
      <div className="top">
        <Link href="/" className="logo-link" aria-label="Daakyehene Foundation home"><Image src="/logo.jpeg" alt="" width={92} height={92} priority onError={(e) => (e.target.style.display = 'none')} /><b>Daakyehene Foundation</b></Link>
        <a href="#contact">Contact us</a>
      </div>

      <main className="lg">
        <section className="lg-hero">
          <span className="lg-pill">Student Portal</span>
          <h1>Welcome to the Daakyehene Foundation</h1>
          <p className="lg-lead">Everything you need as a student, in one simple place.</p>
          <ul className="lg-points">
            <li>See what you have paid and what is left</li>
            <li>Get payment reminders on your phone calendar</li>
            <li>View your results and apply for support</li>
          </ul>
          <p className="lg-motto">Empowering People &middot; Building Communities &middot; Creating a Brighter Future</p>
        </section>

        <form className="card lg-card" onSubmit={go}>
          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'in'} className={mode === 'in' ? 'on' : ''} onClick={() => setMode('in')}>Sign in</button>
            <button type="button" role="tab" aria-selected={mode === 'up'} className={mode === 'up' ? 'on' : ''} onClick={() => setMode('up')}>Create account</button>
          </div>
          <h2>{mode === 'in' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="lg-sub">{mode === 'in' ? 'Sign in to see your fees, payment dates and receipts.' : 'It takes less than a minute.'}</p>
          {applying && <div className="msg">To apply, you need an account. {mode === 'up' ? 'Create one below.' : 'Sign in below.'} You will go straight to the application form afterwards.</div>}
          {viewingResults && <div className="msg">Sign in to see your results.</div>}
          {mode === 'up' && (<><label htmlFor="n">Full name</label><input id="n" required autoComplete="name" value={f.name} onChange={set('name')} /></>)}
          <label htmlFor="e">Email</label><input id="e" type="email" required autoComplete="email" value={f.email} onChange={set('email')} />
          <label htmlFor="p">Password</label>
          <div className="pw">
            <input id="p" type={show ? 'text' : 'password'} minLength={6} required autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={f.password} onChange={set('password')} />
            <button type="button" className="pw-eye" onMouseDown={(e) => e.preventDefault()} onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? 'Hide' : 'Show'}</button>
          </div>
          {mode === 'in' && <p className="lg-forgot"><button type="button" className="lg-link" onClick={forgot}>Forgot password?</button></p>}
          {msg && <div className={'msg' + (msg.err ? ' err' : '')}>{msg.t}</div>}
          <p><button className="btn lg-go">{mode === 'in' ? 'Sign in' : 'Create account'}</button></p>
          {!busyMode && (
            <>
              <div className="lg-or"><span>or</span></div>
              <div className="lg-quick">
                <button type="button" className="btn alt" onClick={startApply}>Apply to the Foundation</button>
                <button type="button" className="btn alt" onClick={startResults}>View my results</button>
              </div>
            </>
          )}
        </form>
      </main>

      <section className="lg-contact" id="contact">
        <h2>Contact us</h2>
        <p>Questions about your fees, your account or support? Send us an email and we will get back to you.</p>
        <a className="btn lg-mail" href={'mailto:' + EMAIL + '?subject=Student%20Portal%20enquiry'}>{EMAIL}</a>
      </section>
      <RequestButton />
      <InstallPrompt />
    </>
  );
}