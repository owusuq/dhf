import { createClient } from '@supabase/supabase-js';

// Server-only helpers for the Results feature.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Who is calling, and are they an admin?
export async function whoIsCalling(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return { error: 'Not signed in', status: 401 };
  const asCaller = createClient(url, anonKey);
  const { data, error } = await asCaller.auth.getUser(token);
  if (error || !data.user) return { error: 'Invalid session', status: 401 };
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: me } = await admin.from('profiles').select('is_admin').eq('id', data.user.id).single();
  return { user: data.user, isAdmin: !!(me && me.is_admin), admin };
}

// Talks to your Google Drive folder through the small Apps Script you deployed.
export async function drive(payload) {
  const endpoint = process.env.RESULTS_SCRIPT_URL;
  const secret = process.env.RESULTS_SCRIPT_SECRET;
  if (!endpoint || !secret) throw new Error('Results storage is not set up yet (RESULTS_SCRIPT_URL / RESULTS_SCRIPT_SECRET missing).');
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...payload, secret }),
    redirect: 'follow',
    cache: 'no-store',
  });
  const text = await res.text();
  let out;
  try { out = JSON.parse(text); } catch (e) { throw new Error('Google Drive did not answer. Check the Apps Script deployment is set to "Anyone".'); }
  if (!out.ok) throw new Error(out.error || 'Google Drive error');
  return out;
}
