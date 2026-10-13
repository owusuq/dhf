'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

// Personal daily budget in pounds (GBP).
// Saved to your account (Supabase auth profile data), so it follows you to any device. No table or SQL needed.
// A copy is also kept on this device as a backup.
const gbp = (n) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(Number(n) || 0);
const two = (n) => String(n).padStart(2, '0');
const toStr = (d) => d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate());
const todayStr = () => toStr(new Date());
const endOfMonth = () => { const d = new Date(); return toStr(new Date(d.getFullYear(), d.getMonth() + 1, 0)); };
const day = (s) => new Date(s + 'T00:00:00');
const sum = (a) => a.reduce((t, x) => t + Number(x.amount || 0), 0);
const uid = () => Math.random().toString(36).slice(2, 10);
const nice = (s) => day(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

// Keeps the saved data small: spending older than 12 days (or beyond the newest 45 entries) is folded into one total.
function compact(d) {
  const cut = new Date(); cut.setDate(cut.getDate() - 12);
  const cutStr = toStr(cut);
  const sorted = [...(d.spends || [])].sort((a, b) => (a.date < b.date ? 1 : -1));
  const keep = sorted.filter((x, i) => x.date >= cutStr && i < 45);
  const dropped = sorted.filter((x) => !keep.includes(x));
  return { ...d, spends: keep, archived: Number(d.archived || 0) + sum(dropped) };
}

function Items({ title, hint, items, onChange, dated, totalBtn }) {
  const [showSum, setShowSum] = useState(false);
  const blank = { name: '', amount: '', date: todayStr() };
  const [f, setF] = useState(blank);
  const [editing, setEditing] = useState(null);

  function save(e) {
    e.preventDefault();
    if (f.amount === '') return;
    const item = { id: editing || uid(), name: f.name.trim(), amount: Number(f.amount), date: f.date };
    onChange(editing ? items.map((x) => (x.id === editing ? item : x)) : [item, ...items]);
    setF(blank); setEditing(null);
  }
  function edit(x) { setEditing(x.id); setF({ name: x.name, amount: x.amount, date: x.date || todayStr() }); }
  function del(x) {
    if (!confirm('Delete ' + (x.name || 'this item') + '?')) return;
    onChange(items.filter((y) => y.id !== x.id));
  }
  const list = dated ? [...items].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 40) : items;

  return (
    <section className="card">
      <h2>{title}</h2>
      {hint && <p>{hint}</p>}
      <form onSubmit={save}>
        <div className="grid">
          {dated && <div><label>Date</label><input type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>}
          <div><label>What for</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Lunch" /></div>
          <div><label>Amount (£)</label><input type="number" inputMode="decimal" step="0.01" min="0" required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
        </div>
        <p>
          <button className="btn">{editing ? 'Save changes' : 'Add'}</button>{' '}
          {editing && <button type="button" className="btn alt" onClick={() => { setEditing(null); setF(blank); }}>Cancel</button>}
        </p>
      </form>
      {totalBtn && (<p style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><button type="button" onClick={() => setShowSum((v) => !v)} style={{ padding: '4px 14px', fontSize: 12, fontWeight: 700, color: '#0b1f3a', background: 'linear-gradient(135deg,#f5d76e,#d4a017)', border: 'none', borderRadius: 999, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,.2)' }}>{showSum ? 'Hide' : 'Total'}</button>{showSum && (<span style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', background: '#fff8dc', border: '1px solid #d4a017', padding: '3px 12px', borderRadius: 999 }}>{gbp(sum(items))}</span>)}</p>)}
      {list.length === 0 && <p>Nothing yet.</p>}
      {list.map((x) => (
        <div className="row" key={x.id}>
          <span>{dated ? nice(x.date) + ' · ' : ''}{x.name || 'Item'} · <b>{gbp(x.amount)}</b></span>
          <button className="btn alt sm" onClick={() => edit(x)}>Edit</button>
          <button className="btn del sm" onClick={() => del(x)}>Delete</button>
        </div>
      ))}
    </section>
  );
}

