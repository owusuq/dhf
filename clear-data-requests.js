// Run from the project folder:  node clear-data-requests.js
// Adds "Delete" on each request and "Clear all sent" in the admin Data Support panel.
// Also creates supabase/data_requests_delete.sql (run it once in Supabase SQL Editor).
const fs = require('fs');
const f = 'app/dashboard/DataSupportAdmin.js';
let s = fs.readFileSync(f, 'utf8');

if (s.includes('clearSent')) { console.log('Already patched.'); process.exit(0); }

const a1 = `  if (!s) return <p style={{ padding: 20 }}>Loading…</p>;`;
const fn = `  async function removeReq(id) {
    if (!window.confirm('Delete this request?')) return;
    const { data, error } = await supabase.from('data_requests').delete().eq('id', id).select('id');
    if (error || !data || !data.length) return alert('Nothing was deleted. Run supabase/data_requests_delete.sql in Supabase first.');
    load();
  }
  async function clearSent() {
    const n = reqs.filter((x) => x.status !== 'pending').length;
    if (!n || !window.confirm('Delete all ' + n + ' sent requests permanently?')) return;
    const { data, error } = await supabase.from('data_requests').delete().neq('status', 'pending').select('id');
    if (error || !data || !data.length) return alert('Nothing was deleted. Run supabase/data_requests_delete.sql in Supabase first.');
    load();
  }

`;
if (!s.includes(a1)) { console.error('Could not find insert point 1'); process.exit(1); }
s = s.replace(a1, fn + a1);

const a2 = `<h3 style={{ marginTop: 28 }}>Requests</h3>`;
const h = `<h3 style={{ marginTop: 28 }}>Requests</h3>
      {reqs.some((x) => x.status !== 'pending') && (
        <p><button onClick={clearSent}>Clear all sent</button></p>
      )}`;
if (!s.includes(a2)) { console.error('Could not find insert point 2'); process.exit(1); }
s = s.replace(a2, h);

const a3 = `: <span style={{ color: '#198754' }}>Sent</span>}`;
const d = `: <span style={{ color: '#198754' }}>Sent</span>}
            <button onClick={() => removeReq(r.id)}>Delete</button>`;
if (!s.includes(a3)) { console.error('Could not find insert point 3'); process.exit(1); }
s = s.replace(a3, d);
fs.writeFileSync(f, s);

fs.writeFileSync('supabase/data_requests_delete.sql',
`-- Lets admins delete data support requests.
drop policy if exists "data_requests admin delete" on public.data_requests;
create policy "data_requests admin delete" on public.data_requests
  for delete using (public.is_admin());
`);
console.log('Done. Now run the SQL in Supabase, then: git add . && git commit -m "Delete data support requests" && git push');
