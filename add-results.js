#!/usr/bin/env node
// Adds the Results feature to the Daakyehene portal. Run from the project folder:  node add-results.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const FOLDER_ID = '1HjxSuGw1QYPS2ZdECy1MaJSCxMJ2pT7Z';
const FILES = {
 "supabase/results.sql": "-- Run ONCE in Supabase: SQL Editor > New query > paste > Run\n-- Results uploaded by admins. Each student can only read their own. Admins can read all.\n-- Uploading, renaming and deleting go through the server (admin check happens there).\ncreate table if not exists public.results (\n  id uuid primary key default gen_random_uuid(),\n  user_id uuid not null references public.profiles(id) on delete cascade,\n  title text not null,\n  file_name text not null,\n  mime_type text default '',\n  drive_file_id text not null,\n  created_at timestamptz default now()\n);\nalter table public.results enable row level security;\ndrop policy if exists \"results own or admin read\" on public.results;\ncreate policy \"results own or admin read\" on public.results\n  for select using (user_id = auth.uid() or public.is_admin());\n",
 "lib/results-server.js": "import { createClient } from '@supabase/supabase-js';\n\n// Server-only helpers for the Results feature.\nconst url = process.env.NEXT_PUBLIC_SUPABASE_URL;\nconst anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;\nconst serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;\n\n// Who is calling, and are they an admin?\nexport async function whoIsCalling(req) {\n  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');\n  if (!token) return { error: 'Not signed in', status: 401 };\n  const asCaller = createClient(url, anonKey);\n  const { data, error } = await asCaller.auth.getUser(token);\n  if (error || !data.user) return { error: 'Invalid session', status: 401 };\n  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });\n  const { data: me } = await admin.from('profiles').select('is_admin').eq('id', data.user.id).single();\n  return { user: data.user, isAdmin: !!(me && me.is_admin), admin };\n}\n\n// Talks to your Google Drive folder through the small Apps Script you deployed.\nexport async function drive(payload) {\n  const endpoint = process.env.RESULTS_SCRIPT_URL;\n  const secret = process.env.RESULTS_SCRIPT_SECRET;\n  if (!endpoint || !secret) throw new Error('Results storage is not set up yet (RESULTS_SCRIPT_URL / RESULTS_SCRIPT_SECRET missing).');\n  const res = await fetch(endpoint, {\n    method: 'POST',\n    headers: { 'Content-Type': 'text/plain;charset=utf-8' },\n    body: JSON.stringify({ ...payload, secret }),\n    redirect: 'follow',\n    cache: 'no-store',\n  });\n  const text = await res.text();\n  let out;\n  try { out = JSON.parse(text); } catch (e) { throw new Error('Google Drive did not answer. Check the Apps Script deployment is set to \"Anyone\".'); }\n  if (!out.ok) throw new Error(out.error || 'Google Drive error');\n  return out;\n}\n",
 "app/api/results/route.js": "import { NextResponse } from 'next/server';\nimport { whoIsCalling, drive } from '../../../lib/results-server';\n\nconst MAX_BYTES = 4 * 1024 * 1024; // hosting request limit\n\n// Admin uploads a result for one student. The file goes to the Google Drive folder.\nexport async function POST(req) {\n  try {\n    const who = await whoIsCalling(req);\n    if (who.error) return NextResponse.json({ error: who.error }, { status: who.status });\n    if (!who.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });\n\n    const form = await req.formData();\n    const file = form.get('file');\n    const userId = String(form.get('user_id') || '');\n    const title = String(form.get('title') || '').trim();\n    if (!file || typeof file === 'string' || !userId) {\n      return NextResponse.json({ error: 'Choose a student and a file' }, { status: 400 });\n    }\n    if (file.size > MAX_BYTES) {\n      return NextResponse.json({ error: 'File is over 4MB. Please send a smaller PDF or image.' }, { status: 413 });\n    }\n\n    const bytes = Buffer.from(await file.arrayBuffer());\n    const up = await drive({\n      action: 'upload',\n      name: file.name,\n      mime: file.type || 'application/octet-stream',\n      data: bytes.toString('base64'),\n    });\n\n    const { error } = await who.admin.from('results').insert({\n      user_id: userId,\n      title: title || file.name,\n      file_name: file.name,\n      mime_type: file.type || '',\n      drive_file_id: up.id,\n    });\n    if (error) {\n      try { await drive({ action: 'delete', id: up.id }); } catch (e) { /* ignore */ }\n      return NextResponse.json({ error: error.message }, { status: 500 });\n    }\n    return NextResponse.json({ ok: true });\n  } catch (e) {\n    return NextResponse.json({ error: (e && e.message) || 'Server error' }, { status: 500 });\n  }\n}\n",
 "app/api/results/[id]/route.js": "import { NextResponse } from 'next/server';\nimport { whoIsCalling, drive } from '../../../../lib/results-server';\n\n// Finds the result and checks the caller may use it (owner or admin).\nasync function open(req, params) {\n  const who = await whoIsCalling(req);\n  if (who.error) return { res: NextResponse.json({ error: who.error }, { status: who.status }) };\n  const { data: row } = await who.admin.from('results').select('*').eq('id', params.id).single();\n  if (!row || (!who.isAdmin && row.user_id !== who.user.id)) {\n    return { res: NextResponse.json({ error: 'Not found' }, { status: 404 }) };\n  }\n  return { who, row };\n}\n\n// View a result (student sees their own, admin sees any).\nexport async function GET(req, { params }) {\n  try {\n    const { res, row } = await open(req, params);\n    if (res) return res;\n    const f = await drive({ action: 'get', id: row.drive_file_id });\n    return new Response(Buffer.from(f.data, 'base64'), {\n      headers: {\n        'Content-Type': row.mime_type || f.mime || 'application/octet-stream',\n        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(row.file_name)}`,\n        'Cache-Control': 'private, no-store',\n      },\n    });\n  } catch (e) {\n    return NextResponse.json({ error: (e && e.message) || 'Server error' }, { status: 500 });\n  }\n}\n\n// Admin renames a result.\nexport async function PATCH(req, { params }) {\n  try {\n    const { res, who, row } = await open(req, params);\n    if (res) return res;\n    if (!who.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });\n    const { title } = await req.json();\n    if (!title || !String(title).trim()) return NextResponse.json({ error: 'Title is empty' }, { status: 400 });\n    const { error } = await who.admin.from('results').update({ title: String(title).trim() }).eq('id', row.id);\n    if (error) return NextResponse.json({ error: error.message }, { status: 500 });\n    return NextResponse.json({ ok: true });\n  } catch (e) {\n    return NextResponse.json({ error: (e && e.message) || 'Server error' }, { status: 500 });\n  }\n}\n\n// Admin deletes a result (file goes to the Drive trash, row is removed).\nexport async function DELETE(req, { params }) {\n  try {\n    const { res, who, row } = await open(req, params);\n    if (res) return res;\n    if (!who.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });\n    try { await drive({ action: 'delete', id: row.drive_file_id }); } catch (e) { /* file may already be gone */ }\n    const { error } = await who.admin.from('results').delete().eq('id', row.id);\n    if (error) return NextResponse.json({ error: error.message }, { status: 500 });\n    return NextResponse.json({ ok: true });\n  } catch (e) {\n    return NextResponse.json({ error: (e && e.message) || 'Server error' }, { status: 500 });\n  }\n}\n",
 "app/dashboard/Results.js": "'use client';\nimport { useEffect, useState, useCallback } from 'react';\nimport { supabase } from '../../lib/supabase';\n\nconst MAX_BYTES = 4 * 1024 * 1024;\nconst fmt = (s) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });\n\nasync function authHeader() {\n  const { data } = await supabase.auth.getSession();\n  return { Authorization: 'Bearer ' + (data.session ? data.session.access_token : '') };\n}\n\n// Students: see their own results any time. Admins: upload, view, rename and delete results for any student.\nexport default function Results({ isAdmin }) {\n  const [rows, setRows] = useState(null);\n  const [students, setStudents] = useState([]);\n  const [filter, setFilter] = useState('');\n  const [form, setForm] = useState({ user_id: '', title: '' });\n  const [file, setFile] = useState(null);\n  const [fileKey, setFileKey] = useState(0);\n  const [busy, setBusy] = useState(false);\n  const [editing, setEditing] = useState(null);\n  const [newTitle, setNewTitle] = useState('');\n  const [msg, setMsg] = useState(null);\n\n  const load = useCallback(async () => {\n    const r = await supabase.from('results').select('*').order('created_at', { ascending: false });\n    if (r.error) { setMsg({ err: true, t: r.error.message }); setRows([]); return; }\n    setRows(r.data || []);\n    if (isAdmin) {\n      const s = await supabase.from('profiles').select('id, full_name, email').order('full_name');\n      setStudents(s.data || []);\n    }\n  }, [isAdmin]);\n  useEffect(() => { load(); }, [load]);\n\n  const who = (id) => {\n    const s = students.find((x) => x.id === id);\n    return s ? (s.full_name || s.email || 'Student') : '';\n  };\n\n  async function upload(e) {\n    e.preventDefault();\n    setMsg(null);\n    if (!file) return setMsg({ err: true, t: 'Choose a file first.' });\n    if (file.size > MAX_BYTES) return setMsg({ err: true, t: 'File is over 4MB. Please use a smaller PDF or image.' });\n    setBusy(true);\n    const fd = new FormData();\n    fd.append('user_id', form.user_id);\n    fd.append('title', form.title);\n    fd.append('file', file);\n    try {\n      const res = await fetch('/api/results', { method: 'POST', headers: await authHeader(), body: fd });\n      const j = await res.json().catch(() => ({}));\n      if (!res.ok) throw new Error(j.error || 'Upload failed');\n      setMsg({ t: 'Uploaded.' });\n      setForm({ ...form, title: '' }); setFile(null); setFileKey(fileKey + 1);\n      load();\n    } catch (err) {\n      setMsg({ err: true, t: err.message });\n    }\n    setBusy(false);\n  }\n\n  async function view(r) {\n    // Open the tab first so phones do not block it, then fill it in.\n    const w = window.open('', '_blank');\n    try {\n      const res = await fetch('/api/results/' + r.id, { headers: await authHeader() });\n      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || 'Could not open this result'); }\n      const url = URL.createObjectURL(await res.blob());\n      if (w) w.location.href = url; else window.location.href = url;\n    } catch (err) {\n      if (w) w.close();\n      setMsg({ err: true, t: err.message });\n    }\n  }\n\n  async function saveTitle(r) {\n    const res = await fetch('/api/results/' + r.id, {\n      method: 'PATCH',\n      headers: { ...(await authHeader()), 'Content-Type': 'application/json' },\n      body: JSON.stringify({ title: newTitle }),\n    });\n    const j = await res.json().catch(() => ({}));\n    if (!res.ok) return setMsg({ err: true, t: j.error || 'Could not rename' });\n    setEditing(null); load();\n  }\n\n  async function del(r) {\n    if (!confirm('Delete \"' + r.title + '\"? This removes the file from Google Drive too.')) return;\n    const res = await fetch('/api/results/' + r.id, { method: 'DELETE', headers: await authHeader() });\n    const j = await res.json().catch(() => ({}));\n    if (!res.ok) return setMsg({ err: true, t: j.error || 'Could not delete' });\n    load();\n  }\n\n  if (rows === null) return <section className=\"card\">Loading\u2026</section>;\n  const shown = isAdmin && filter ? rows.filter((r) => r.user_id === filter) : rows;\n\n  return (\n    <>\n      {isAdmin && (\n        <form className=\"card\" onSubmit={upload}>\n          <h2>Upload a result</h2>\n          <p>PDF or image works best. Other file types are accepted too. Max 4MB.</p>\n          <label htmlFor=\"rs\">Student</label>\n          <select id=\"rs\" required value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })}>\n            <option value=\"\">Choose a student\u2026</option>\n            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}\n          </select>\n          <label htmlFor=\"rt\">Title</label>\n          <input id=\"rt\" placeholder=\"e.g. Term 1 Results\" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />\n          <label htmlFor=\"rf\">File</label>\n          <input id=\"rf\" key={fileKey} type=\"file\" required onChange={(e) => setFile(e.target.files[0] || null)} />\n          {msg && <div className={'msg' + (msg.err ? ' err' : '')}>{msg.t}</div>}\n          <p><button className=\"btn\" disabled={busy}>{busy ? 'Uploading\u2026' : 'Upload result'}</button></p>\n        </form>\n      )}\n\n      <section className=\"card\">\n        <h2>{isAdmin ? 'All results' : 'My results'}</h2>\n        {!isAdmin && msg && <div className={'msg' + (msg.err ? ' err' : '')}>{msg.t}</div>}\n        {isAdmin && (\n          <select aria-label=\"Filter by student\" value={filter} onChange={(e) => setFilter(e.target.value)}>\n            <option value=\"\">All students</option>\n            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}\n          </select>\n        )}\n        {shown.length === 0 && <p>{isAdmin ? 'No results uploaded yet.' : 'No results yet. They will appear here once uploaded.'}</p>}\n        {shown.map((r) => (\n          <div className=\"row\" key={r.id}>\n            {editing === r.id ? (\n              <>\n                <input aria-label=\"Title\" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />\n                <button className=\"btn sm\" onClick={() => saveTitle(r)}>Save</button>\n                <button className=\"btn alt sm\" onClick={() => setEditing(null)}>Cancel</button>\n              </>\n            ) : (\n              <>\n                <span><b>{r.title}</b><br /><small>{isAdmin && who(r.user_id) ? who(r.user_id) + ' \u00b7 ' : ''}{fmt(r.created_at)}</small></span>\n                <button className=\"btn sm\" onClick={() => view(r)}>View</button>\n                {isAdmin && <button className=\"btn alt sm\" onClick={() => { setEditing(r.id); setNewTitle(r.title); }}>Rename</button>}\n                {isAdmin && <button className=\"btn del sm\" onClick={() => del(r)}>Delete</button>}\n              </>\n            )}\n          </div>\n        ))}\n      </section>\n    </>\n  );\n}\n"
};
const PATCHES = {
 "app/dashboard/page.js": [
  [
   "import Budget from './Budget';",
   "import Budget from './Budget';\nimport Results from './Results';"
  ],
  [
   "  useEffect(() => { load(); }, [load]);",
   "  useEffect(() => { load(); }, [load]);\n  useEffect(() => {\n    try { if (localStorage.getItem('dhf-results')) { localStorage.removeItem('dhf-results'); setTab('results'); } } catch (e) { /* ignore */ }\n  }, []);"
  ],
  [
   "[['home', 'Home'], ['plan', 'Feeding plan'], ['me', 'Profile'],",
   "[['home', 'Home'], ['results', 'Results'], ['plan', 'Feeding plan'], ['me', 'Profile'],"
  ],
  [
   "        {tab === 'budget' && p.is_admin && <Budget userId={user} />}",
   "        {tab === 'budget' && p.is_admin && <Budget userId={user} />}\n\n        {tab === 'results' && <Results isAdmin={!!p.is_admin} />}"
  ]
 ],
 "app/page.js": [
  [
   "async function destination(uid) {",
   "const rememberResults = () => { try { localStorage.setItem('dhf-results', '1'); } catch (e) { /* ignore */ } };\n\nasync function destination(uid) {"
  ],
  [
   "  const [applying, setApplying] = useState(false);",
   "  const [applying, setApplying] = useState(false);\n  const [viewingResults, setViewingResults] = useState(false);"
  ],
  [
   "  function startApply() {",
   "  function startResults() {\n    rememberResults();\n    setViewingResults(true);\n    setMode('in');\n  }\n  function startApply() {"
  ],
  [
   "          {mode === 'up' && (<><label htmlFor=\"n\">Full name</label>",
   "          {viewingResults && <div className=\"msg\">Sign in to see your results.</div>}\n          {mode === 'up' && (<><label htmlFor=\"n\">Full name</label>"
  ],
  [
   "          {!applying && (\n            <p style={{ marginTop: '1rem' }}>\n              <button type=\"button\" className=\"btn alt\" onClick={startApply}>Apply to the Daakyehene Foundation</button>\n            </p>\n          )}",
   "          {!applying && !viewingResults && (\n            <p style={{ marginTop: '1rem' }}>\n              <button type=\"button\" className=\"btn alt\" onClick={startApply}>Apply to the Daakyehene Foundation</button>\n            </p>\n          )}\n          {!applying && !viewingResults && (\n            <p>\n              <button type=\"button\" className=\"btn alt\" onClick={startResults}>View my results</button>\n            </p>\n          )}"
  ]
 ]
};
const GS = "// Daakyehene Foundation - Results storage (Google Apps Script)\n// Saves, reads and deletes result files in ONE Drive folder. The portal talks to this with a secret.\nconst SECRET = '__SECRET__';\nconst FOLDER_ID = '__FOLDER_ID__';\n\nfunction doGet() { return out({ ok: true, info: 'Results storage is running' }); }\n\nfunction doPost(e) {\n  try {\n    const b = JSON.parse(e.postData.contents);\n    if (b.secret !== SECRET) return out({ ok: false, error: 'Wrong secret' });\n    if (b.action === 'upload') {\n      const blob = Utilities.newBlob(Utilities.base64Decode(b.data), b.mime || 'application/octet-stream', b.name);\n      const f = DriveApp.getFolderById(FOLDER_ID).createFile(blob);\n      return out({ ok: true, id: f.getId() });\n    }\n    if (b.action === 'get') {\n      const f = inFolder(b.id);\n      return out({ ok: true, name: f.getName(), mime: f.getMimeType(), data: Utilities.base64Encode(f.getBlob().getBytes()) });\n    }\n    if (b.action === 'delete') {\n      inFolder(b.id).setTrashed(true);\n      return out({ ok: true });\n    }\n    return out({ ok: false, error: 'Unknown action' });\n  } catch (err) {\n    return out({ ok: false, error: String(err) });\n  }\n}\n\n// Only files inside the Results folder can be read or deleted.\nfunction inFolder(id) {\n  const f = DriveApp.getFileById(id);\n  const parents = f.getParents();\n  while (parents.hasNext()) { if (parents.next().getId() === FOLDER_ID) return f; }\n  throw new Error('File is not in the Results folder');\n}\n\nfunction out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }\n";

