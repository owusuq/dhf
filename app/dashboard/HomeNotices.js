'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

const when = (iso) => new Date(iso).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const isUrl = (s) => /^https?:\/\//i.test(s || '');

// Turns web addresses typed in the meeting note into tappable links. Everything else stays plain text.
function Linked({ text }) {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    /^https?:\/\//i.test(part)
      ? <a key={i} href={part} target={part.includes(window.location.host) ? undefined : '_blank'} rel="noreferrer">{part}</a>
      : part
  );
}

// Small cards at the top of Home: agreement to sign (students) and the next monthly meeting.
export default function HomeNotices({ userId, isAdmin, onGo }) {
  const [needSign, setNeedSign] = useState(false);
  const [meeting, setMeeting] = useState(undefined);

  useEffect(() => {
    (async () => {
      // Ask for the meeting and the agreement at the same time instead of one after the other.
      const [m, d] = await Promise.all([
        supabase.from('meetings').select('*').gte('starts_at', new Date(Date.now() - 3 * 3600 * 1000).toISOString()).order('starts_at', { ascending: true }).limit(1),
        isAdmin ? Promise.resolve({ data: null }) : supabase.from('agreement_doc').select('version, body').eq('id', 1).maybeSingle(),
      ]);
      setMeeting(m.error ? null : (m.data && m.data[0]) || null);
      if (isAdmin) return;
      if (!d.data || !d.data.body || !d.data.body.trim()) return;
      const s = await supabase.from('agreement_signatures').select('id').eq('user_id', userId).eq('version', d.data.version).maybeSingle();
      setNeedSign(!s.data);
    })();
  }, [userId, isAdmin]);

  if (meeting === undefined) return null;

  return (
    <>
      {needSign && (
        <section className="card">
          <h2>📄 Student agreement</h2>
          <p>Please read and sign the Foundation agreement.</p>
          <p><Link className="btn" href="/agreement">Read and sign</Link></p>
        </section>
      )}
      {meeting && (
        <section className="card">
          <h2>📅 {meeting.title}</h2>
          <p><b>{when(meeting.starts_at)}</b></p>
          {meeting.place && <p>{isUrl(meeting.place) ? <a href={meeting.place} target="_blank" rel="noreferrer">Join the meeting</a> : meeting.place}</p>}
          {meeting.notes && <p><small><Linked text={meeting.notes} /></small></p>}
        </section>
      )}
      {isAdmin && !meeting && (
        <section className="card">
          <h2>📅 Monthly meeting</h2>
          <p>No meeting is scheduled yet.</p>
          <p><button type="button" className="btn" onClick={() => onGo('meetings')}>Set the meeting</button></p>
        </section>
      )}
    </>
  );
}
