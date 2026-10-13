'use client';
import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';

const money = (n) => 'GH₵ ' + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => (d ? new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');

const CSS = `
.sf-sum{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0 14px}
.sf-sum div{background:#f5f8fb;border:1px solid var(--line);border-radius:12px;padding:8px 10px}
.sf-sum small{display:block;color:#6b7785}
.sf-sum b{font-size:clamp(.95rem,3.4vw,1.15rem);overflow-wrap:anywhere}
.sf-row{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:transparent;border:0;border-top:1px solid var(--line);padding:.75rem .4rem;cursor:pointer;font:inherit;color:inherit;border-radius:8px}
.sf-row:hover{background:#f5f8fb}
.sf-row .nm{flex:1;min-width:0;overflow-wrap:anywhere}
.sf-row .bal{text-align:right;white-space:nowrap}
.sf-row .bal small{display:block;color:#6b7785}
.sf-mini{height:6px;border-radius:99px;background:#e6ebf1;overflow:hidden;margin-top:5px}
.sf-mini i{display:block;height:100%;background:linear-gradient(90deg,var(--gold),#f0c75e)}
.sf-back{position:fixed;inset:0;background:rgba(10,25,45,.55);z-index:20000;display:flex;align-items:center;justify-content:center;padding:16px}
.sf-modal{background:#fff;width:100%;max-width:780px;max-height:calc(100dvh - 32px);overflow-y:auto;overscroll-behavior:contain;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.35);padding:18px 20px 22px;position:relative}
.sf-head{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;position:sticky;top:-18px;background:#fff;margin:-18px -20px 0;padding:16px 20px 10px;z-index:2;border-bottom:1px solid var(--line)}
.sf-head h2{margin:0}
.sf-x{width:40px;height:40px;border-radius:10px;border:1px solid var(--line);background:#fff;font-size:20px;cursor:pointer;flex:none}
.sf-sec{margin-top:18px}
.sf-sec h3{margin-bottom:8px}
.sf-2{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))}
.sf-pay{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:.6rem .2rem;border-top:1px solid var(--line)}
.sf-pay>span{flex:1;min-width:160px;overflow-wrap:anywhere}
.sf-top{background:#fff9e8;border:1px solid #ecd9a0;border-radius:14px;padding:12px}
.sf-after{margin:8px 0 0;font-weight:600}
.sf-ok{background:#e6f4ea;color:#1c6b34}
@media (max-width:640px){.sf-back{padding:0;align-items:flex-end}.sf-modal{max-width:none;max-height:94dvh;border-radius:18px 18px 0 0}}
`;

// Admin: every student with fees, paid and balance. Tap a student to open a wide panel to edit
// their details, total fees and payments (add / top up / edit / delete).
export default function StudentFees() {
  const [students, setStudents] = useState(null);
  const [pays, setPays] = useState([]);
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState(null);
  const [note, setNote] = useState(null); // { text, err }
  const [det, setDet] = useState({ full_name: '', level: '', phone: '' });
  const [full, setFull] = useState(''); // full fees the student must pay in total
  const [onlyOwing, setOnlyOwing] = useState(false);
  const [showOwing, setShowOwing] = useState(true);
  const [owingIn, setOwingIn] = useState(''); // owing typed by admin
  const [edit, setEdit] = useState(null); // { id, paid_on, amount, note }
  const [add, setAdd] = useState({ paid_on: today(), amount: '', note: '' });
  const [busy, setBusy] = useState(false);

  const say = (text, err = false) => setNote({ text, err });

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, level, phone, fees_total, fees_owing').eq('is_admin', false).order('full_name'),
      supabase.from('payments').select('*').order('paid_on', { ascending: false }),
    ]);
    if (a.error) { say(a.error.message, true); setStudents([]); return; }
    setStudents(a.data || []);
    setPays(b.data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  // Close with Escape, and stop the page behind from scrolling while the panel is open
  useEffect(() => {
    if (!openId) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpenId(null); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [openId]);

  function openStudent(s) {
    setNote(null); setEdit(null);
    setAdd({ paid_on: today(), amount: '', note: '' });
    setDet({ full_name: s.full_name || '', level: s.level || '', phone: s.phone || '' });
    setFull(Number(s.fees_total) ? String(s.fees_total) : '');
    setOwingIn(s.fees_owing != null ? String(s.fees_owing) : '');
    setOpenId(s.id);
  }

  async function saveDetails(s) {
    setBusy(true);
    const { data, error } = await supabase.from('profiles')
      .update({ full_name: det.full_name.trim(), level: det.level.trim(), phone: det.phone.trim() })
      .eq('id', s.id).select('id');
    setBusy(false);
    if (error || !data || !data.length) return say(error ? error.message : 'Not saved. Run supabase/admin_edit.sql in Supabase first.', true);
    say('Saved.'); load();
  }
  // Enter the full fees once. The balance owing = full fees minus everything paid so far.
  // Full fees and amount owing are saved exactly as typed. They do not change each other.
  async function saveFull(s, zero) {
    const fees = full === '' ? 0 : Number(full);
    const owe = zero ? 0 : owingIn === '' ? null : Number(owingIn);
    if (isNaN(fees) || fees < 0 || (owe !== null && (isNaN(owe) || owe < 0))) return say('Enter amounts of 0 or more.', true);
    setBusy(true);
    const { data, error } = await supabase.from('profiles').update({ fees_total: fees, fees_owing: owe }).eq('id', s.id).select('id');
    setBusy(false);
    if (error || !data || !data.length) return say(error ? error.message : 'Not saved. Run supabase/admin_edit.sql and supabase/fees_owing.sql in Supabase first.', true);
    if (zero) setOwingIn('0');
    say(owe === null ? 'Saved.' : owe > 0 ? `Saved. ${s.full_name || 'The student'} owes ${money(owe)}.` : 'Saved. Nothing owing.'); load();
  }
  async function addPayment(s) {
    const amount = Number(add.amount);
    if (!amount || amount <= 0) return say('Enter the amount paid.', true);
    setBusy(true);
    const { error } = await supabase.from('payments').insert({ user_id: s.id, paid_on: add.paid_on || today(), amount, note: add.note.trim() });
    setBusy(false);
    if (error) return say(error.message, true);
    setAdd({ paid_on: today(), amount: '', note: '' });
    say('Payment added. The balance is updated.'); load();
  }
  async function savePayment() {
    const amount = Number(edit.amount);
    if (!amount || amount <= 0) return say('Enter the amount paid.', true);
    setBusy(true);
    const { data, error } = await supabase.from('payments').update({ paid_on: edit.paid_on, amount, note: edit.note.trim() }).eq('id', edit.id).select('id');
    setBusy(false);
    if (error || !data || !data.length) return say(error ? error.message : 'Not saved.', true);
    setEdit(null); say('Payment updated.'); load();
  }
  async function removePayment(id) {
    if (!window.confirm('Delete this payment?')) return;
    const { data, error } = await supabase.from('payments').delete().eq('id', id).select('id');
    if (error || !data || !data.length) return say(error ? error.message : 'Not deleted.', true);
    say('Payment deleted.'); load();
  }

  if (!students) return <p style={{ padding: 20 }}>{note ? note.text : 'Loading…'}</p>;

  const paidBy = (id) => pays.filter((p) => p.user_id === id).reduce((t, p) => t + Number(p.amount), 0);
  const term = q.trim().toLowerCase();
  const owingOf = (s) => (s.fees_owing != null ? Number(s.fees_owing) : Math.max(0, Number(s.fees_total || 0) - paidBy(s.id)));
  const owes = (s) => owingOf(s) > 0;
  const list = students
    .filter((s) => !term || (s.full_name || '').toLowerCase().includes(term) || (s.email || '').toLowerCase().includes(term))
    .filter((s) => !onlyOwing || owes(s));
  const notSet = students.filter((s) => !Number(s.fees_total || 0)).length;

  const allTotal = students.reduce((t, s) => t + Number(s.fees_total || 0), 0);
  const allPaid = students.reduce((t, s) => t + paidBy(s.id), 0);
  const allBal = students.reduce((t, s) => t + owingOf(s), 0);

  const sel = openId ? students.find((s) => s.id === openId) : null;
  const selPays = sel ? pays.filter((p) => p.user_id === sel.id) : [];
  const selPaid = sel ? paidBy(sel.id) : 0;
  const selTotal = sel ? Number(sel.fees_total || 0) : 0;
  const selBal = sel ? owingOf(sel) : 0;
  const selPct = selTotal > 0 ? Math.min(100, Math.round((selPaid / selTotal) * 100)) : 0;
  const typed = Number(add.amount) > 0 ? Number(add.amount) : 0;
  const after = selBal - typed;

  return (
    <section className="card">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <h2>Student fees ({students.length})</h2>
      <div className="sf-sum">
        <div><small>Total fees</small><b>{money(allTotal)}</b></div>
        <div><small>Received</small><b>{money(allPaid)}</b></div>
        <div><small>Total owing</small><b>{showOwing ? money(allBal) : '••••'}</b></div>
      </div>
      <input placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} />
      <p style={{ margin: '8px 0 0' }}>
        <button type="button" className="btn sm alt" onClick={() => setShowOwing(!showOwing)} style={{ marginRight: 10 }}>{showOwing ? 'Hide owing' : 'Show owing'}</button>
        <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={onlyOwing} onChange={(e) => setOnlyOwing(e.target.checked)} /> Show only students who owe
        </label>
        {notSet > 0 && <small style={{ display: 'block', color: '#6b7785' }}>{notSet} student{notSet > 1 ? 's have' : ' has'} no full fees entered yet.</small>}
      </p>
      {!sel && note && <div className={'msg' + (note.err ? ' err' : '')}>{note.text}</div>}
      {list.length === 0 && <p><small>No students found.</small></p>}
      <div style={{ marginTop: 8 }}>
        {list.map((s) => {
          const paid = paidBy(s.id);
          const total = Number(s.fees_total || 0);
          const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
          return (
            <button type="button" className="sf-row" key={s.id} onClick={() => openStudent(s)}>
              <span className="nm">
                <b>{s.full_name || s.email}</b>
                <small style={{ display: 'block', color: '#6b7785' }}>Fees {money(total)} · Paid {money(paid)}</small>
                <div className="sf-mini"><i style={{ width: pct + '%' }} /></div>
              </span>
              <span className="bal">
                <small>Owing</small>
                <b>{showOwing ? money(owingOf(s)) : '••••'}</b>
              </span>
              <span aria-hidden="true">›</span>
            </button>
          );
        })}
      </div>

      {sel && typeof document !== 'undefined' && createPortal(
        <div className="sf-back" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpenId(null); }}>
          <div className="sf-modal" role="dialog" aria-modal="true" aria-label={'Edit ' + (sel.full_name || sel.email)}>
            <div className="sf-head">
              <div>
                <h2>{sel.full_name || sel.email}</h2>
                <small style={{ color: '#6b7785' }}>{sel.email}</small>
              </div>
              <button type="button" className="sf-x" aria-label="Close" onClick={() => setOpenId(null)}>✕</button>
            </div>

            <div className="sf-sum">
              <div><small>Total fees</small><b>{money(selTotal)}</b></div>
              <div><small>Payments logged</small><b>{money(selPaid)}</b></div>
              <div><small>Owing</small><b>{money(selBal)}</b></div>
            </div>
            <div className="bar" role="progressbar" aria-valuenow={selPct} aria-valuemin="0" aria-valuemax="100"><i style={{ width: selPct + '%' }} /></div>

            {note && <div className={'msg' + (note.err ? ' err' : ' sf-ok')}>{note.text}</div>}

            <div className="sf-sec sf-top">
              <h3>Full fees &amp; amount owing</h3>
              <p style={{ margin: '0 0 8px' }}><small>Enter each one on its own. They are saved exactly as you type them. Payments logged so far: <b>{money(selPaid)}</b></small></p>
              <div className="sf-2">
                <div><label>Full fees (GH₵)</label><input type="number" min="0" step="0.01" placeholder="e.g. 2690" value={full} onChange={(e) => setFull(e.target.value)} /></div>
                <div><label>Amount owing (GH₵)</label><input type="number" min="0" step="0.01" placeholder="e.g. 876" value={owingIn} onChange={(e) => setOwingIn(e.target.value)} /></div>
              </div>
              <p style={{ margin: '10px 0 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="btn" disabled={busy} onClick={() => saveFull(sel)}>Save</button>
                <button type="button" className="btn alt" disabled={busy} onClick={() => saveFull(sel, true)}>Mark fully paid</button>
              </p>
            </div>

            <div className="sf-sec">
              <h3>Top up / add a payment</h3>
              <div className="sf-2">
                <div><label>Amount (GH₵)</label><input type="number" min="0" step="0.01" placeholder="0.00" value={add.amount} onChange={(e) => setAdd({ ...add, amount: e.target.value })} /></div>
                <div><label>Date paid</label><input type="date" value={add.paid_on} onChange={(e) => setAdd({ ...add, paid_on: e.target.value })} /></div>
                <div><label>Note</label><input placeholder="e.g. MoMo, cash, part payment" value={add.note} onChange={(e) => setAdd({ ...add, note: e.target.value })} /></div>
              </div>
              <p style={{ margin: '8px 0 0' }}><button type="button" className="btn" disabled={busy} onClick={() => addPayment(sel)}>Add payment</button></p>
            </div>

            <div className="sf-sec">
              <h3>Payments made ({selPays.length})</h3>
              {selPays.length === 0 && <p><small>No payments logged yet.</small></p>}
              {selPays.map((p) => edit && edit.id === p.id ? (
                <div className="sf-pay" key={p.id} style={{ display: 'block' }}>
                  <div className="sf-2">
                    <input type="date" value={edit.paid_on} onChange={(e) => setEdit({ ...edit, paid_on: e.target.value })} />
                    <input type="number" min="0" step="0.01" value={edit.amount} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} />
                    <input placeholder="Note" value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} />
                  </div>
                  <p style={{ margin: '8px 0 0', display: 'flex', gap: 8 }}>
                    <button type="button" className="btn sm" disabled={busy} onClick={savePayment}>Save</button>
                    <button type="button" className="btn sm alt" onClick={() => setEdit(null)}>Cancel</button>
                  </p>
                </div>
              ) : (
                <div className="sf-pay" key={p.id}>
                  <span><b>{money(p.amount)}</b> · {fmtDate(p.paid_on)}<br /><small>{p.note || 'No note'}</small></span>
                  <button type="button" className="btn sm alt" onClick={() => setEdit({ id: p.id, paid_on: p.paid_on, amount: String(p.amount), note: p.note || '' })}>Edit</button>
                  <button type="button" className="btn sm del" onClick={() => removePayment(p.id)}>Delete</button>
                </div>
              ))}
            </div>

            <div className="sf-sec">
              <h3>Student details</h3>
              <div className="sf-2">
                <div><label>Full name</label><input value={det.full_name} onChange={(e) => setDet({ ...det, full_name: e.target.value })} /></div>
                <div><label>Level</label><input value={det.level} onChange={(e) => setDet({ ...det, level: e.target.value })} /></div>
                <div><label>Phone</label><input type="tel" value={det.phone} onChange={(e) => setDet({ ...det, phone: e.target.value })} /></div>
              </div>
              <p style={{ margin: '10px 0 0', display: 'flex', gap: 8 }}>
                <button type="button" className="btn" disabled={busy} onClick={() => saveDetails(sel)}>Save details</button>
                <button type="button" className="btn alt" onClick={() => setOpenId(null)}>Done</button>
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
