'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

// Change this one line to rename the programme everywhere on this page.
const PROGRAM = 'Daakyehene Foundation';

const pill = {
  pending: { text: 'Pending', bg: '#fff3cd', fg: '#7a5b00' },
  accepted: { text: 'Accepted', bg: '#d9f2e3', fg: '#14532d' },
  declined: { text: 'Not accepted', bg: '#fde2e2', fg: '#7f1d1d' },
};

function Pill({ status }) {
  const p = pill[status] || pill.pending;
  return (
    <span style={{ background: p.bg, color: p.fg, fontSize: '0.8rem', padding: '3px 10px', borderRadius: 8, fontWeight: 600 }}>
      {p.text}
    </span>
  );
}

export default function Apply() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [userId, setUserId] = useState(null);
  const [app, setApp] = useState(undefined); // undefined = loading, null = none yet
  const [reason, setReason] = useState('');
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace('/');
      const uid = data.session.user.id;
      setUserId(uid);
      const p = await supabase.from('profiles').select('full_name, email, level, phone').eq('id', uid).single();
      setProfile(p.data || {});
      setPhone((p.data && p.data.phone) || '');
      const a = await supabase.from('applications').select('*').eq('user_id', uid).eq('program', PROGRAM).maybeSingle();
      setApp(a.data || null);
    })();
  }, [router]);

  async function submit(e) {
    e.preventDefault();
    if (reason.trim().length < 10) return setErr('Tell us a bit about why you want to join.');
    setBusy(true);
    setErr('');
    const r = await supabase
      .from('applications')
      .insert({ user_id: userId, program: PROGRAM, reason: reason.trim(), phone: phone.trim() || null })
      .select()
      .single();
    setBusy(false);
    if (r.error) return setErr(r.error.code === '23505' ? 'You have already applied.' : r.error.message);
    setApp(r.data);
  }

  const first = ((profile && profile.full_name) || 'student').split(' ')[0];

  return (
    <main>
      <section className="card">
        <h2>Apply to the {PROGRAM}</h2>
        <p><Link className="btn alt sm" href="/dashboard">Back to dashboard</Link></p>

        {app === undefined && <p>Loading…</p>}

        {app && (
          <>
            <p>Your application: <Pill status={app.status} /></p>
            {app.status === 'pending' && <p>Thank you, {first}. Your application is with the Foundation. The decision will show here.</p>}
            {app.status === 'accepted' && <p>Congratulations, {first}! Your application to the {app.program} has been accepted. We will contact you with the next steps.</p>}
            {app.status === 'declined' && <p>Thank you for applying, {first}. We could not take your application this time. Please contact us if you have questions.</p>}
            <p><small>Your reason: {app.reason}</small></p>
          </>
        )}

        {app === null && profile && (
          <form onSubmit={submit}>
            <p><small>Your details come from your profile. Update them under Profile if anything is wrong.</small></p>
            <div className="row"><span>Name</span><b>{profile.full_name || '—'}</b></div>
            <div className="row"><span>Level</span><b>{profile.level || '—'}</b></div>
            <div className="row"><span>Email</span><b>{profile.email || '—'}</b></div>
            <label htmlFor="ap1">Phone number</label>
            <input id="ap1" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <label htmlFor="ap2">Why do you want to join?</label>
            <textarea id="ap2" rows={5} value={reason} onChange={(e) => { setReason(e.target.value); setErr(''); }} placeholder="Tell us a bit about yourself" />
            {err && <div className="msg err">{err}</div>}
            <p><button className="btn" disabled={busy}>{busy ? 'Sending…' : 'Submit application'}</button></p>
          </form>
        )}
      </section>
    </main>
  );
}
