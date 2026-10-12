'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import RequestButton from './RequestButton';

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
  return (
    <>
      <div className="top"><img src="/logo.jpeg" alt="" onError={(e) => (e.target.style.display = 'none')} /><b>Daakyehene Foundation</b></div>
      <div className="wrap" style={{ maxWidth: 440 }}>
        <form className="card" onSubmit={go}>
          <h1>{mode === 'in' ? 'Sign in' : 'Create your account'}</h1>
          <p>Track your fees, payment dates and receipts in one place.</p>
          {applying && <div className="msg">To apply, you need an account. {mode === 'up' ? 'Create one below.' : 'Sign in below.'} You will go straight to the application form afterwards.</div>}
          {viewingResults && <div className="msg">Sign in to see your results.</div>}
          {mode === 'up' && (<><label htmlFor="n">Full name</label><input id="n" required value={f.name} onChange={set('name')} /></>)}
          <label htmlFor="e">Email</label><input id="e" type="email" required value={f.email} onChange={set('email')} />
          <label htmlFor="p">Password</label><input id="p" type="password" minLength={6} required value={f.password} onChange={set('password')} />
          {msg && <div className={'msg' + (msg.err ? ' err' : '')}>{msg.t}</div>}
          <p><button className="btn">{mode === 'in' ? 'Sign in' : 'Create account'}</button></p>
          <button type="button" className="btn alt sm" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
            {mode === 'in' ? 'New student? Create an account' : 'Have an account? Sign in'}
          </button>
          {!applying && !viewingResults && (
            <p style={{ marginTop: '1rem' }}>
              <button type="button" className="btn alt" onClick={startApply}>Apply to the Daakyehene Foundation</button>
            </p>
          )}
          {!applying && !viewingResults && (
            <p>
              <button type="button" className="btn alt" onClick={startResults}>View my results</button>
            </p>
          )}
        </form>
      </div>
      <RequestButton />
    </>
  );
}
