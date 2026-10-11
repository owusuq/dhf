'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function DataSupportAdmin() {
  const [s, setS] = useState(null);
  const [reqs, setReqs] = useState([]);
  const [names, setNames] = useState({});

  async function load() {
    const { data: st } = await supabase.from('data_settings').select('*').eq('id', 1).single();
    setS(st);
    const { data: r } = await supabase.from('data_requests').select('*').order('created_at', { ascending: false });
    setReqs(r || []);
    const { data: p } = await supabase.from('profiles').select('*');
    setNames(Object.fromEntries((p || []).map((x) => [x.id, x.full_name || x.name || x.fullname || x.email || 'Student'])));
  }
  useEffect(() => { load(); }, []);

  async function save(patch) {
    setS({ ...s, ...patch });
    await supabase.from('data_settings').update(patch).eq('id', 1);
  }
  async function markSent(id) {
    await supabase.from('data_requests').update({ status: 'sent' }).eq('id', id);
    load();
  }

  async function removeReq(id) {
    if (!window.confirm('Delete this request?')) return;
    const { data, error } = await supabase.from('data_requests').delete().eq('id', id).select('id');
    if (error || !data || !data.length) return alert('Nothing was deleted. Run supabase/data_requests_delete.sql in Supabase first.');
    load();
  }
  async function clearSent() {
    const n = reqs.filter((x) => x.status !== 'pending').length;
    if (!n || !window.confirm('Delete all ' + n + ' sent requests permanently?')) return;
    const { data, error } = await supabase.from('data_requests').delete().neq('status', 'pending').select('id');
    if (error || !data || !data.length) return alert('Nothing was deleted. Run supabase/data_requests_delete.sql in Supabase first.');
    load();
  }

  if (!s) return <p style={{ padding: 20 }}>Loading…</p>;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <h2>Data Support (Admin)</h2>

      <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '12px 0' }}>
        <input type="checkbox" checked={s.is_open} onChange={(e) => save({ is_open: e.target.checked })} />
        Open data support to students
      </label>

      <textarea rows={2} style={{ width: '100%', padding: 10, boxSizing: 'border-box' }}
        placeholder="Offer message, e.g. This week: 5GB for everyone!"
        defaultValue={s.offer_text} onBlur={(e) => save({ offer_text: e.target.value })} />

      <p style={{ marginTop: 12 }}>Bundles (GB, comma separated):</p>
      <input style={{ width: '100%', padding: 10, boxSizing: 'border-box' }} defaultValue={s.bundles.join(', ')}
        onBlur={(e) => {
          const b = e.target.value.split(',').map((x) => parseInt(x.trim(), 10)).filter((n) => n >= 1 && n <= 15);
          if (b.length) save({ bundles: b });
        }} />

      <h3 style={{ marginTop: 28 }}>Requests</h3>
      {reqs.some((x) => x.status !== 'pending') && (
        <p><button onClick={clearSent}>Clear all sent</button></p>
      )}
      {reqs.length === 0 && <p>No requests yet.</p>}
      {reqs.map((r) => (
        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '10px 0', borderBottom: '1px solid #eee' }}>
          <span><b>{names[r.user_id] || 'Student'}</b> — {r.bundle_gb}GB {r.network} → {r.phone}</span>
          <span style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => navigator.clipboard.writeText(r.phone)}>Copy</button>
            {r.status === 'pending'
              ? <button onClick={() => markSent(r.id)}>Mark sent</button>
              : <span style={{ color: '#198754' }}>Sent</span>}
            <button onClick={() => removeReq(r.id)}>Delete</button>
          </span>
        </div>
      ))}
    </div>
  );
}
