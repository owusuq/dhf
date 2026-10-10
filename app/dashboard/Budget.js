'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

// Personal daily budget in pounds (GBP). Saved in Supabase (table: budgets), with a copy on this device as backup.
const gbp = (n) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(Number(n) || 0);
const two = (n) => String(n).padStart(2, '0');
const toStr = (d) => d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate());
const todayStr = () => toStr(new Date());
const endOfMonth = () => { const d = new Date(); return toStr(new Date(d.getFullYear(), d.getMonth() + 1, 0)); };
const day = (s) => new Date(s + 'T00:00:00');
const sum = (a) => a.reduce((t, x) => t + Number(x.amount || 0), 0);
const uid = () => Math.random().toString(36).slice(2, 10);
const nice = (s) => day(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

function Items({ title, hint, items, onChange, dated }) {
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
  const [ready, setReady] = useState(false);
  const [cloud, setCloud] = useState(false); // true once we have safely read from the database
  const [status, setStatus] = useState('loading');
  const [d, setD] = useState({ money: '', end: endOfMonth(), bills: [], spends: [] });
  const timer = useRef(null);

  useEffect(() => {
    let off = false;
    (async () => {
      let local = null;
      try { const raw = localStorage.getItem(key); if (raw) local = JSON.parse(raw); } catch (e) { /* ignore */ }
      const { data, error } = await supabase.from('budgets').select('data').eq('user_id', userId).maybeSingle();
      if (off) return;
      if (error) setStatus('error');
      else { setCloud(true); setStatus('saved'); }
      const saved = !error && data && data.data && Object.keys(data.data).length ? data.data : local;
      if (saved) setD((cur) => ({ ...cur, ...saved }));
      setReady(true);
    })();
    return () => { off = true; };
  }, [key, userId]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(key, JSON.stringify(d)); } catch (e) { /* ignore */ }
    if (!cloud) return;
    setStatus('saving');
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const { error } = await supabase.from('budgets').upsert({ user_id: userId, data: d, updated_at: new Date().toISOString() });
      setStatus(error ? 'error' : 'saved');
    }, 700);
    return () => clearTimeout(timer.current);
  }, [d, ready, cloud, key, userId]);

  const t = todayStr();
  const money = Number(d.money) || 0;
  const bills = sum(d.bills);
  const before = sum(d.spends.filter((x) => x.date < t));
  const spentToday = sum(d.spends.filter((x) => x.date === t));
  const spentAll = sum(d.spends);
  const daysLeft = Math.max(1, Math.round((day(d.end || t) - day(t)) / 86400000) + 1);
  const daily = (money - bills - before) / daysLeft;
  const left = daily - spentToday;

  return (
    <>
      <section className="card">
        <h2>Daily budget</h2>
        <p className="note">
          {status === 'loading' && 'Loading…'}
          {status === 'saving' && 'Saving…'}
          {status === 'saved' && 'Saved to your account ✓'}
          {status === 'error' && 'Not saving to the cloud yet. Run supabase/budget.sql in Supabase (see instructions). Saved on this device for now.'}
        </p>
        <div className="bud-stats">
          <div className="bud-stat main"><small>Left to spend today</small><b className={left < 0 ? 'neg' : ''}>{gbp(left)}</b></div>
          <div className="bud-stat"><small>Daily budget</small><b>{gbp(daily)}</b></div>
          <div className="bud-stat"><small>Spent today</small><b>{gbp(spentToday)}</b></div>
          <div className="bud-stat"><small>Days left (incl. today)</small><b>{daysLeft}</b></div>
          <div className="bud-stat"><small>Left after bills and spending</small><b className={money - bills - spentAll < 0 ? 'neg' : ''}>{gbp(money - bills - spentAll)}</b></div>
        </div>
        <div className="grid">
          <div><label htmlFor="bm">Money for this period (£)</label><input id="bm" type="number" inputMode="decimal" step="0.01" min="0" value={d.money} onChange={(e) => setD({ ...d, money: e.target.value })} /></div>
          <div><label htmlFor="be">Period ends on</label><input id="be" type="date" value={d.end} onChange={(e) => setD({ ...d, end: e.target.value })} /></div>
        </div>
        <p className="note">Daily budget = (money − bills − spending on earlier days) ÷ days left. Unspent money carries over to tomorrow automatically.</p>
      </section>
      <Items title="Bills and fixed costs" hint="Rent, phone, transport pass: anything you must pay this period." items={d.bills} onChange={(bills) => setD({ ...d, bills })} />
      <Items title="Spending" hint="Add what you spend each day." items={d.spends} dated onChange={(spends) => setD({ ...d, spends })} />
    </>
  );
}
