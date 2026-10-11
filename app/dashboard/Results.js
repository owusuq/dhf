'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

const MAX_BYTES = 4 * 1024 * 1024;
const fmt = (s) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  return { Authorization: 'Bearer ' + (data.session ? data.session.access_token : '') };
}

// Students: see their own results any time. Admins: upload, view, rename and delete results for any student.
export default function Results({ isAdmin }) {
  const [rows, setRows] = useState(null);
  const [students, setStudents] = useState([]);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({ user_id: '', title: '' });
  const [file, setFile] = useState(null);
  const [fileKey, setFileKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    const r = await supabase.from('results').select('*').order('created_at', { ascending: false });
    if (r.error) { setMsg({ err: true, t: r.error.message }); setRows([]); return; }
    setRows(r.data || []);
    if (isAdmin) {
      const s = await supabase.from('profiles').select('id, full_name, email').or('is_admin.is.null,is_admin.eq.false').order('full_name');
      setStudents(s.data || []);
    }
  }, [isAdmin]);
  useEffect(() => { load(); }, [load]);

  const who = (id) => {
    const s = students.find((x) => x.id === id);
    return s ? (s.full_name || s.email || 'Student') : '';
  };

  async function upload(e) {
    e.preventDefault();
    setMsg(null);
    if (!file) return setMsg({ err: true, t: 'Choose a file first.' });
    if (file.size > MAX_BYTES) return setMsg({ err: true, t: 'File is over 4MB. Please use a smaller PDF or image.' });
    setBusy(true);
    const fd = new FormData();
    fd.append('user_id', form.user_id);
    fd.append('title', form.title);
    fd.append('file', file);
    try {
      const res = await fetch('/api/results', { method: 'POST', headers: await authHeader(), body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Upload failed');
      setMsg({ t: 'Uploaded.' });
      setForm({ ...form, title: '' }); setFile(null); setFileKey(fileKey + 1);
      load();
    } catch (err) {
      setMsg({ err: true, t: err.message });
    }
    setBusy(false);
  }

  async function view(r) {
    // Open the tab first so phones do not block it, then fill it in.
    const w = window.open('', '_blank');
    try {
      const res = await fetch('/api/results/' + r.id, { headers: await authHeader() });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || 'Could not open this result'); }
      const url = URL.createObjectURL(await res.blob());
      if (w) w.location.href = url; else window.location.href = url;
    } catch (err) {
      if (w) w.close();
      setMsg({ err: true, t: err.message });
    }
  }

  async function saveTitle(r) {
    const res = await fetch('/api/results/' + r.id, {
      method: 'PATCH',
      headers: { ...(await authHeader()), 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg({ err: true, t: j.error || 'Could not rename' });
    setEditing(null); load();
  }

  async function del(r) {
    if (!confirm('Delete "' + r.title + '"? This removes the file from Google Drive too.')) return;
    const res = await fetch('/api/results/' + r.id, { method: 'DELETE', headers: await authHeader() });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg({ err: true, t: j.error || 'Could not delete' });
    load();
  }

  if (rows === null) return <section className="card">Loading…</section>;
  const shown = isAdmin && filter ? rows.filter((r) => r.user_id === filter) : rows;

  return (
    <>
      {isAdmin && (
        <form className="card" onSubmit={upload}>
          <h2>Upload a result</h2>
          <p>PDF or image works best. Other file types are accepted too. Max 4MB.</p>
          <label htmlFor="rs">Student</label>
          <select id="rs" required value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })}>
            <option value="">Choose a student…</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}
          </select>
          <label htmlFor="rt">Title</label>
          <input id="rt" placeholder="e.g. Term 1 Results" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <label htmlFor="rf">File</label>
          <input id="rf" key={fileKey} type="file" required onChange={(e) => setFile(e.target.files[0] || null)} />
          {msg && <div className={'msg' + (msg.err ? ' err' : '')}>{msg.t}</div>}
          <p><button className="btn" disabled={busy}>{busy ? 'Uploading…' : 'Upload result'}</button></p>
        </form>
      )}

      <section className="card">
        <h2>{isAdmin ? 'All results' : 'My results'}</h2>
        {!isAdmin && msg && <div className={'msg' + (msg.err ? ' err' : '')}>{msg.t}</div>}
        {isAdmin && (
          <select aria-label="Filter by student" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All students</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}
          </select>
        )}
        {shown.length === 0 && <p>{isAdmin ? 'No results uploaded yet.' : 'No results yet. They will appear here once uploaded.'}</p>}
        {shown.map((r) => (
          <div className="row" key={r.id}>
            {editing === r.id ? (
              <>
                <input aria-label="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                <button className="btn sm" onClick={() => saveTitle(r)}>Save</button>
                <button className="btn alt sm" onClick={() => setEditing(null)}>Cancel</button>
              </>
            ) : (
              <>
                <span><b>{r.title}</b><br /><small>{isAdmin && who(r.user_id) ? who(r.user_id) + ' · ' : ''}{fmt(r.created_at)}</small></span>
                <button className="btn sm" onClick={() => view(r)}>View</button>
                {isAdmin && <button className="btn alt sm" onClick={() => { setEditing(r.id); setNewTitle(r.title); }}>Rename</button>}
                {isAdmin && <button className="btn del sm" onClick={() => del(r)}>Delete</button>}
              </>
            )}
          </div>
        ))}
      </section>
    </>
  );
}
