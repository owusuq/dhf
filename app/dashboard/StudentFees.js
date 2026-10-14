'use client';
import Skeleton from '../Skeleton';
import Empty from '../Empty';
import CountUp from '../CountUp';
import { feeInfo } from '../../lib/fee';
import { notify } from '../../lib/toast';
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
.sf-yr{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 12px;background:#f5f8fb;border:1px solid var(--line);border-radius:10px;padding:8px 10px;margin-top:10px;font-weight:600}
.sf-yr.big{background:#fff;border-color:#ecd9a0}
.sf-tm{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:.6rem .2rem;border-top:1px solid var(--line)}
.sf-tm>span:first-child{flex:1;min-width:160px;overflow-wrap:anywhere}
.sf-ok{background:#e6f4ea;color:#1c6b34}
@media (max-width:640px){.sf-back{padding:0;align-items:flex-end}.sf-modal{max-width:none;max-height:94dvh;border-radius:18px 18px 0 0}}
`;

// Terms: each student can have several terms (Term 1, Term 2 ...), each with its own fee and an optional year.
// Full fees = all terms added together. Owing = full fees minus every payment logged.
// Payments are applied to the earliest term first, so each term shows what is paid and what is left.
const sumTerms = (list) => list.reduce((t, x) => t + Number(x.amount || 0), 0);
function allocateTerms(list, paid) {
  let left = Number(paid) || 0;
  return list.map((t) => {
    const amt = Number(t.amount || 0);
    const p = Math.min(left, amt);
    left -= p;
    return { ...t, paid: p, owing: amt - p };
  });
}
// Suggests the next term name from the last one: "Term 1" -> "Term 2".
function nextTermName(list) {
  const last = list[list.length - 1];
  if (!last) return 'Term 1';
  const name = (last.term_name || '').trim();
  const m = /(\d+)\s*$/.exec(name);
  return m ? name.replace(/(\d+)\s*$/, String(Number(m[1]) + 1)) : 'Term ' + (list.length + 1);
}

// Admin: every student with fees, paid and balance. Tap a student to open a wide panel to edit
// their details, total fees and payments (add / top up / edit / delete).
export default function StudentFees() {
  const [students, setStudents] = useState(null);
  const [pays, setPays] = useState([]);
  const [q, setQ] = useState('');
  const [lim, setLim] = useState(30);
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
  const [terms, setTerms] = useState([]); // every student's fee terms
  const [termsOk, setTermsOk] = useState(true); // false until supabase/fee_terms.sql has been run
  const [tAdd, setTAdd] = useState({ name: 'Term 1', year: '', amount: '' });
  const [tEdit, setTEdit] = useState(null); // { id, name, year, amount }

  const say = (text, err = false) => { if (!err && notify(text.replace(/\.$/, ''))) setNote(null); else setNote({ text, err }); };

  const load = useCallback(async () => {
    const [a, b, c] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, level, phone, fees_total, fees_owing').eq('is_admin', false).order('full_name'),
      supabase.from('payments').select('*').order('paid_on', { ascending: false }),
      supabase.from('fee_terms').select('*').order('created_at'),
    ]);
    if (a.error) { say(a.error.message, true); setStudents([]); return; }
    setStudents(a.data || []);
    setPays(b.data || []);
    if (c.error) { setTermsOk(false); setTerms([]); } else { setTermsOk(true); setTerms(c.data || []); }
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
    setNote(null); setEdit(null); setTEdit(null);
    const mine = terms.filter((t) => t.user_id === s.id);
    setTAdd({ name: nextTermName(mine), year: mine.length ? (mine[mine.length - 1].year_label || '') : '', amount: '' });
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

  // Keep the student's full fees in step with their terms. Owing is left empty so it is always
  // worked out as full fees minus payments (the student page and exports already do that).
  async function syncFees(sid, list) {
    const { data, error } = await supabase.from('profiles').update({ fees_total: sumTerms(list), fees_owing: null }).eq('id', sid).select('id');
    if (error) return error.message;
    if (!data || !data.length) return 'The term was saved but the total was not updated. Run supabase/admin_edit.sql in Supabase first.';
    return null;
  }
  async function addTerm(s) {
    const name = tAdd.name.trim();
    const amount = Number(tAdd.amount);
    if (!name) return say('Enter the term name, e.g. Term 2.', true);
    if (tAdd.amount === '' || isNaN(amount) || amount < 0) return say('Enter the fee for this term (0 or more).', true);
    const mine = terms.filter((t) => t.user_id === s.id);
    if (!mine.length && (Number(s.fees_total) > 0 || s.fees_owing != null) &&
      !window.confirm('This student has fees entered by hand (full fees ' + money(s.fees_total) + (s.fees_owing != null ? ', owing ' + money(s.fees_owing) : '') + '). Adding terms will work the fees out from the terms and the payments logged instead, so add any earlier payments under Top up / add a payment too. Continue?')) return;
    setBusy(true);
    const { data, error } = await supabase.from('fee_terms').insert({ user_id: s.id, term_name: name, year_label: tAdd.year.trim(), amount }).select('*');
    if (error || !data || !data.length) { setBusy(false); return say(error ? error.message : 'Term not saved.', true); }
    const list = [...mine, ...data];
    const bad = await syncFees(s.id, list);
    setFull(String(sumTerms(list))); setOwingIn('');
    setBusy(false);
    setTAdd({ name: nextTermName(list), year: tAdd.year.trim(), amount: '' });
    if (bad) say(bad, true); else say(name + ' added. Full fees are now ' + money(sumTerms(list)) + '.');
    load();
  }
  async function saveTerm(s) {
    const name = tEdit.name.trim();
    const amount = Number(tEdit.amount);
    if (!name) return say('Enter the term name.', true);
    if (tEdit.amount === '' || isNaN(amount) || amount < 0) return say('Enter the fee for this term (0 or more).', true);
    setBusy(true);
    const { data, error } = await supabase.from('fee_terms').update({ term_name: name, year_label: tEdit.year.trim(), amount }).eq('id', tEdit.id).select('id');
    if (error || !data || !data.length) { setBusy(false); return say(error ? error.message : 'Not saved.', true); }
    const list = terms.filter((t) => t.user_id === s.id).map((t) => (t.id === tEdit.id ? { ...t, amount } : t));
    const bad = await syncFees(s.id, list);
    setFull(String(sumTerms(list))); setOwingIn('');
    setBusy(false); setTEdit(null);
    if (bad) say(bad, true); else say('Term updated. Full fees are now ' + money(sumTerms(list)) + '.');
    load();
  }
  async function removeTerm(s, id) {
    if (!window.confirm('Delete this term? The full fees and amount owing will be worked out again.')) return;
    const { data, error } = await supabase.from('fee_terms').delete().eq('id', id).select('id');
    if (error || !data || !data.length) return say(error ? error.message : 'Not deleted.', true);
    const list = terms.filter((t) => t.user_id === s.id && t.id !== id);
    const bad = await syncFees(s.id, list);
    setFull(list.length ? String(sumTerms(list)) : ''); setOwingIn('');
    if (bad) say(bad, true); else say(list.length ? 'Term deleted. Full fees are now ' + money(sumTerms(list)) + '.' : 'Term deleted. This student has no terms now, so enter the fees by hand or add a term.');
    load();
  }

  if (!students) return note ? <p style={{ padding: 20 }}>{note.text}</p> : <Skeleton lines={5} />;

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
  const sTerms = sel ? terms.filter((t) => t.user_id === sel.id) : [];
  const termRows = allocateTerms(sTerms, selPaid);
  const years = [];
  termRows.forEach((t) => { const y = (t.year_label || '').trim(); if (!years.includes(y)) years.push(y); });
  const typed = Number(add.amount) > 0 ? Number(add.amount) : 0;
  const after = selBal - typed;

  return (
    <section className="card">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <h2>Student fees ({students.length})</h2>
      <div className="sf-sum">
        <div><small>Total fees</small><b><CountUp prefix="GH₵ " value={allTotal} /></b></div>
        <div><small>Received</small><b><CountUp prefix="GH₵ " value={allPaid} /></b></div>
        <div><small>Total owing</small><b>{showOwing ? <CountUp prefix="GH₵ " value={allBal} /> : '••••'}</b></div>
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
      {list.length === 0 && <Empty icon="🔍" title="No students found" hint="Try a different name or clear the filter." />}
      <div style={{ marginTop: 8 }}>
        {list.slice(0, lim).map((s) => {
          const paid = paidBy(s.id);
          const total = Number(s.fees_total || 0);
          const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
          const fee = (total > 0 || s.fees_owing != null) ? feeInfo(total, owingOf(s), pct) : null;
          return (
            <button type="button" className="sf-row" key={s.id} onClick={() => openStudent(s)}>
              <span className="nm">
                <b>{s.full_name || s.email}</b>{fee && <span className={'fee-tag sm ' + fee.cls}>{fee.label}</span>}
                <small style={{ display: 'block', color: '#6b7785' }}>Fees {money(total)} · Paid {money(paid)}</small>
                <div className="sf-mini"><i style={{ width: pct + '%', background: fee ? fee.bg : undefined }} /></div>
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
      {list.length > lim && <p><button type="button" className="btn alt sm" onClick={() => setLim(lim + 30)}>Show more ({list.length - lim} left)</button></p>}

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
            {(selTotal > 0 || (sel && sel.fees_owing != null)) && <p className="fee-line" style={{ color: 'inherit' }}><span className={'fee-tag ' + feeInfo(selTotal, selBal, selPct).cls}>{feeInfo(selTotal, selBal, selPct).label}</span><small>{selPct}% paid</small></p>}
            <div className="bar" role="progressbar" aria-valuenow={selPct} aria-valuemin="0" aria-valuemax="100"><i style={{ width: selPct + '%', background: (selTotal > 0 || (sel && sel.fees_owing != null)) ? feeInfo(selTotal, selBal, selPct).bg : undefined }} /></div>

            {note && <div className={'msg' + (note.err ? ' err' : ' sf-ok')}>{note.text}</div>}

            <div className="sf-sec sf-top">
              <h3>Terms &amp; yearly fees</h3>
              {!termsOk ? (
                <div className="msg err">Terms are not set up yet. Run <b>supabase/fee_terms.sql</b> in Supabase (SQL Editor), then refresh this page.</div>
              ) : (<>
                <p style={{ margin: '0 0 8px' }}><small>Add the fee for each term. <b>Full fees</b> = all terms added together. <b>Owing</b> = full fees minus payments logged. Payments are counted against the earliest term first.</small></p>
                {termRows.length === 0 && <p style={{ margin: '0 0 8px' }}><small>No terms yet. Add the first term below.</small></p>}
                {years.map((y) => {
                  const rows = termRows.filter((t) => (t.year_label || '').trim() === y);
                  const yt = sumTerms(rows);
                  const yp = rows.reduce((t, x) => t + x.paid, 0);
                  return (
                    <div key={y || 'none'}>
                      {(years.length > 1 || y) && <div className="sf-yr"><span>{y ? 'Year ' + y : 'No year'} · total {money(yt)}</span><span>Paid {money(yp)} · Owing {money(yt - yp)}</span></div>}
                      {rows.map((r) => {
                        const pct = Number(r.amount) > 0 ? Math.min(100, Math.round((r.paid / Number(r.amount)) * 100)) : 0;
                        const info = feeInfo(Number(r.amount), r.owing, pct);
                        return tEdit && tEdit.id === r.id ? (
                          <div className="sf-tm" key={r.id} style={{ display: 'block' }}>
                            <div className="sf-2">
                              <input placeholder="Term name" value={tEdit.name} onChange={(e) => setTEdit({ ...tEdit, name: e.target.value })} />
                              <input placeholder="Year (optional)" value={tEdit.year} onChange={(e) => setTEdit({ ...tEdit, year: e.target.value })} />
                              <input type="number" min="0" step="0.01" placeholder="Fee" value={tEdit.amount} onChange={(e) => setTEdit({ ...tEdit, amount: e.target.value })} />
                            </div>
                            <p style={{ margin: '8px 0 0', display: 'flex', gap: 8 }}>
                              <button type="button" className="btn sm" disabled={busy} onClick={() => saveTerm(sel)}>Save</button>
                              <button type="button" className="btn sm alt" onClick={() => setTEdit(null)}>Cancel</button>
                            </p>
                          </div>
                        ) : (
                          <div className="sf-tm" key={r.id}>
                            <span><b>{r.term_name}</b> · {money(r.amount)}<br /><small>Paid {money(r.paid)} · Owing {money(r.owing)}</small></span>
                            <span className={'fee-tag sm ' + info.cls}>{info.label}</span>
                            <button type="button" className="btn sm alt" onClick={() => setTEdit({ id: r.id, name: r.term_name || '', year: r.year_label || '', amount: String(r.amount) })}>Edit</button>
                            <button type="button" className="btn sm del" onClick={() => removeTerm(sel, r.id)}>Delete</button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                {termRows.length > 0 && (
                  <>
                    <div className="sf-yr big"><span>Full payment (all terms)</span><b>{money(selTotal)}</b></div>
                    <div className="sf-yr big"><span>Still owing</span><b>{money(selBal)}</b></div>
                    {selPaid > selTotal && <p style={{ margin: '6px 0 0' }}><small>Paid {money(selPaid - selTotal)} more than the full fees.</small></p>}
                  </>
                )}
                <h3 style={{ marginTop: 16 }}>Add a term</h3>
                <div className="sf-2">
                  <div><label>Term name</label><input placeholder="e.g. Term 2" value={tAdd.name} onChange={(e) => setTAdd({ ...tAdd, name: e.target.value })} /></div>
                  <div><label>Year (optional)</label><input placeholder="e.g. 2026/27" value={tAdd.year} onChange={(e) => setTAdd({ ...tAdd, year: e.target.value })} /></div>
                  <div><label>Fee for this term (GH₵)</label><input type="number" min="0" step="0.01" placeholder="e.g. 900" value={tAdd.amount} onChange={(e) => setTAdd({ ...tAdd, amount: e.target.value })} /></div>
                </div>
                <p style={{ margin: '10px 0 0' }}><button type="button" className="btn" disabled={busy} onClick={() => addTerm(sel)}>Add term</button></p>
              </>)}
            </div>

            <div className="sf-sec sf-top">
              <h3>Full fees &amp; amount owing</h3>
              <p style={{ margin: '0 0 8px' }}><small>Enter each one on its own. They are saved exactly as you type them. Payments logged so far: <b>{money(selPaid)}</b></small></p>
              {sTerms.length > 0 && <p style={{ margin: '0 0 8px' }}><small>The terms above add up to <b>{money(sumTerms(sTerms))}</b>. You can type different figures here and press Save; leave <b>Amount owing</b> empty to have it worked out from the payments. Adding, editing or deleting a term works the fees out from the terms again.</small></p>}
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
              {selPays.length === 0 && <Empty icon="💳" title="No payments logged yet" hint="Use Top up / add a payment above." />}
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
