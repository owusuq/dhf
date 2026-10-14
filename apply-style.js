// Run from the project root (the folder with package.json):  node apply-style.js
// Applies 10 style upgrades in one go. Safe to run twice: files already done are skipped.
// To undo everything before you commit:  git checkout . && git clean -fd app lib
const fs = require('fs');
const path = require('path');

let misses = 0;
const log = (m) => console.log(m);

function readFile(f) { return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null; }
function writeNew(f, text) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); log('created: ' + f); }

// edit(file, marker, (api) => {...}): skips when the marker is already in the file.
function edit(file, marker, fn) {
  let s = readFile(file);
  if (s === null) { log('MISSING FILE: ' + file); misses++; return; }
  if (s.includes(marker)) { log('skipped (already applied): ' + file); return; }
  const crlf = s.includes('\r\n');
  if (crlf) s = s.replace(/\r\n/g, '\n');
  const bad = [];
  const api = {
    rep(from, to, all) {
      if (!s.includes(from)) { bad.push(from.slice(0, 70).replace(/\n/g, ' ')); return; }
      s = all ? s.split(from).join(to) : s.replace(from, () => to);
    },
    imports(list) {
      const rel = (target) => {
        let r = path.relative(path.dirname(file), target).split(path.sep).join('/');
        return r.startsWith('.') ? r : './' + r;
      };
      const lines = list.map((n) => ({
        Skeleton: "import Skeleton from '" + rel('app/Skeleton') + "';",
        Empty: "import Empty from '" + rel('app/Empty') + "';",
        CountUp: "import CountUp from '" + rel('app/CountUp') + "';",
        feeInfo: "import { feeInfo } from '" + rel('lib/fee') + "';",
        notify: "import { notify } from '" + rel('lib/toast') + "';",
      })[n]).join('\n') + '\n';
      if (s.startsWith("'use client';\n")) s = "'use client';\n" + lines + s.slice("'use client';\n".length);
      else s = lines + s;
    },
    get text() { return s; },
    set text(v) { s = v; },
  };
  fn(api);
  if (crlf) s = s.replace(/\n/g, '\r\n');
  fs.writeFileSync(file, s);
  if (bad.length) { misses += bad.length; log('fixed with warnings: ' + file); bad.forEach((b) => log('   could not find: ' + b)); }
  else log('fixed: ' + file);
}

// ---------- new helper files ----------
writeNew('lib/fee.js', `// Colour + label for a student's fee progress: gold when nothing is paid, green when fully paid.
export function feeInfo(total, owing, pct) {
  const st = owing <= 0 ? 'paid' : pct > 0 ? 'part' : 'owing';
  const hue = st === 'paid' ? 140 : Math.round(43 + pct * 0.9);
  return {
    cls: st,
    label: st === 'paid' ? 'Paid' : st === 'part' ? 'Part paid' : 'Owing',
    bg: 'linear-gradient(90deg,hsl(' + hue + ',72%,42%),hsl(' + (hue + 8) + ',78%,55%))',
  };
}
`);

writeNew('lib/toast.js', `// Shows a small popup (toast) from public/site.js. Returns true if it was shown.
export function notify(text) {
  if (typeof window !== 'undefined' && typeof window.toast === 'function') {
    window.toast('\\u2713 ' + text);
    return true;
  }
  return false;
}
`);

writeNew('app/Skeleton.js', `// Grey shimmer placeholder shown while a screen loads.
export default function Skeleton({ lines = 4, hero = false }) {
  return (
    <div role="status" aria-busy="true">
      {hero && <div className="skeleton sk-hero" />}
      <div className="card">
        <div className="skeleton sk-title" />
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className={'skeleton sk-line' + (i % 3 === 2 ? ' s' : '')} />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
`);

writeNew('app/Empty.js', `// Friendly "nothing here yet" message with an icon.
export default function Empty({ icon = '📭', title, hint }) {
  return (
    <div className="empty">
      <div className="empty-ic" aria-hidden="true">{icon}</div>
      <p className="empty-t">{title}</p>
      {hint && <p className="empty-h">{hint}</p>}
    </div>
  );
}
`);

