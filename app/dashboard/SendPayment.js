'use client';
import Empty from '../Empty';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

const money = (n) => 'GH₵ ' + Number(n || 0).toLocaleString();
const day = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function intl(phone) {
  let p = String(phone || '').replace(/[^\d+]/g, '');
  if (!p) return '';
  if (p.startsWith('+')) return p.slice(1);
  if (p.startsWith('00')) return p.slice(2);
  if (p.startsWith('0')) return '233' + p.slice(1);
  return p;
}

// Admin: pick a student, enter amount and reason, send. The student is alerted on their Home page.
export default function SendPayment({ adminId }) {
  const [students, setStudents] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ user_id: '', amount: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [sent, setSent] = useState(null);

  const load = useCallback(async () => {
    const s = await supabase.from('profiles').select('id, full_name, email, phone').order('full_name');
    setStudents((s.data || []).filter((x) => x.id !== adminId));
    const r = await supabase.from('sent_payments').select('*').order('created_at', { ascending: false }).limit(30);
    if (r.error) setMsg({ err: true, t: 'Run supabase/sent_payments.sql in the Supabase SQL Editor first.' });
    setRows(r.data || []);
  }, [adminId]);
  useEffect(() => { load(); }, [load]);

  const find = (id) => students.find((x) => x.id === id);
  const name = (id) => { const s = find(id); return s ? (s.full_name || s.email || 'Student') : 'Student'; };

  async function send(e) {
    e.preventDefault();
    setMsg(null); setSent(null);
    const amount = Number(form.amount);
    if (!form.user_id) return setMsg({ err: true, t: 'Choose a student.' });
    if (!(amount > 0)) return setMsg({ err: true, t: 'Enter an amount above 0.' });
    if (!form.reason.trim()) return setMsg({ err: true, t: 'Enter the reason.' });
    setBusy(true);
    const { error } = await supabase.from('sent_payments').insert({ user_id: form.user_id, amount, reason: form.reason.trim(), created_by: adminId });
    setBusy(false);
    if (error) return setMsg({ err: true, t: error.message });
    setSent({ ...form, amount });
    setForm({ user_id: '', amount: '', reason: '' });
    load();
  }

  async function del(id) {
    if (!confirm('Delete this payment record? The student will no longer see it.')) return;
    const { error } = await supabase.from('sent_payments').delete().eq('id', id);
    if (error) return setMsg({ err: true, t: error.message });
    load();
  }

  async function clearAll() {
    if (!confirm('Delete ALL sent payment records? Students will no longer see them either. This cannot be undone.')) return;
    const { error } = await supabase.from('sent_payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) return setMsg({ err: true, t: error.message });
    setSent(null);
    load();
  }

  const sentStudent = sent ? find(sent.user_id) : null;
  const first = sentStudent ? (sentStudent.full_name || 'there').split(' ')[0] : '';
  const text = sent ? `Hello ${first}, the Daakyehene Foundation has sent you ${money(sent.amount)} for: ${sent.reason}. You can also see it on your portal Home page. Daakyehene Foundation` : '';

  return (
    <>
      <form className="card" onSubmit={send}>
        <h2>Send a payment</h2>
        <p>Pick a student, enter the amount and reason. The student gets an alert on their Home page.</p>
        <label htmlFor="sp-s">Student</label>
        <select id="sp-s" required value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })}>
          <option value="">Choose a student…</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}
        </select>
        <label htmlFor="sp-a">Amount (GH₵)</label>
        <input id="sp-a" type="number" min="0.01" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <label htmlFor="sp-r">Reason</label>
        <input id="sp-r" required placeholder="e.g. Transport, books, data" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        {msg && <div className={'msg' + (msg.err ? ' err' : '')}>{msg.t}</div>}
        <p><button className="btn" disabled={busy}>{busy ? 'Sending…' : 'Send payment'}</button></p>
      </form>

      {sent && (
        <section className="card">
          <h2>Sent ✓</h2>
          <p>{money(sent.amount)} to <b>{name(sent.user_id)}</b> · {sent.reason}. They will see an alert when they open the portal.</p>
          <p>Want to tell them now too?</p>
          <p>
            {sentStudent && sentStudent.phone && <a className="btn alt sm" target="_blank" rel="noreferrer" href={'https://wa.me/' + intl(sentStudent.phone) + '?text=' + encodeURIComponent(text)}>WhatsApp</a>}{' '}
            {sentStudent && sentStudent.email && <a className="btn alt sm" href={'mailto:' + sentStudent.email + '?subject=' + encodeURIComponent('Payment from Daakyehene Foundation') + '&body=' + encodeURIComponent(text)}>Email</a>}
          </p>
        </section>
      )}

      <section className="card">
        <h2>Recent payments sent</h2>
        {rows.length > 0 && <p><button className="btn del sm" onClick={clearAll}>Clear all</button></p>}
        {rows.length === 0 && <Empty icon="💸" title="No payments sent yet" />}
        {rows.map((r) => (
          <div className="row" key={r.id}>
            <span><b>{name(r.user_id)}</b> · {money(r.amount)}<br /><small>{r.reason} · {day(r.created_at)}{r.seen ? ' · seen' : ' · not seen yet'}</small></span>
            <button className="btn del sm" onClick={() => del(r.id)}>Delete</button>
          </div>
        ))}
      </section>
    </>
  );
}