export default function Budget({ userId }) {
  const key = 'daakyehene-budget:' + userId;
  const fresh = { money: '', end: endOfMonth(), bills: [], spends: [], archived: 0, ts: 0 };
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('loading');
  const [errText, setErrText] = useState('');
  const [d, setD] = useState(fresh);
  const dRef = useRef(d);
  const dirty = useRef(false);
  const timer = useRef(null);
  const [showTotal, setShowTotal] = useState(false);
  dRef.current = d;

  const upd = (patch) => { dirty.current = true; setD((cur) => ({ ...cur, ...patch, ts: Date.now() })); };

  async function pull() {
    const { data, error } = await supabase.auth.getUser();
    if (error) { setStatus('error'); setErrText(error.message); return null; }
    return (data.user && data.user.user_metadata && data.user.user_metadata.budget) || {};
  }

  useEffect(() => {
    let off = false;
    (async () => {
      let local = null;
      try { const raw = localStorage.getItem(key); if (raw) local = JSON.parse(raw); } catch (e) { /* ignore */ }
      const cloud = await pull();
      if (off) return;
      const cTs = (cloud && cloud.ts) || 0;
      const lTs = (local && local.ts) || 0;
      // newest copy wins; old data from before cloud saving (no timestamp) is uploaded once
      const pick = local && (lTs > cTs || (!cTs && local.money !== undefined)) ? local : (cloud && cTs ? cloud : null);
      if (pick) {
        setD({ ...fresh, ...compact({ ...fresh, ...pick }) });
        if (pick === local && cloud !== null) { dirty.current = true; }
      }
      if (cloud !== null) setStatus('saved');
      setReady(true);
    })();
    return () => { off = true; };
  }, [key]);

  // when you come back to this tab/app, pick up changes made on another device
  useEffect(() => {
    async function onShow() {
      if (document.visibilityState !== 'visible' || dirty.current) return;
      const cloud = await pull();
      if (cloud && cloud.ts && cloud.ts > (dRef.current.ts || 0)) setD({ ...fresh, ...compact({ ...fresh, ...cloud }) });
    }
    document.addEventListener('visibilitychange', onShow);
    return () => document.removeEventListener('visibilitychange', onShow);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(key, JSON.stringify(d)); } catch (e) { /* ignore */ }
    if (!dirty.current) return;
    setStatus('saving');
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const { error } = await supabase.auth.updateUser({ data: { budget: compact(dRef.current) } });
      if (error) { setStatus('error'); setErrText(error.message); }
      else { dirty.current = false; setStatus('saved'); setErrText(''); }
    }, 900);
  }, [d, ready, key]);

  function newPeriod() {
    if (!confirm('Start a new period? This clears your spending and the money amount. Bills stay.')) return;
    const base = new Date(Math.max(day(d.end || todayStr()), day(todayStr())));
    upd({ money: '', spends: [], archived: 0, end: toStr(new Date(base.getFullYear(), base.getMonth() + 2, 0)) });
  }

  const t = todayStr();
  const money = Number(d.money) || 0;
  const bills = sum(d.bills);
  const before = sum(d.spends.filter((x) => x.date < t)) + Number(d.archived || 0);
  const spentToday = sum(d.spends.filter((x) => x.date === t));
  const spentAll = sum(d.spends) + Number(d.archived || 0);
  const daysLeft = Math.max(1, Math.round((day(d.end || t) - day(t)) / 86400000) + 1);
  const daily = (money - bills - before) / daysLeft;
  const left = daily - spentToday;
  const keyedTotal = bills + spentAll;

  return (
    <>
      <section className="card">
        <h2>Daily budget</h2>
        <p className="note">
          {status === 'loading' && 'Loading…'}
          {status === 'saving' && 'Saving…'}
          {status === 'saved' && 'Saved to your account ✓ (works on any device)'}
          {status === 'error' && 'Could not save to your account' + (errText ? ': ' + errText : '') + '. Saved on this device for now.'}
        </p>
        <div className="bud-stats">
          <div className="bud-stat main"><small>Left to spend today</small><b className={left < 0 ? 'neg' : ''}>{gbp(left)}</b></div>
          <div className="bud-stat"><small>Daily budget</small><b>{gbp(daily)}</b></div>
          <div className="bud-stat"><small>Spent today</small><b>{gbp(spentToday)}</b></div>
          <div className="bud-stat"><small>Days left (incl. today)</small><b>{daysLeft}</b></div>
          <div className="bud-stat"><small>Left after bills and spending</small><b className={money - bills - spentAll < 0 ? 'neg' : ''}>{gbp(money - bills - spentAll)}</b></div>
        </div>
        <div className="grid">
          <div><label htmlFor="bm">Money for this period (£)</label><input id="bm" type="number" inputMode="decimal" step="0.01" min="0" value={d.money} onChange={(e) => upd({ money: e.target.value })} /></div>
          <div><label htmlFor="be">Period ends on</label><input id="be" type="date" value={d.end} onChange={(e) => upd({ end: e.target.value })} /></div>
        </div>
        <p className="note">Daily budget = (money − bills − spending on earlier days) ÷ days left. Unspent money carries over to tomorrow automatically.</p>
        <p style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn alt sm" onClick={newPeriod}>Start new period</button>
          <button type="button" onClick={() => setShowTotal((s) => !s)} style={{ padding: '4px 14px', fontSize: 12, fontWeight: 700, color: '#0b1f3a', background: 'linear-gradient(135deg,#f5d76e,#d4a017)', border: 'none', borderRadius: 999, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,.2)' }}>{showTotal ? 'Hide' : 'Total'}</button>
          {showTotal && (<span style={{ fontSize: 13, fontWeight: 700, color: '#0b1f3a', background: '#fff8dc', border: '1px solid #d4a017', padding: '3px 12px', borderRadius: 999 }}>{gbp(keyedTotal)}</span>)}
        </p>
      </section>
      <Items title="Bills and fixed costs" hint="Rent, phone, transport pass: anything you must pay this period." items={d.bills} totalBtn onChange={(bills) => upd({ bills })} />
      <Items title="Spending" hint="Add what you spend each day." items={d.spends} dated onChange={(spends) => upd({ spends })} />
    </>
  );
}
