#!/usr/bin/env node
// Adds a "Clear all" button to the Send payment list. Run from the project folder:  node clear-sent.js
const fs = require('fs');
const { execSync } = require('child_process');
const PATCHES = {
 "app/dashboard/SendPayment.js": [
  [
   "  const sentStudent = sent ? find(sent.user_id) : null;",
   "  async function clearAll() {\n    if (!confirm('Delete ALL sent payment records? Students will no longer see them either. This cannot be undone.')) return;\n    const { error } = await supabase.from('sent_payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');\n    if (error) return setMsg({ err: true, t: error.message });\n    setSent(null);\n    load();\n  }\n\n  const sentStudent = sent ? find(sent.user_id) : null;"
  ],
  [
   "        <h2>Recent payments sent</h2>\n        {rows.length === 0 && <p>None yet.</p>}",
   "        <h2>Recent payments sent</h2>\n        {rows.length > 0 && <p><button className=\"btn del sm\" onClick={clearAll}>Clear all</button></p>}\n        {rows.length === 0 && <p>None yet.</p>}"
  ]
 ]
};
function fail(m) { console.error('\nSTOPPED: ' + m + '\nNothing was changed.'); process.exit(1); }
const read = (p) => fs.readFileSync(p, 'utf8');
if (!fs.existsSync('app/dashboard/SendPayment.js')) fail('Run this from the project folder, after send-payment.js was applied.');
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
for (const [p, c] of Object.entries(patched)) { fs.writeFileSync(p, c); console.log('updated  ' + p); }
try {
  for (const p of Object.keys(patched)) execSync('git add -A -- "' + p + '"', { stdio: 'ignore' });
  execSync('git commit -m "Send payment: add Clear all"', { stdio: 'inherit' });
  execSync('git push', { stdio: 'inherit' });
} catch (e) {
  console.log('\nGit step did not finish. Run:\n  git add . && git commit -m "Clear all" && git push');
}
console.log('\nDONE. Vercel will redeploy. No Supabase step needed.');