writeNew('app/CountUp.js', `'use client';
import { useEffect, useRef, useState } from 'react';

const fmt = (n) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });

// Counts a number up (or to a new value) in under a second.
export default function CountUp({ value = 0, prefix = '', duration = 800 }) {
  const target = Number(value) || 0;
  const [n, setN] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || from.current === target) { from.current = target; setN(target); return undefined; }
    const a = from.current;
    let raf;
    let start;
    const step = (t) => {
      if (start === undefined) start = t;
      const k = Math.min(1, (t - start) / duration);
      const v = k >= 1 ? target : a + (target - a) * (1 - Math.pow(1 - k, 3));
      from.current = v;
      setN(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  const shown = n === target ? target : Number.isInteger(target) ? Math.round(n) : Math.round(n * 100) / 100;
  return <>{prefix}{fmt(shown)}</>;
}
`);

// ---------- 1. clean text: load the font the CSS already asks for ----------
edit('app/layout.js', 'Plus_Jakarta_Sans', (a) => {
  a.rep("import { Bricolage_Grotesque } from 'next/font/google';", "import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google';");
  const re = /const display = Bricolage_Grotesque\([^\n]*\);\n/;
  if (re.test(a.text)) a.text = a.text.replace(re, (m) => m + "const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-jakarta' });\n");
  else a.rep('@@const display line@@', '');
  a.rep('<body className={display.variable}>', "<body className={display.variable + ' ' + jakarta.variable}>");
});

// ---------- 5. toast popup: nicer, readable, above everything ----------
edit('public/site.js', 'aria-live', ({ rep }) => {
  rep("var t = d.createElement('div'); t.className = 'p-toast'; t.textContent = msg; d.body.appendChild(t);",
    "d.querySelectorAll('.p-toast').forEach(function (x) { x.remove(); });\n    var t = d.createElement('div'); t.className = 'p-toast'; t.textContent = msg; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); d.body.appendChild(t);");
  // 10. dark mode toggle shows a sun when dark is on
  rep("t.className = 'p-dark-toggle'; t.textContent = '\\u{1F319}';",
    "t.className = 'p-dark-toggle'; t.textContent = d.documentElement.classList.contains('dark') ? '\\u2600\\uFE0F' : '\\u{1F319}';");
  rep("var on = d.documentElement.classList.toggle('dark');",
    "var on = d.documentElement.classList.toggle('dark');\n      t.textContent = on ? '\\u2600\\uFE0F' : '\\u{1F319}';");
});

