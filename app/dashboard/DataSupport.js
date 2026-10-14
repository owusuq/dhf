'use client';
import Skeleton from '../Skeleton';
import { notify } from '../../lib/toast';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const NETWORKS = ['MTN', 'Telecel', 'AirtelTigo'];

export default function DataSupport() {
  const [settings, setSettings] = useState(null);
  const [gb, setGb] = useState(null);
  const [network, setNetwork] = useState('');
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState([]);

  async function load() {
    const { data: s } = await supabase.from('data_settings').select('*').eq('id', 1).single();
    setSettings(s);
    const { data: r } = await supabase.from('data_requests').select('*').order('created_at', { ascending: false }).limit(5);
    setMine(r || []);
  }
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    if (!gb) return setMsg('Select a bundle.');
    if (!network) return setMsg('Select a network.');
    if (!/^0\d{9}$/.test(phone)) return setMsg('Enter a valid 10-digit number, e.g. 0241234567.');
    setBusy(true);
    const { error } = await supabase.from('data_requests').insert({ bundle_gb: gb, network, phone });
    setBusy(false);
    if (error) return setMsg('Could not submit. Data support may be closed.');
    if (notify('Request sent')) setMsg(''); else setMsg('Request sent ✅');
    setGb(null); setNetwork(''); setPhone('');
    load();
  }

  if (!settings) return <Skeleton />;

  return (
    <div className="ds">
      <h2>Data Support</h2>
      {settings.offer_text && <div className="offer">🎁 {settings.offer_text}</div>}

      {!settings.is_open ? (
        <p className="muted">Data support is closed right now. Check back later.</p>
      ) : (
        <form onSubmit={submit}>
          <label>Choose bundle</label>
          <div className="chips">
            {settings.bundles.map((b) => (
              <button type="button" key={b} className={gb === b ? 'on' : ''} onClick={() => setGb(b)}>{b} GB</button>
            ))}
          </div>

          <label>Network</label>
          <div className="chips">
            {NETWORKS.map((n) => (
              <button type="button" key={n} className={network === n ? 'on' : ''} onClick={() => setNetwork(n)}>{n}</button>
            ))}
          </div>

          <label>Data number</label>
          <input inputMode="numeric" maxLength={10} placeholder="0241234567" value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />

          <button className="submit" disabled={busy}>{busy ? 'Sending…' : 'Submit'}</button>
          {msg && <p className="msg">{msg}</p>}
        </form>
      )}

      {mine.length > 0 && (
        <>
          <h3>My requests</h3>
          {mine.map((r) => (
            <div key={r.id} className="row">
              <span>{r.bundle_gb}GB · {r.network} · {r.phone}</span>
              <b className={r.status}>{r.status === 'sent' ? 'Sent' : 'Pending'}</b>
            </div>
          ))}
        </>
      )}

      <style jsx>{`
        .ds { max-width: 460px; margin: 0 auto; padding: 8px 0; }
        label { display: block; margin: 16px 0 8px; font-weight: 600; }
        .chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .chips button { padding: 10px 14px; border-radius: 999px; border: 1px solid #ccc; background: #fff; color: #111; cursor: pointer; transition: all .15s; }
        .chips button.on { background: #111; color: #fff; border-color: #111; transform: scale(1.04); }
        input { width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 10px; font-size: 16px; box-sizing: border-box; }
        .submit { margin-top: 20px; width: 100%; padding: 14px; border: 0; border-radius: 10px; background: #111; color: #fff; font-size: 16px; cursor: pointer; }
        .submit:disabled { opacity: .6; }
        .offer { background: #fff7e0; border: 1px solid #f0d78c; color: #111; padding: 12px; border-radius: 10px; margin: 12px 0; }
        .muted { color: #666; } .msg { margin-top: 12px; }
        .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .sent { color: #198754; } .pending { color: #b8860b; }
      `}</style>
    </div>
  );
}
