#!/usr/bin/env node
// Adds "Send payment" (admin) and payment alerts (student). Run from the project folder:  node send-payment.js
const fs = require('fs');
const { execSync } = require('child_process');
const FILES = {
 "app/dashboard/SendPayment.js": "'use client';\nimport { useEffect, useState, useCallback } from 'react';\nimport { supabase } from '../../lib/supabase';\n\nconst money = (n) => 'GH₵ ' + Number(n || 0).toLocaleString();\nconst day = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });\n\nfunction intl(phone) {\n  let p = String(phone || '').replace(/[^\\d+]/g, '');\n  if (!p) return '';\n  if (p.startsWith('+')) return p.slice(1);\n  if (p.startsWith('00')) return p.slice(2);\n  if (p.startsWith('0')) return '233' + p.slice(1);\n  return p;\n}\n\n// Admin: pick a student, enter amount and reason, send. The student is alerted on their Home page.\nexport default function SendPayment({ adminId }) {\n  const [students, setStudents] = useState([]);\n  const [rows, setRows] = useState([]);\n  const [form, setForm] = useState({ user_id: '', amount: '', reason: '' });\n  const [busy, setBusy] = useState(false);\n  const [msg, setMsg] = useState(null);\n  const [sent, setSent] = useState(null);\n\n  const load = useCallback(async () => {\n    const s = await supabase.from('profiles').select('id, full_name, email, phone').order('full_name');\n    setStudents(s.data || []);\n    const r = await supabase.from('sent_payments').select('*').order('created_at', { ascending: false }).limit(30);\n    if (r.error) setMsg({ err: true, t: 'Run supabase/sent_payments.sql in the Supabase SQL Editor first.' });\n    setRows(r.data || []);\n  }, []);\n  useEffect(() => { load(); }, [load]);\n\n  const find = (id) => students.find((x) => x.id === id);\n  const name = (id) => { const s = find(id); return s ? (s.full_name || s.email || 'Student') : 'Student'; };\n\n  async function send(e) {\n    e.preventDefault();\n    setMsg(null); setSent(null);\n    const amount = Number(form.amount);\n    if (!form.user_id) return setMsg({ err: true, t: 'Choose a student.' });\n    if (!(amount > 0)) return setMsg({ err: true, t: 'Enter an amount above 0.' });\n    if (!form.reason.trim()) return setMsg({ err: true, t: 'Enter the reason.' });\n    setBusy(true);\n    const { error } = await supabase.from('sent_payments').insert({ user_id: form.user_id, amount, reason: form.reason.trim(), created_by: adminId });\n    setBusy(false);\n    if (error) return setMsg({ err: true, t: error.message });\n    setSent({ ...form, amount });\n    setForm({ user_id: '', amount: '', reason: '' });\n    load();\n  }\n\n  async function del(id) {\n    if (!confirm('Delete this payment record? The student will no longer see it.')) return;\n    const { error } = await supabase.from('sent_payments').delete().eq('id', id);\n    if (error) return setMsg({ err: true, t: error.message });\n    load();\n  }\n\n  const sentStudent = sent ? find(sent.user_id) : null;\n  const first = sentStudent ? (sentStudent.full_name || 'there').split(' ')[0] : '';\n  const text = sent ? `Hello ${first}, the Daakyehene Foundation has sent you ${money(sent.amount)} for: ${sent.reason}. You can also see it on your portal Home page. Daakyehene Foundation` : '';\n\n  return (\n    <>\n      <form className=\"card\" onSubmit={send}>\n        <h2>Send a payment</h2>\n        <p>Pick a student, enter the amount and reason. The student gets an alert on their Home page.</p>\n        <label htmlFor=\"sp-s\">Student</label>\n        <select id=\"sp-s\" required value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })}>\n          <option value=\"\">Choose a student…</option>\n          {students.map((s) => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}\n        </select>\n        <label htmlFor=\"sp-a\">Amount (GH₵)</label>\n        <input id=\"sp-a\" type=\"number\" min=\"0.01\" step=\"0.01\" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />\n        <label htmlFor=\"sp-r\">Reason</label>\n        <input id=\"sp-r\" required placeholder=\"e.g. Transport, books, data\" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />\n        {msg && <div className={'msg' + (msg.err ? ' err' : '')}>{msg.t}</div>}\n        <p><button className=\"btn\" disabled={busy}>{busy ? 'Sending…' : 'Send payment'}</button></p>\n      </form>\n\n      {sent && (\n        <section className=\"card\">\n          <h2>Sent ✓</h2>\n          <p>{money(sent.amount)} to <b>{name(sent.user_id)}</b> · {sent.reason}. They will see an alert when they open the portal.</p>\n          <p>Want to tell them now too?</p>\n          <p>\n            {sentStudent && sentStudent.phone && <a className=\"btn alt sm\" target=\"_blank\" rel=\"noreferrer\" href={'https://wa.me/' + intl(sentStudent.phone) + '?text=' + encodeURIComponent(text)}>WhatsApp</a>}{' '}\n            {sentStudent && sentStudent.email && <a className=\"btn alt sm\" href={'mailto:' + sentStudent.email + '?subject=' + encodeURIComponent('Payment from Daakyehene Foundation') + '&body=' + encodeURIComponent(text)}>Email</a>}\n          </p>\n        </section>\n      )}\n\n      <section className=\"card\">\n        <h2>Recent payments sent</h2>\n        {rows.length === 0 && <p>None yet.</p>}\n        {rows.map((r) => (\n          <div className=\"row\" key={r.id}>\n            <span><b>{name(r.user_id)}</b> · {money(r.amount)}<br /><small>{r.reason} · {day(r.created_at)}{r.seen ? ' · seen' : ' · not seen yet'}</small></span>\n            <button className=\"btn del sm\" onClick={() => del(r.id)}>Delete</button>\n          </div>\n        ))}\n      </section>\n    </>\n  );\n}\n",
 "app/dashboard/ReceivedPayments.js": "'use client';\nimport { useEffect, useState, useCallback } from 'react';\nimport { supabase } from '../../lib/supabase';\n\nconst money = (n) => 'GH₵ ' + Number(n || 0).toLocaleString();\nconst day = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });\n\n// Student: alert banner for new payments from the Foundation, plus a list of all of them.\nexport default function ReceivedPayments({ userId }) {\n  const [rows, setRows] = useState([]);\n  const load = useCallback(async () => {\n    if (!userId) return;\n    const r = await supabase.from('sent_payments').select('*').eq('user_id', userId).order('created_at', { ascending: false });\n    setRows(r.data || []);\n  }, [userId]);\n  useEffect(() => { load(); }, [load]);\n\n  async function dismiss() {\n    await supabase.rpc('mark_payments_seen');\n    load();\n  }\n\n  if (!rows.length) return null;\n  const fresh = rows.filter((r) => !r.seen);\n  return (\n    <>\n      {fresh.length > 0 && (\n        <section className=\"card\" style={{ border: '2px solid #c9a227', background: '#fff8e1' }}>\n          <h2>🔔 New payment{fresh.length > 1 ? 's' : ''} from the Foundation</h2>\n          {fresh.map((r) => <p key={r.id}><b>{money(r.amount)}</b> · {r.reason}<br /><small>{day(r.created_at)}</small></p>)}\n          <p><button className=\"btn sm\" onClick={dismiss}>Got it</button></p>\n        </section>\n      )}\n      <section className=\"card\">\n        <h2>Payments from the Foundation</h2>\n        {rows.map((r) => (\n          <div className=\"row\" key={r.id}>\n            <span><b>{money(r.amount)}</b> · {r.reason}<br /><small>{day(r.created_at)}</small></span>\n          </div>\n        ))}\n      </section>\n    </>\n  );\n}\n",
 "supabase/sent_payments.sql": "-- Run ONCE in Supabase: SQL Editor > New query > paste > Run (safe to run again)\n-- Payments an admin sends to a student. Students see only their own and cannot change them.\ncreate table if not exists public.sent_payments (\n  id uuid primary key default gen_random_uuid(),\n  user_id uuid not null references public.profiles(id) on delete cascade,\n  amount numeric not null check (amount > 0),\n  reason text not null,\n  seen boolean not null default false,\n  created_by uuid references public.profiles(id) on delete set null,\n  created_at timestamptz not null default now()\n);\nalter table public.sent_payments enable row level security;\n\ndrop policy if exists \"sent own read\" on public.sent_payments;\ndrop policy if exists \"sent admin all\" on public.sent_payments;\ncreate policy \"sent own read\" on public.sent_payments for select using (user_id = auth.uid());\ncreate policy \"sent admin all\" on public.sent_payments for all using (public.is_admin()) with check (public.is_admin());\n\n-- Student taps \"Got it\": marks only their own payments as seen.\ncreate or replace function public.mark_payments_seen() returns void\nlanguage sql security definer set search_path = public as\n$$ update public.sent_payments set seen = true where user_id = auth.uid() and seen = false $$;\ngrant execute on function public.mark_payments_seen() to authenticated;\n"
};
const PATCHES = {
 "app/dashboard/page.js": [
  [
   "import RequestTab from './RequestTab';",
   "import RequestTab from './RequestTab';\nimport SendPayment from './SendPayment';\nimport ReceivedPayments from './ReceivedPayments';"
  ],
  [
   "request: 'Request' })[tab]",
   "request: 'Request', sendpay: 'Send payment' })[tab]"
  ],
  [
   "['requests', 'Requests']]]] : [])",
   "['requests', 'Requests'], ['sendpay', 'Send payment']]]] : [])"
  ],
  [
   "        {tab === 'requests' && p.is_admin && <RequestsAdmin onCount={setPending} />}",
   "        {tab === 'requests' && p.is_admin && <RequestsAdmin onCount={setPending} />}\n\n        {tab === 'sendpay' && p.is_admin && <SendPayment adminId={user} />}"
  ],
  [
   "          {bd === 0 && <div className=\"party\">",
   "          <ReceivedPayments userId={user} />\n          {bd === 0 && <div className=\"party\">"
  ]
 ]
};
function fail(m) { console.error('\nSTOPPED: ' + m + '\nNothing was changed.'); process.exit(1); }
const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, c) => { fs.mkdirSync(require('path').dirname(p), { recursive: true }); fs.writeFileSync(p, c); };
if (!fs.existsSync('app/dashboard/page.js')) fail('Run this from the project folder (the one with the app folder).');

