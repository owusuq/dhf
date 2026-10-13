'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function Reset() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    supabase.auth.getSession().then(({ data: d }) => { if (d.session) setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  async function save(e) {
    e.preventDefault();
    setMsg(null);
    if (pw !== pw2) return setMsg({ err: true, t: 'The two passwords do not match.' });
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return setMsg({ err: true, t: error.message });
    setDone(true);
    setTimeout(() => router.replace('/dashboard'), 1500);
  }

  return (
    <>
      <div className="top">
        <Link href="/" className="logo-link" aria-label="Daakyehene Foundation home"><img src="/logo.jpeg" alt="" onError={(e) => (e.target.style.display = 'none')} /><b>Daakyehene Foundation</b></Link>
      </div>
      <div className="wrap" style={{ maxWidth: 440 }}>
        <form className="card" onSubmit={save}>
          <h1>Set a new password</h1>
          {done ? (
            <div className="msg">Password updated. Taking you to your dashboard.</div>
          ) : !ready ? (
            <>
              <p>This link has expired or was already used. Request a new one from the sign-in page.</p>
              <Link className="btn" href="/">Back to sign in</Link>
            </>
          ) : (
            <>
              <label htmlFor="rp1">New password</label>
              <div className="pw">
                <input id="rp1" type={show ? 'text' : 'password'} minLength={6} required autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
                <button type="button" className="pw-eye" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
              </div>
              <label htmlFor="rp2">Confirm new password</label>
              <input id="rp2" type={show ? 'text' : 'password'} minLength={6} required autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
              {msg && <div className={'msg' + (msg.err ? ' err' : '')}>{msg.t}</div>}
              <p><button className="btn lg-go">Save new password</button></p>
            </>
          )}
        </form>
      </div>
    </>
  );
}