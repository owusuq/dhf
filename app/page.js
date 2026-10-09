'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState('in');
  const [f, setF] = useState({ email: '', password: '', name: '' });
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => data.session && router.replace('/dashboard'));
  }, [router]);

  async function go(e) {
    e.preventDefault();
    setMsg(null);
    const res = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email: f.email, password: f.password })
      : await supabase.auth.signUp({ email: f.email, password: f.password, options: { data: { full_name: f.name } } });
    if (res.error) return setMsg({ err: true, t: res.error.message });
    if (mode === 'up' && !res.data.session) return setMsg({ t: 'Check your email to confirm your account, then sign in.' });
    router.replace('/dashboard');
  }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <>
      <div className="top"><img src="/logo.jpeg" alt="" onError={(e) => (e.target.style.display = 'none')} /><b>Daakyehene Foundation</b></div>
      <div className="wrap" style={{ maxWidth: 440 }}>
        <form className="card" onSubmit={go}>
          <h1>{mode === 'in' ? 'Sign in' : 'Create your account'}</h1>
          <p>Track your fees, payment dates and receipts in one place.</p>
          {mode === 'up' && (<><label htmlFor="n">Full name</label><input id="n" required value={f.name} onChange={set('name')} /></>)}
          <label htmlFor="e">Email</label><input id="e" type="email" required value={f.email} onChange={set('email')} />
          <label htmlFor="p">Password</label><input id="p" type="password" minLength={6} required value={f.password} onChange={set('password')} />
          {msg && <div className={'msg' + (msg.err ? ' err' : '')}>{msg.t}</div>}
          <p><button className="btn">{mode === 'in' ? 'Sign in' : 'Create account'}</button></p>
          <button type="button" className="btn alt sm" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
            {mode === 'in' ? 'New student? Create an account' : 'Have an account? Sign in'}
          </button>
        </form>
      </div>
    </>
  );
}