function fail(m) { console.error('\nSTOPPED: ' + m + '\nNothing else was changed after this point.'); process.exit(1); }
const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, c) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c); };

if (!fs.existsSync('package.json') || !fs.existsSync('app/dashboard/page.js') || !fs.existsSync('app/page.js')) {
  fail('Run this from the daakyehene-portal project folder (the one with package.json and the app folder).');
}

// 1. Check every edit can be applied BEFORE touching anything.
const patched = {};
for (const [file, edits] of Object.entries(PATCHES)) {
  let src = read(file);
  const crlf = src.includes('\r\n');
  if (crlf) src = src.replace(/\r\n/g, '\n');
  for (const [from, to] of edits) {
    if (src.includes(to)) continue; // already applied
    const n = src.split(from).length - 1;
    if (n !== 1) fail('Could not find the expected code in ' + file + ' (it may have changed):\n' + from.split('\n')[0]);
    src = src.replace(from, () => to);
  }
  patched[file] = crlf ? src.replace(/\n/g, '\r\n') : src;
}

// 2. Remove files from the earlier Results attempt, if they exist.
const removed = [];
for (const p of ['lib/results-server.ts', 'app/api/results/route.ts', 'app/api/results/[id]/route.ts', 'app/results/page.tsx', 'results.sql']) {
  if (fs.existsSync(p)) { fs.unlinkSync(p); removed.push(p); }
}
try { fs.rmdirSync('app/results'); } catch (e) { /* not empty or missing */ }
try {
  if (/"googleapis"/.test(read('package.json'))) { console.log('Removing the unused googleapis package...'); execSync('npm uninstall googleapis', { stdio: 'inherit' }); }
} catch (e) { /* ignore */ }