// ---------- dashboard ----------
edit('app/dashboard/page.js', 'lib/fee', (a) => {
  const { rep, imports } = a;
  imports(['Skeleton', 'Empty', 'CountUp', 'feeInfo', 'notify']);
  // 2. skeletons
  rep('loading: () => <p><small>Loading…</small></p>', 'loading: () => <Skeleton />', true);
  rep('if (!p) return <div className="wrap">Loading…</div>;', 'if (!p) return <div className="wrap"><Skeleton hero /></div>;');
  // 3. colour-coded fee progress
  rep("const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;\n",
    "const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;\n  const fee = (total > 0 || p.fees_owing != null) ? feeInfo(total, owing, pct) : null;\n");
  rep('<div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100"><i style={{ width: pct + \'%\' }} /></div>',
    '{fee && <div className="fee-line"><span className={\'fee-tag \' + fee.cls}>{fee.label}</span><small>{pct}% paid</small></div>}\n' +
    '            <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100"><i style={{ width: pct + \'%\', background: fee ? fee.bg : undefined }} /></div>');
  // 6. count-up numbers
  rep('<div className="stat"><small>Paid</small><b>{money(paid)}</b></div>', '<div className="stat"><small>Paid</small><b><CountUp prefix="GH₵ " value={paid} /></b></div>');
  rep('<div className="stat"><small>Balance</small><b>{money(owing)}</b></div>', '<div className="stat"><small>Balance</small><b><CountUp prefix="GH₵ " value={owing} /></b></div>');
  // fees card: class instead of inline colours (needed for real dark mode)
  rep("<section className=\"card\" style={{ border: '2px solid #c9a227', background: '#fff8e1' }}>", '<section className="card fees-card">');
  // 7. empty state
  rep('{rows.length === 0 && <p>No payments yet. Add your first one above.</p>}', '{rows.length === 0 && <Empty icon="💳" title="No payments yet" hint="Add your first one above." />}');
  // 5. toasts
  rep("setErr(''); setForm(blank); setEditing(null); reload();", "notify(editing ? 'Payment updated' : 'Payment added'); setErr(''); setForm(blank); setEditing(null); reload();");
  rep("await supabase.from('payments').delete().eq('id', id);\n    reload();", "await supabase.from('payments').delete().eq('id', id);\n    notify('Payment deleted');\n    reload();");
  rep("setErr(''); setEdit(false); reload();", "notify('Feeding plan saved'); setErr(''); setEdit(false); reload();");
  rep("setStart(''); setAmount(''); setEdit(true); reload();", "notify('Feeding plan removed'); setStart(''); setAmount(''); setEdit(true); reload();");
  rep("setMsg(error ? error.message : 'Saved.');", "setMsg(error ? error.message : (notify('Details saved') ? '' : 'Saved.'));");
  // 4. bottom tab bar (phones)
  const bar =
`      <div className="btabs" role="navigation" aria-label="Main tabs">
        {[['home', 'Home', '🏠'], ['results', 'Results', '🎓'], ['data', 'Data', '📶'], ['plan', 'Plan', '🗓️'], ['me', 'Profile', '👤']].map(([k, label, ic]) => (
          <button key={k} type="button" className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined} onClick={() => { setTab(k); setNavOpen(false); window.scrollTo({ top: 0 }); }}>
            <span aria-hidden="true">{ic}</span><small>{label}</small>
          </button>
        ))}
        <button type="button" className={!['home', 'results', 'data', 'plan', 'me'].includes(tab) || navOpen ? 'on' : ''} aria-expanded={navOpen} onClick={() => { setNavOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <span aria-hidden="true">⋯</span><small>More</small>{pending > 0 && <span className="rq-badge">{pending > 99 ? '99+' : pending}</span>}
        </button>
      </div>
`;
  const tail = '      </div>\n    </>\n  );\n}';
  const t = a.text;
  const i = t.lastIndexOf(tail);
  if (i < 0) a.rep('@@end of Dashboard component@@', '');
  else a.text = t.slice(0, i) + '      </div>\n' + bar + '    </>\n  );\n}' + t.slice(i + tail.length);
});

edit('app/dashboard/ReceivedPayments.js', 'fees-card', ({ rep }) => {
  rep("<section className=\"card\" style={{ border: '2px solid #c9a227', background: '#fff8e1' }}>", '<section className="card fees-card">');
});

