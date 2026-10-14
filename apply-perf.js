// Run from the project root:  node apply-perf.js
const fs = require('fs');
function edit(file, fn) {
  const s = fs.readFileSync(file, 'utf8');
  const out = fn(s);
  if (out === s) console.log('skipped (already applied or not found): ' + file);
  else { fs.writeFileSync(file, out); console.log('fixed: ' + file); }
}

// 1, 4, 5: lighter CSS (no card blur, no card lift, narrower transitions)
edit('app/globals.css', (s) => {
  if (s.includes('perf: lighter glass')) return s;
  s = s.replace('button,a,input,select,textarea,tr{transition:', 'button,a,input,select,textarea{transition:');
  return s + `
/* perf: lighter glass. Blur kept only on header, footer, nav and popups */
.card,.lg-contact,.bud-stat,.tabs,.msg,.btn.alt,.lg-hero,.hero,.dn-card,.rq-card{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
.card,.lg-contact,.bud-stat{background:rgba(255,255,255,.82)}
.dn-card,.rq-card{background:rgba(255,255,255,.97)}
.tabs{background:rgba(255,255,255,.6)}
.msg{background:rgba(255,255,255,.75)}
.btn.alt{background:rgba(255,255,255,.8)}
.hero{background-color:rgba(18,56,94,.92)}
/* perf: no card lift on hover */
.card:hover{transform:none}
`;
});

// 2, 3: logo through next/image (resized + WebP served by Vercel, lazy where needed)
const imgRe = /<img src="\/logo\.jpeg" alt="" onError=\{\(e\) => \(e\.target\.style\.display = 'none'\)\} \/>/g;
function logo(file, size, priority) {
  edit(file, (s) => {
    if (s.includes("from 'next/image'") || !imgRe.test(s)) return s;
    imgRe.lastIndex = 0;
    s = s.replace(imgRe, `<Image src="/logo.jpeg" alt="" width={${size}} height={${size}}${priority ? ' priority' : ''} onError={(e) => (e.target.style.display = 'none')} />`);
    return s.replace(/^import /m, "import Image from 'next/image';\nimport ");
  });
}
['app/page.js', 'app/reset/page.js', 'app/admin/page.js', 'app/dashboard/page.js'].forEach((f) => logo(f, 92, true));
logo('app/Footer.js', 112, false);