const patched = {};
for (const [file, edits] of Object.entries(PATCHES)) {
  let src = read(file);
  const crlf = src.includes('\r\n');
  if (crlf) src = src.replace(/\r\n/g, '\n');
  for (const [from, to] of edits) {
    if (src.includes(to)) continue;
    const n = src.split(from).length - 1;
    if (n !== 1) fail('Could not find the expected code in ' + file + ':\n' + from.split('\n')[0]);
    src = src.replace(from, () => to);
  }
  patched[file] = crlf ? src.replace(/\n/g, '\r\n') : src;
}
for (const [p, c] of Object.entries(FILES)) { write(p, c); console.log('created  ' + p); }
for (const [p, c] of Object.entries(patched)) { write(p, c); console.log('updated  ' + p); }
try {
  for (const p of [...Object.keys(FILES), ...Object.keys(patched)]) execSync('git add -A -- "' + p + '"', { stdio: 'ignore' });
  execSync('git commit -m "Add admin Send payment with student alert"', { stdio: 'inherit' });
  execSync('git push', { stdio: 'inherit' });
} catch (e) {
  console.log('\nGit step did not finish. Run:\n  git add . && git commit -m "Send payment" && git push');
}
console.log('\nLAST STEP: open supabase/sent_payments.sql, copy all, Supabase > SQL Editor > New query > paste > Run.');