// ---------- student fees (admin) ----------
edit('app/dashboard/StudentFees.js', 'lib/fee', ({ rep, imports }) => {
  imports(['Skeleton', 'Empty', 'CountUp', 'feeInfo', 'notify']);
  rep("const say = (text, err = false) => setNote({ text, err });",
    "const say = (text, err = false) => { if (!err && notify(text.replace(/\\.$/, ''))) setNote(null); else setNote({ text, err }); };");
  rep("if (!students) return <p style={{ padding: 20 }}>{note ? note.text : 'Loading…'}</p>;",
    "if (!students) return note ? <p style={{ padding: 20 }}>{note.text}</p> : <Skeleton lines={5} />;");
  rep('<div><small>Total fees</small><b>{money(allTotal)}</b></div>', '<div><small>Total fees</small><b><CountUp prefix="GH₵ " value={allTotal} /></b></div>');
  rep('<div><small>Received</small><b>{money(allPaid)}</b></div>', '<div><small>Received</small><b><CountUp prefix="GH₵ " value={allPaid} /></b></div>');
  rep("<b>{showOwing ? money(allBal) : '••••'}</b>", "<b>{showOwing ? <CountUp prefix=\"GH₵ \" value={allBal} /> : '••••'}</b>");
  rep('{list.length === 0 && <p><small>No students found.</small></p>}', '{list.length === 0 && <Empty icon="🔍" title="No students found" hint="Try a different name or clear the filter." />}');
  rep('{selPays.length === 0 && <p><small>No payments logged yet.</small></p>}', '{selPays.length === 0 && <Empty icon="💳" title="No payments logged yet" hint="Use Top up / add a payment above." />}');
  rep("          return (\n            <button type=\"button\" className=\"sf-row\"",
    "          const fee = (total > 0 || s.fees_owing != null) ? feeInfo(total, owingOf(s), pct) : null;\n          return (\n            <button type=\"button\" className=\"sf-row\"");
  rep('<b>{s.full_name || s.email}</b>', "<b>{s.full_name || s.email}</b>{fee && <span className={'fee-tag sm ' + fee.cls}>{fee.label}</span>}");
  rep('<div className="sf-mini"><i style={{ width: pct + \'%\' }} /></div>', '<div className="sf-mini"><i style={{ width: pct + \'%\', background: fee ? fee.bg : undefined }} /></div>');
  rep('<div className="bar" role="progressbar" aria-valuenow={selPct} aria-valuemin="0" aria-valuemax="100"><i style={{ width: selPct + \'%\' }} /></div>',
    '{(selTotal > 0 || (sel && sel.fees_owing != null)) && <p className="fee-line" style={{ color: \'inherit\' }}><span className={\'fee-tag \' + feeInfo(selTotal, selBal, selPct).cls}>{feeInfo(selTotal, selBal, selPct).label}</span><small>{selPct}% paid</small></p>}\n' +
    '            <div className="bar" role="progressbar" aria-valuenow={selPct} aria-valuemin="0" aria-valuemax="100"><i style={{ width: selPct + \'%\', background: (selTotal > 0 || (sel && sel.fees_owing != null)) ? feeInfo(selTotal, selBal, selPct).bg : undefined }} /></div>');
});

// ---------- other screens: skeletons, empty states, toasts ----------
edit('app/dashboard/DataSupport.js', "/Skeleton'", ({ rep, imports }) => {
  imports(['Skeleton', 'notify']);
  rep("if (!settings) return <p style={{ padding: 20 }}>Loading…</p>;", 'if (!settings) return <Skeleton />;');
  rep("setMsg('Request sent ✅');", "if (notify('Request sent')) setMsg(''); else setMsg('Request sent ✅');");
});
edit('app/dashboard/DataSupportAdmin.js', "/Skeleton'", ({ rep, imports }) => {
  imports(['Skeleton', 'Empty']);
  rep("if (!s) return <p style={{ padding: 20 }}>Loading…</p>;", 'if (!s) return <Skeleton />;');
  rep('{reqs.length === 0 && <p>No requests yet.</p>}', '{reqs.length === 0 && <Empty icon="📶" title="No requests yet" />}');
});
edit('app/dashboard/Results.js', "/Skeleton'", ({ rep, imports }) => {
  imports(['Skeleton', 'Empty']);
  rep('if (rows === null) return <section className="card">Loading…</section>;', 'if (rows === null) return <Skeleton />;');
  rep("{shown.length === 0 && <p>{isAdmin ? 'No results uploaded yet.' : 'No results yet. They will appear here once uploaded.'}</p>}",
    "{shown.length === 0 && <Empty icon=\"🎓\" title={isAdmin ? 'No results uploaded yet' : 'No results yet'} hint={isAdmin ? 'Upload the first one above.' : 'They will appear here once uploaded.'} />}");
});
edit('app/dashboard/RequestsAdmin.js', "/Skeleton'", ({ rep, imports }) => {
  imports(['Skeleton', 'Empty']);
  rep('<p>Loading…</p>', '<Skeleton lines={3} />', true);
  rep('<p><small>No requests here.</small></p>', '<Empty icon="✉️" title="No requests here" />');
});
edit('app/dashboard/Budget.js', "/Empty'", ({ rep, imports }) => {
  imports(['Empty']);
  rep('{list.length === 0 && <p>Nothing yet.</p>}', '{list.length === 0 && <Empty icon="🧾" title="Nothing here yet" />}');
});
edit('app/dashboard/SendPayment.js', "/Empty'", ({ rep, imports }) => {
  imports(['Empty']);
  rep('{rows.length === 0 && <p>None yet.</p>}', '{rows.length === 0 && <Empty icon="💸" title="No payments sent yet" />}');
});
edit('app/admin/page.js', "/Skeleton'", ({ rep, imports }) => {
  imports(['Skeleton', 'Empty']);
  rep('if (!rows) return <div className="wrap">Loading…</div>;', 'if (!rows) return <div className="wrap"><Skeleton lines={5} /></div>;');
  rep('<p><small>No payments logged.</small></p>', '<Empty icon="💳" title="No payments logged" />');
  rep('<p><small>No one found.</small></p>', '<Empty icon="🔍" title="No one found" hint="Try a different search." />');
  rep('<p>Nobody needs a reminder right now.</p>', '<Empty icon="🎉" title="All clear" hint="Nobody needs a reminder right now." />');
});
edit('app/admin/delete/page.js', "/Skeleton'", ({ rep, imports }) => {
  imports(['Skeleton', 'Empty']);
  rep('<p>Loading…</p>', '<Skeleton lines={3} />', true);
  rep('<p><small>No students found.</small></p>', '<Empty icon="🔍" title="No students found" />');
});
edit('app/admin/applications/page.js', "/Skeleton'", ({ rep, imports }) => {
  imports(['Skeleton', 'Empty']);
  rep('<p>Loading…</p>', '<Skeleton lines={3} />', true);
  rep('<p><small>No applications here.</small></p>', '<Empty icon="📝" title="No applications here" />');
});
edit('app/apply/page.js', "/Skeleton'", ({ rep, imports }) => {
  imports(['Skeleton']);
  rep('<p>Loading…</p>', '<Skeleton lines={3} />', true);
});

