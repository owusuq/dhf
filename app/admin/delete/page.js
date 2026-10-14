'use client';
import Skeleton from '../../Skeleton';
import Empty from '../../Empty';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';

export default function DeleteStudents() {
  const router = useRouter();
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return router.replace('/');
    const me = await supabase.from('profiles').select('is_admin').eq('id', data.session.user.id).single();
    if (!me.data || !me.data.is_admin) return router.replace('/');
    const r = await supabase.from('profiles').select('id, full_name, email, is_admin').order('full_name');
    setRows(r.data || []);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function remove(s) {
    const who = s.full_name || s.email;
    if (!confirm('Delete ' + who + '?\n\nThis permanently removes their login (email and password) and all their details and payments. They will no longer be able to sign in. This cannot be undone.')) return;
    setBusyId(s.id); setErr(''); setMsg('');
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/delete-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (data.session ? data.session.access_token : '') },
        body: JSON.stringify({ userId: s.id }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'Delete failed');
      setMsg(who + ' was deleted.');
      setRows((list) => list.filter((x) => x.id !== s.id));
    } catch (e) {
      setErr(e.message);
    }
    setBusyId(null);
  }

  const list = (rows || []).filter((s) => {
    const t = q.trim().toLowerCase();
    return !t || (s.full_name || '').toLowerCase().includes(t) || (s.email || '').toLowerCase().includes(t);
  });

  return (
    <main>
      <section className="card">
        <h2>Delete students</h2>
        <p><small>Deleting removes the student's login (email and password) and all their details, so they can no longer sign in. This cannot be undone.</small></p>
        <p><Link className="btn alt sm" href="/admin">Back to admin</Link></p>
        <input placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        {msg && <div className="msg">{msg}</div>}
        {err && <div className="msg err">{err}</div>}
        {rows === null && <Skeleton lines={3} />}
        {rows && list.length === 0 && <Empty icon="🔍" title="No students found" />}
        {list.map((s) => (
          <div className="row" key={s.id}>
            <span><b>{s.full_name || '(no name)'}</b><br /><small>{s.email}{s.is_admin ? ' · Admin' : ''}</small></span>
            {s.is_admin
              ? <small>Admin accounts can't be deleted here</small>
              : <button type="button" className="btn del sm" disabled={busyId === s.id} onClick={() => remove(s)}>{busyId === s.id ? 'Deleting…' : 'Delete'}</button>}
          </div>
        ))}
      </section>
    </main>
  );
}
