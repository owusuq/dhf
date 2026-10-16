'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import AgreementText from '../AgreementText';

const day = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export default function Agreement() {
  const [doc, setDoc] = useState(undefined); // undefined = loading, null = none
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [signed, setSigned] = useState(null);
  const [name, setName] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      const d = await supabase.from('agreement_doc').select('*').eq('id', 1).maybeSingle();
      setDoc(d.data && d.data.body && d.data.body.trim() ? d.data : null);
      const { data } = await supabase.auth.getSession();
      const u = data.session ? data.session.user : null;
      setUser(u);
      if (u && d.data) {
        const pr = await supabase.from('profiles').select('full_name,is_admin').eq('id', u.id).maybeSingle();
        if (pr.data) { setName(pr.data.full_name || ''); setIsAdmin(!!pr.data.is_admin); }
        const s = await supabase.from('agreement_signatures').select('*').eq('user_id', u.id).eq('version', d.data.version).maybeSingle();
        setSigned(s.data || null);
      }
    })();
  }, []);

  async function sign(e) {
    e.preventDefault();
    setErr('');
    if (!agree) return setErr('Please tick the box to agree.');
    if (name.trim().length < 3) return setErr('Please type your full name to sign.');
    setBusy(true);
    const res = await supabase.from('agreement_signatures').insert({ user_id: user.id, version: doc.version, full_name: name.trim() }).select().single();
    setBusy(false);
    if (res.error) return setErr(res.error.message.includes('duplicate') ? 'You have already signed.' : res.error.message);
    setSigned(res.data);
  }

  return (
    <main>
      <section className="card">
        {doc === undefined && <p>Loading…</p>}
        {doc === null && <p>The agreement is not available yet. Please check again later.</p>}
        {doc && (
          <>
            <h2>{doc.title}</h2>
            <AgreementText body={doc.body} />
          </>
        )}
      </section>

      {doc && (
        <section className="card">
          {!user && (
            <>
              <h2>Sign in to agree</h2>
              <p>Please log in to your student account, then you can agree and sign.</p>
              <p><Link className="btn" href="/?next=/agreement">Log in to sign</Link></p>
            </>
          )}
          {user && isAdmin && <p>You are signed in as admin. Students will see the signing form here.</p>}
          {user && !isAdmin && signed && (
            <>
              <h2>Signed ✓</h2>
              <p>Thank you, {signed.full_name}. You agreed on {day(signed.signed_at)}.</p>
              <p><Link className="btn alt" href="/dashboard">Go to my dashboard</Link></p>
            </>
          )}
          {user && !isAdmin && !signed && (
            <form onSubmit={sign}>
              <h2>Agree and sign</h2>
              <label style={{ display: 'flex', gap: '.6rem', alignItems: 'flex-start' }}>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ width: 'auto', marginTop: '.25rem' }} />
                <span>Yes, I have read this agreement and I agree.</span>
              </label>
              <label htmlFor="ag-n">Type your full name to sign</label>
              <input id="ag-n" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
              {err && <div className="msg err">{err}</div>}
              <p><button className="btn" disabled={busy}>{busy ? 'Signing…' : 'Sign'}</button></p>
            </form>
          )}
        </section>
      )}
    </main>
  );
}