// 3. Write new files and apply edits.
for (const [p, c] of Object.entries(FILES)) { write(p, c); console.log('created  ' + p); }
for (const [p, c] of Object.entries(patched)) { write(p, c); console.log('updated  ' + p); }

// 4. Secret + env + the Google script file (kept out of git).
let env = fs.existsSync('.env.local') ? read('.env.local') : '';
let secret = (env.match(/^RESULTS_SCRIPT_SECRET=(.+)$/m) || [])[1];
if (!secret) {
  secret = crypto.randomBytes(24).toString('hex');
  env += (env && !env.endsWith('\n') ? '\n' : '') + 'RESULTS_SCRIPT_SECRET=' + secret + '\n';
}
if (!/^RESULTS_SCRIPT_URL=/m.test(env)) env += 'RESULTS_SCRIPT_URL=\n';
write('.env.local', env);
write('results-apps-script.gs', GS.replace('__SECRET__', secret).replace('__FOLDER_ID__', FOLDER_ID));
try {
  const ex = '.git/info/exclude';
  if (fs.existsSync('.git') && !read(ex).includes('results-apps-script.gs')) fs.appendFileSync(ex, '\nresults-apps-script.gs\n');
} catch (e) { /* ignore */ }

// 5. Commit only the files this script touched.
try {
  const touched = [...Object.keys(FILES), ...Object.keys(patched), ...removed];
  for (const p of touched) execSync('git add -A -- "' + p + '"', { stdio: 'ignore' });
  execSync('git commit -m "Add Results tab: admin upload to Google Drive, students view anytime"', { stdio: 'inherit' });
  execSync('git push', { stdio: 'inherit' });
} catch (e) {
  console.log('\nGit step did not finish. Run these yourself:\n  git add . && git commit -m "Add Results tab" && git push');
}

console.log(`
=========================================================
DONE. Three things left:

1) SUPABASE: open supabase/results.sql, copy everything,
   Supabase > SQL Editor > New query > paste > Run.

2) GOOGLE DRIVE: open results-apps-script.gs in VS Code, copy all.
   Go to script.google.com > New project > paste (replace the
   old code) > Deploy > New deployment > type: Web app
   Execute as: Me   |   Who has access: Anyone
   Deploy > allow access > copy the Web app URL.

3) Paste that URL after RESULTS_SCRIPT_URL= in .env.local.
   In Vercel > Settings > Environment Variables add:
     RESULTS_SCRIPT_URL      (the URL)
     RESULTS_SCRIPT_SECRET   (the value in .env.local)
   Then redeploy. Test locally first with: npm run dev
=========================================================`);
