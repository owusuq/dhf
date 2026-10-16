'use client';
import Skeleton from '../Skeleton';
import Empty from '../Empty';
import AgreementText from '../AgreementText';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { DEFAULT_TITLE, DEFAULT_BODY } from '../../lib/agreement-default';

const day = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function intl(phone) {
  let p = String(phone || '').replace(/[^\d+]/g, '');
  if (!p) return '';
  if (p.startsWith('+')) return p;
  if (p.startsWith('00')) return '+' + p.slice(2);
  if (p.startsWith('0')) return '+233' + p.slice(1);
  return '+' + p;
}

const SQL_HINT = 'Run supabase/agreement.sql in the Supabase SQL Editor first.';

export default function AgreementAdmin() {
  const [doc, setDoc] = useState(undefined);
  const [students, setStudents] = useState(null);
  const [sigs, setSigs] = useState([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [again, setAgain] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('not');
  const [copied, setCopied] = useState(false);

  async function load() {
    const d = await supabase.from('agreement_doc').select('*').eq('id', 1).maybeSingle();
    if (d.error) return setErr(d.error.message + ' ' + SQL_HINT);
    setDoc(d.data || null);
    const pr = await supabase.from('profiles').select('id, full_name, email, phone, level, is_admin').order('full_name');
    if (pr.error) return setErr(pr.error.message);
    setStudents((pr.data || []).filter((x) => !x.is_admin));
    if (d.data) {
      const s = await supabase.from('agreement_signatures').select('*').eq('version', d.data.version);
      setSigs(s.data || []);
    }
  }
  useEffect(() => { load(); }, []);

  const link = typeof window !== 'undefined' ? window.location.origin + '/agreement' : '/agreement';
  const share = 'https://wa.me/?text=' + encodeURIComponent('Please read and sign the Daakyehene Foundation student agreement: ' + link);

  async function copyLink() {
    try { await navigator.clipboard.writeText(link); } catch (e) { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function startEdit() {
    setTitle(doc ? doc.title : DEFAULT_TITLE);
    setBody(doc ? doc.body : DEFAULT_BODY);
    setAgain(false);
    setMsg('');
    setEditing(true);
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const version = (doc ? doc.version : 0) + (again || !doc ? 1 : 0) || 1;
    const row = { id: 1, title: title.trim() || DEFAULT_TITLE, body, version, updated_at: new Date().toISOString() };
    const res = await supabase.from('agreement_doc').upsert(row).select().single();
    setBusy(false);
    if (res.error) return setErr(res.error.message + ' ' + SQL_HINT);
    setEditing(false);
    setMsg(again ? 'Saved. Students must agree again.' : 'Saved.');
    await load();
  }

  async function removeSig(s) {
    if (!window.confirm('Remove this signature? The student will be able to sign again.')) return;
    const res = await supabase.from('agreement_signatures').delete().eq('id', s.id).select('id');
    if (res.error) return setErr(res.error.message);
    setSigs((l) => l.filter((x) => x.id !== s.id));
  }

  if (err && doc === undefined) return <section className="card"><div className="msg err">{err}</div></section>;
  if (doc === undefined || students === null) return <section className="card"><Skeleton lines={4} /></section>;

  const sigBy = Object.fromEntries(sigs.map((s) => [s.user_id, s]));
  const signedList = students.filter((x) => sigBy[x.id]);
  const notList = students.filter((x) => !sigBy[x.id]);
  const list = filter === 'signed' ? signedList : notList;
  const tabs = [['not', 'Not yet (' + notList.length + ')'], ['signed', 'Signed (' + signedList.length + ')']];

  return (
    <>
      <section className="card">
        <h2>Student agreement</h2>
        <p><b>{signedList.length} of {students.length}</b> students have signed{doc ? ` · version ${doc.version}` : ''}.</p>
        <p><small>Link for students (they log in, read, agree and sign):</small></p>
        <p><b style={{ overflowWrap: 'anywhere' }}>{link}</b></p>
        <p>
          <button type="button" className="btn" onClick={copyLink}>{copied ? 'Copied ✓' : 'Copy link'}</button>{' '}
          <a className="btn alt" href={share} target="_blank" rel="noreferrer">Share on WhatsApp</a>
        </p>
        {msg && <div className="msg">{msg}</div>}
        {err && <div className="msg err">{err}</div>}
      </section>

      {!editing && (
        <section className="card">
          <p>
            <button type="button" className="btn" onClick={startEdit}>{doc ? 'Edit agreement' : 'Write agreement'}</button>
          </p>
          {doc ? (
            <>
              <h3>{doc.title}</h3>
              <AgreementText body={doc.body} />
            </>
          ) : (
            <Empty icon="📄" title="No agreement yet" />
          )}
        </section>
      )}

      {editing && (
        <section className="card">
          <form onSubmit={save}>
            <h2>Edit agreement</h2>
            <label htmlFor="ag-t">Title</label>
            <input id="ag-t" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} />
            <label htmlFor="ag-b">Text</label>
            <textarea id="ag-b" rows={16} value={body} onChange={(e) => setBody(e.target.value)} />
            <p><small>Tip: start a line with a number and a dot (for example "2. Monthly meeting") to make it a heading.</small></p>
            {doc && (
              <label style={{ display: 'flex', gap: '.6rem', alignItems: 'flex-start' }}>
                <input type="checkbox" checked={again} onChange={(e) => setAgain(e.target.checked)} style={{ width: 'auto', marginTop: '.25rem' }} />
                <span>Students must read and agree again (starts a new version)</span>
              </label>
            )}
            <p>
              <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>{' '}
              <button type="button" className="btn alt" onClick={() => setEditing(false)}>Cancel</button>{' '}
              <button type="button" className="btn alt sm" onClick={() => { if (window.confirm('Replace the text with the default agreement?')) { setTitle(DEFAULT_TITLE); setBody(DEFAULT_BODY); } }}>Use default text</button>
            </p>
          </form>
        </section>
      )}

      {doc && (
        <section className="card">
          <h2>Who has signed</h2>
          <div className="tabs">
            {tabs.map(([k, label]) => (
              <button key={k} type="button" className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{label}</button>
            ))}
          </div>
          {list.length === 0 && <Empty icon="📄" title={filter === 'signed' ? 'No signatures yet' : 'Everyone has signed 🎉'} />}
          {list.map((s) => {
            const sig = sigBy[s.id];
            const first = (s.full_name || 'friend').split(' ')[0];
            const phone = intl(s.phone);
            const text = `Hello ${first}, please read and sign the Daakyehene Foundation student agreement here: ${link}`;
            return (
              <div key={s.id} style={{ padding: '.6rem 0', borderTop: '1px solid var(--line)' }}>
                <b>{s.full_name || s.email}</b>
                <div><small>{sig ? `Signed ${day(sig.signed_at)} as "${sig.full_name}"` : (s.level ? 'Level ' + s.level : s.email)}</small></div>
                <p className="remind">
                  {!sig && phone && <a className="btn sm" href={`https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">WhatsApp reminder</a>}
                  {sig && <button type="button" className="btn del sm" onClick={() => removeSig(sig)}>Remove signature</button>}
                </p>
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}