// ---------- CSS: fonts, dark mode, tab bar, tap targets, skeletons, tags ----------
const CSS_MARK = '/* style-pack v1 */';
const cssFile = 'app/globals.css';
let css = readFile(cssFile);
if (css === null) { log('MISSING FILE: ' + cssFile); misses++; }
else if (css.includes(CSS_MARK)) log('skipped (already applied): ' + cssFile);
else {
  const nl = css.includes('\r\n') ? '\r\n' : '\n';
  // remove the old "invert the whole page" dark mode
  const kept = css.split(/\r?\n/).filter((l) => !(l.startsWith('html.dark') && l.includes('invert')));
  const removed = css.split(/\r?\n/).length - kept.length;
  const block = `
${CSS_MARK}
/* 1. clean text */
body,button,input,select,textarea{font-family:var(--font-jakarta,system-ui),system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
.sr-only{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

/* 2. skeletons */
.sk-line{height:14px;border-radius:8px;margin:.7rem 0}
.sk-line.s{width:60%}
.sk-title{height:22px;width:45%;border-radius:8px;margin:.2rem 0 1rem}
.sk-hero{height:150px;border-radius:16px;margin:.2rem 0 1rem}

/* 3. fee progress colours + label */
.fee-line{display:flex;align-items:center;gap:.6rem;margin:.5rem 0 -.2rem}
.fee-tag{display:inline-block;padding:.15rem .65rem;border-radius:99px;font-size:.78rem;font-weight:700;letter-spacing:.02em;background:#ffffff2e;color:#fff;border:1px solid #ffffff55}
.fee-tag.paid{background:#1f9d57;border-color:#1f9d57;color:#fff}
.fee-tag.part{background:#c9a227;border-color:#c9a227;color:#0a2342}
.fee-tag.owing{background:#b3342b;border-color:#b3342b;color:#fff}
.fee-tag.sm{font-size:.7rem;padding:.05rem .5rem;margin-left:.4rem;vertical-align:middle}
.hero .fee-line small{color:#ffffffcc}
.sf-modal .bar{background:#e6ebf1}
.bar i,.sf-mini i{transition:background .4s}

/* 5. toast popup */
.p-toast{z-index:30000;display:flex;align-items:center;gap:.5rem;max-width:min(92vw,420px);bottom:calc(24px + env(safe-area-inset-bottom));font-weight:600;animation:toastIn .3s var(--ease) both}
@keyframes toastIn{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}

/* 7. empty states */
.empty{text-align:center;padding:1.4rem 1rem}
.empty-ic{font-size:2.2rem;line-height:1;margin-bottom:.4rem}
.empty-t{margin:0;font-weight:700}
.empty-h{margin:.2rem 0 0;font-size:.9rem;color:#5b6b7c}

/* fees card (was inline style) */
.card.fees-card{background-color:#fff8e1;border:2px solid #c9a227}

/* 8. gold underline on the active tab */
.tabs button,.gnav-r button{position:relative}
.tabs button.on::after,.gnav-r button.on::after{content:"";position:absolute;left:24%;right:24%;bottom:3px;height:3px;border-radius:3px;background:var(--gold)}

/* 4. bottom tab bar (phones only) */
.btabs{display:none}
@media (max-width:700px){
  .btabs{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:9000;padding:.35rem max(.4rem,env(safe-area-inset-right)) calc(.35rem + env(safe-area-inset-bottom)) max(.4rem,env(safe-area-inset-left));background:rgba(10,35,66,.94);-webkit-backdrop-filter:blur(20px) saturate(170%);backdrop-filter:blur(20px) saturate(170%);border-top:2px solid var(--gold);box-shadow:0 -6px 24px rgba(10,35,66,.25)}
  .btabs button{flex:1;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;min-height:52px;padding:.25rem 0;border:0;border-radius:12px;background:none;color:#fff;opacity:.68;font:inherit;cursor:pointer;transition:opacity .2s,background .2s}
  .btabs button span{font-size:1.25rem;line-height:1}
  .btabs button small{font-size:.68rem;font-weight:600}
  .btabs button.on{opacity:1;background:rgba(255,255,255,.1)}
  .btabs button.on::after{content:"";position:absolute;left:30%;right:30%;bottom:2px;height:3px;border-radius:3px;background:var(--gold)}
  .btabs .rq-badge{position:absolute;top:-1px;left:calc(50% + 9px);margin:0;min-width:18px;height:18px;line-height:18px;font-size:11px;box-shadow:0 0 0 2px #0a2342}
  body:has(.btabs) .foot{padding-bottom:calc(7rem + env(safe-area-inset-bottom))}
  body:has(.btabs) .dn-btn,body:has(.btabs) .p-dark-toggle{bottom:calc(72px + env(safe-area-inset-bottom))}
  body:has(.btabs) .rq-fab{bottom:calc(124px + env(safe-area-inset-bottom))}
  body:has(.btabs) .p-toast{bottom:calc(88px + env(safe-area-inset-bottom))}
}

/* 9. bigger tap targets */
@media (max-width:700px),(pointer:coarse){
  .btn,.btn.sm,.top a,.top button,.tabs button,.choice button,.gnav-r button,.gnav-bar button,.sf-x,.dn-btn,.rq-fab,.p-dark-toggle,.dn-copy,.dn-x,.ins-btns .btn,.ck-btns .btn{min-height:44px}
  .btn.sm,.top a,.top button{display:inline-flex;align-items:center;justify-content:center}
  .sf-x,.p-dark-toggle{width:44px;height:44px}
  .gnav-bar button{min-width:48px}
}

/* 10. real dark mode (replaces the old colour-flip trick) */
html.dark{color-scheme:dark;--ink:#e6edf5;--bg:#0a1626;--card:#13233a;--line:#2a3f5c;--red:#ff8f85;background:#0a1626}
html.dark body{background:radial-gradient(48rem 34rem at 8% -8%,rgba(201,162,39,.16),transparent 62%),radial-gradient(44rem 36rem at 100% 4%,rgba(48,120,214,.2),transparent 58%),#0a1626;background-attachment:fixed;color:var(--ink)}
html.dark .card:not(.hero),html.dark .lg-contact,html.dark .bud-stat,html.dark .dn-card,html.dark .rq-card,html.dark .ins,html.dark .ck{background-color:rgba(19,35,58,.94);border-color:rgba(255,255,255,.1);color:var(--ink);box-shadow:0 10px 34px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.06)}
html.dark .card.fees-card{background-color:rgba(201,162,39,.16);border-color:#c9a227}
html.dark .ck p,html.dark .dn-x,html.dark .dn-note a,html.dark .ins-steps,html.dark .dn-gfm{color:var(--ink)}
html.dark .bud-stat small,html.dark .lg-sub,html.dark .lg-contact p,html.dark .empty-h,html.dark .ins-row small,html.dark .sf-sum small,html.dark .sf-row .bal small,html.dark small[style*="107, 119, 133"]{color:#9fb2c7!important}
html.dark .bud-stat.main{background-color:#1b4177}
html.dark .dn-stats{background:rgba(255,255,255,.07)}
html.dark input,html.dark select,html.dark textarea{background-color:rgba(8,18,32,.7);border-color:rgba(255,255,255,.16);color:var(--ink);box-shadow:none}
html.dark input::placeholder,html.dark textarea::placeholder{color:#7d90a8}
html.dark .btn:not(.alt):not(.del):not(.admin-go):not(.lg-mail){background-image:linear-gradient(180deg,#2d64a6,#1b4177);border-color:rgba(255,255,255,.18)}
html.dark .btn.alt{background:rgba(255,255,255,.08);color:#d6e6fa;border-color:rgba(255,255,255,.2)}
html.dark .btn.alt:hover{background:rgba(255,255,255,.16)}
html.dark .btn.del{background:transparent;color:#ff8f85;border-color:#ff8f85}
html.dark .btn.del:hover{background:rgba(255,143,133,.14)}
html.dark .party{color:#0a2342}
html.dark .tabs{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.1)}
html.dark .tabs button{color:#cfe0f5}
html.dark .tabs button:hover{background:rgba(255,255,255,.08)}
html.dark .tabs button.on{background:rgba(255,255,255,.16);color:#fff}
html.dark .choice button{background:rgba(255,255,255,.06);border-color:var(--line);color:var(--ink)}
html.dark .choice button.on{background:#2d64a6;border-color:#2d64a6;color:#fff}
html.dark .row:hover,html.dark tbody tr:hover,html.dark tr:hover td{background:rgba(255,255,255,.05)}
html.dark .msg{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.12)}
html.dark .msg.err{background:rgba(179,52,43,.28);color:#ffb7b0}
html.dark .note{background:rgba(201,151,31,.16);color:var(--ink)}
html.dark .pw-eye{background:rgba(255,255,255,.12);color:#cfe0f5}
html.dark .pw-eye:active{background:rgba(255,255,255,.2)}
html.dark .lg-link,html.dark .plan-big{color:#8fc0f2}
html.dark .gnav-bar button{background:#13233a;border-color:rgba(255,255,255,.18);color:#fff}
html.dark .sf-sum div{background:rgba(255,255,255,.06)}
html.dark .sf-row:hover{background:rgba(255,255,255,.06)}
html.dark .sf-mini,html.dark .sf-modal .bar{background:rgba(255,255,255,.12)}
html.dark .sf-modal,html.dark .sf-head,html.dark .sf-x{background:#13233a;color:var(--ink)}
html.dark .sf-top{background:rgba(201,162,39,.12);border-color:rgba(201,162,39,.4)}
html.dark .sf-ok{background:rgba(31,157,87,.2);color:#8be0b0}
html.dark .skeleton,html.dark [class*=animate-pulse]{background:linear-gradient(90deg,#1b2d45 25%,#26405f 37%,#1b2d45 63%);background-size:400% 100%;background-position:100% 0}
`.replace(/\n/g, nl);
  fs.writeFileSync(cssFile, kept.join(nl).replace(/\s*$/, nl) + block);
  log('fixed: ' + cssFile + ' (removed ' + removed + ' old dark-mode line' + (removed === 1 ? '' : 's') + ')');
}

log('');
if (misses) log('DONE with ' + misses + ' warning(s). Send me the "could not find" lines above and I will fix them.');
else log('DONE. Now run:  npm run dev   (check it in the browser), then git add . && git commit -m "Style upgrade" && git push');