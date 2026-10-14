// Run from the project root:  node apply-perf2.js
const fs = require('fs');
function edit(file, fn) {
  const s = fs.readFileSync(file, 'utf8');
  const out = fn(s);
  if (out === s) console.log('skipped (already applied or not found): ' + file);
  else { fs.writeFileSync(file, out); console.log('fixed: ' + file); }
}

// 6. Fetch fewer columns: Data Support admin only needs names, not every profile column
edit('app/dashboard/DataSupportAdmin.js', (s) =>
  s.replace("supabase.from('profiles').select('*')", "supabase.from('profiles').select('id, full_name, email')"));

// 7 + 8. Layout: drop the unused body font, load only the weights used, load site.js late (dark mode applied early)
edit('app/layout.js', (s) => {
  if (s.includes('next/script')) return s;
  s = s.replace("import { Bricolage_Grotesque, Source_Sans_3 } from 'next/font/google';",
    "import { Bricolage_Grotesque } from 'next/font/google';\nimport Script from 'next/script';");
  s = s.replace("const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--display' });",
    "const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['600', '700', '800'], display: 'swap', variable: '--display' });");
  s = s.replace(/const body = Source_Sans_3\(\{[^}]*\}\);\n/, '');
  s = s.replace('<html lang="en">',
    `<html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('dark')==='1')document.documentElement.classList.add('dark')}catch(e){}" }} />
      </head>`);
  s = s.replace('className={`${display.variable} ${body.variable}`}', 'className={display.variable}');
  s = s.replace('<script src="/site.js" defer></script>', '<Script src="/site.js" strategy="lazyOnload" />');
  return s;
});

// 9. Dashboard: load each tab's code only when opened
edit('app/dashboard/page.js', (s) => {
  if (s.includes("from 'next/dynamic'")) return s;
  const tabs = ['Budget', 'Results', 'DataSupport', 'DataSupportAdmin', 'RequestsAdmin', 'RequestTab', 'SendPayment', 'StudentFees'];
  tabs.forEach((n) => {
    s = s.replace(`import ${n} from './${n}';\n`, `const ${n} = dynamic(() => import('./${n}'), { ssr: false, loading: () => <p><small>Loading…</small></p> });\n`);
  });
  return s.replace("import Link from 'next/link';\n", "import Link from 'next/link';\nimport dynamic from 'next/dynamic';\n");
});

// 10. Long lists: show 30 at a time with a "Show more" button
const more = (n, total) => `{${total} > ${n} && <p><button type="button" className="btn alt sm" onClick={() => setLim(${n} + 30)}>Show more ({${total} - ${n}} left)</button></p>}`;

edit('app/admin/page.js', (s) => {
  if (s.includes('setLim')) return s;
  s = s.replace("  const [q, setQ] = useState('');\n", "  const [q, setQ] = useState('');\n  const [lim, setLim] = useState(30);\n");
  s = s.replace('{shown.map((s) => (', '{shown.slice(0, lim).map((s) => (');
  // add the button right after the list: find the closing of the map block that follows the first shown.slice
  const i = s.indexOf('{shown.slice(0, lim).map(');
  const end = s.indexOf('\n          ))}', i);
  if (i < 0 || end < 0) return fs.readFileSync('app/admin/page.js', 'utf8');
  const at = end + '\n          ))}'.length;
  return s.slice(0, at) + '\n          ' + more('lim', 'shown.length') + s.slice(at);
});

edit('app/dashboard/StudentFees.js', (s) => {
  if (s.includes('setLim')) return s;
  s = s.replace("  const [q, setQ] = useState('');\n", "  const [q, setQ] = useState('');\n  const [lim, setLim] = useState(30);\n");
  s = s.replace('{list.map((s) => {\n          const paid = paidBy(s.id);', '{list.slice(0, lim).map((s) => {\n          const paid = paidBy(s.id);');
  const marker = '        })}\n      </div>\n\n      {sel && typeof document';
  if (!s.includes(marker)) return fs.readFileSync('app/dashboard/StudentFees.js', 'utf8');
  return s.replace(marker, '        })}\n      </div>\n      ' + more('lim', 'list.length') + '\n\n      {sel && typeof document');
});

edit('app/dashboard/RequestsAdmin.js', (s) => {
  if (s.includes('setLim')) return s;
  s = s.replace("  const [filter, setFilter] = useState('pending');\n", "  const [filter, setFilter] = useState('pending');\n  const [lim, setLim] = useState(30);\n");
  s = s.replace('{list.map((r) => (\n        <Card', '{list.slice(0, lim).map((r) => (\n        <Card');
  return s.replace('      ))}\n    </>\n  );\n}', '      ))}\n      ' + more('lim', 'list.length') + '\n    </>\n  );\n}');
});

edit('app/dashboard/DataSupportAdmin.js', (s) => {
  if (s.includes('setLim')) return s;
  s = s.replace("  const [reqs, setReqs] = useState([]);\n", "  const [reqs, setReqs] = useState([]);\n  const [lim, setLim] = useState(30);\n");
  s = s.replace('{reqs.map((r) => (', '{reqs.slice(0, lim).map((r) => (');
  const i = s.indexOf('{reqs.slice(0, lim).map(');
  const m = s.indexOf('\n      ))}', i);
  if (i < 0 || m < 0) return fs.readFileSync('app/dashboard/DataSupportAdmin.js', 'utf8');
  const at = m + '\n      ))}'.length;
  return s.slice(0, at) + '\n      ' + more('lim', 'reqs.length') + s.slice(at);
});
