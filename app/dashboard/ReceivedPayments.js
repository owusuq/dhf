'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

const money = (n) => 'GH₵ ' + Number(n || 0).toLocaleString();
const day = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// Student: alert banner for new payments from the Foundation, plus a list of all of them.
export default function ReceivedPayments({ userId }) {
  const [rows, setRows] = useState([]);
  const load = useCallback(async () => {
    if (!userId) return;
    const r = await supabase.from('sent_payments').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    setRows(r.data || []);
  }, [userId]);
  useEffect(() => { load(); }, [load]);

  async function dismiss() {
    await supabase.rpc('mark_payments_seen');
    load();
  }

  if (!rows.length) return null;
  const fresh = rows.filter((r) => !r.seen);
  return (
    <>
      {fresh.length > 0 && (
        <section className="card fees-card">
          <h2>🔔 New payment{fresh.length > 1 ? 's' : ''} from the Foundation</h2>
          {fresh.map((r) => <p key={r.id}><b>{money(r.amount)}</b> · {r.reason}<br /><small>{day(r.created_at)}</small></p>)}
          <p><button className="btn sm" onClick={dismiss}>Got it</button></p>
        </section>
      )}
      <section className="card">
        <h2>Payments from the Foundation</h2>
        {rows.map((r) => (
          <div className="row" key={r.id}>
            <span><b>{money(r.amount)}</b> · {r.reason}<br /><small>{day(r.created_at)}</small></span>
          </div>
        ))}
      </section>
    </>
  );
}
