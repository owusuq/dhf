const fs = require('fs');
const os = require('os');
const path = require('path');

const MOMO = '0598124922';
const NETWORK = 'MTN';
const NAME = 'Kwadjo Owusu-Ansah Quarshie';
const REF = 'dhf';
const EMAIL = 'daakyehenefoundation@outlook.com';

// ---------- 1. globals.css ----------
const cssPaths = ['app/globals.css','src/app/globals.css','styles/globals.css','src/styles/globals.css'];
const cssFile = cssPaths.find(p => fs.existsSync(p));
if (!cssFile) { console.log('globals.css not found'); process.exit(1); }
let css = fs.readFileSync(cssFile, 'utf8');
fs.writeFileSync(path.join(os.tmpdir(), 'globals.backup.css'), css);

css = css.replace(/@import url\('https:\/\/fonts\.googleapis\.com\/css2\?family=Plus\+Jakarta[^\n]*\n/g, '');
const cuts = ['/* polish */', '/* polish2 */', '/* clean */'].map(m => css.indexOf(m)).filter(i => i >= 0);
if (cuts.length) css = css.slice(0, Math.min(...cuts));
css = css.replace(/\s+$/, '\n');

const font = "@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap');\n";

const block = `
/* clean */
:root{--navy:#0a2342;--gold:#c9a227}
html{scroll-behavior:smooth}
body,button,input,select,textarea{font-family:'Plus Jakarta Sans',system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased}
h1,h2,h3{letter-spacing:-.02em;font-weight:700}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
main>*{animation:fadeUp .4s ease both}
header,nav{background:linear-gradient(135deg,var(--navy),#13315c)!important;border-bottom:3px solid var(--gold)!important;color:#fff}
header a,nav a{color:#fff}
header a:hover,nav a:hover{color:var(--gold)}
button,a,input,select,textarea,tr{transition:background-color .2s,color .2s,border-color .2s,box-shadow .2s,filter .2s}
button:not(:disabled):hover{filter:brightness(1.08)}
button:not(:disabled):active{transform:scale(.98)}
input:focus,select:focus,textarea:focus{outline:none;box-shadow:0 0 0 3px rgba(201,162,39,.35);border-color:var(--gold)}
tbody tr:hover{background:rgba(0,0,0,.03)}
@keyframes shimmer{to{background-position:0 0}}
.skeleton,[class*=animate-pulse]{background:linear-gradient(90deg,#eceff3 25%,#f8f9fb 37%,#eceff3 63%);background-size:400% 100%;background-position:100% 0;animation:shimmer 1.4s ease infinite}

.p-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--navy);color:#fff;border-left:4px solid var(--gold);padding:12px 20px;border-radius:10px;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.25);animation:dnFade .3s ease both;transition:opacity .4s}
.p-toast.out{opacity:0}

@keyframes dnGlow{0%,100%{box-shadow:0 0 0 0 rgba(201,162,39,.55)}50%{box-shadow:0 0 0 12px rgba(201,162,39,0)}}
@keyframes dnBeat{0%,100%{transform:scale(1)}15%{transform:scale(1.25)}30%{transform:scale(1)}45%{transform:scale(1.2)}60%{transform:scale(1)}}
@keyframes dnIn{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}
@keyframes dnFade{from{opacity:0}to{opacity:1}}
.dn-btn{position:fixed;left:16px;bottom:16px;z-index:9998;display:flex;align-items:center;gap:8px;padding:12px 20px;border:none;border-radius:999px;background:linear-gradient(135deg,#c9a227,#e6c35c);color:#0a2342;font-weight:700;font-size:15px;cursor:pointer;animation:dnGlow 2.4s ease-in-out infinite}
.dn-heart{display:inline-block;animation:dnBeat 1.6s ease-in-out infinite}
.dn-ov{position:fixed;inset:0;background:rgba(10,35,66,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;animation:dnFade .25s ease both}
.dn-card{background:#fff;color:#0a2342;max-width:380px;width:100%;border-radius:18px;padding:28px 24px;text-align:center;border-top:5px solid #c9a227;box-shadow:0 20px 50px rgba(0,0,0,.35);animation:dnIn .35s ease both}
.dn-card h2{margin:0 0 8px;font-size:22px}
.dn-card p{margin:0 0 18px;opacity:.8;font-size:14px;line-height:1.5}
.dn-momo{padding:14px;border:1px dashed #c9a227;border-radius:12px;font-size:14px;line-height:1.7}
.dn-num{font-size:20px;font-weight:700;letter-spacing:.5px}
.dn-copy{margin-top:8px;padding:8px 16px;border:none;border-radius:8px;background:#c9a227;color:#0a2342;font-weight:700;cursor:pointer}
.dn-card p.dn-note{margin:14px 0 0;font-size:13px;opacity:.85}
.dn-note a{color:#0a2342;font-weight:700}
.dn-x{margin-top:14px;background:none;border:none;color:#0a2342;opacity:.6;cursor:pointer;font-size:14px}

@media(max-width:640px){button,input,select,textarea,nav a{min-height:44px}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;
fs.writeFileSync(cssFile, font + css + block);
console.log('CSS cleaned: ' + cssFile);

// ---------- 2. one small site.js ----------
fs.mkdirSync('public', { recursive: true });
const js = String.raw`
(function () {
  var C = __CFG__;
  var SHOW = ['/', '/login'];
  var d = document;

  var m = d.createElement('meta'); m.name = 'theme-color'; m.content = '#0a2342'; d.head.appendChild(m);
  var l = d.createElement('link'); l.rel = 'manifest'; l.href = '/manifest.json'; d.head.appendChild(l);

  window.toast = function (msg) {
    var t = d.createElement('div'); t.className = 'p-toast'; t.textContent = msg; d.body.appendChild(t);
    setTimeout(function () { t.classList.add('out'); }, 2200);
    setTimeout(function () { t.remove(); }, 2700);
  };

  function close() { var o = d.querySelector('.dn-ov'); if (o) o.remove(); }

  function open() {
    var o = d.createElement('div'); o.className = 'dn-ov';
    o.innerHTML = '<div class="dn-card"><h2>Support a student \u2764\uFE0F</h2>' +
      '<p>Your gift helps students at the Daakyehene Foundation stay in school. Thank you!</p>' +
      '<div class="dn-momo">Mobile Money (' + C.network + ')<br><span class="dn-num">' + C.momo + '</span><br>' + C.name +
      '<br>Payment reference: <b>' + C.ref + '</b><br><button class="dn-copy">Copy number</button></div>' +
      '<p class="dn-note">Giving from abroad, by bank transfer, or a large amount? Please email <a href="mailto:' + C.email + '">' + C.email + '</a></p>' +
      '<button class="dn-x">Close</button></div>';
    o.addEventListener('click', function (e) { if (e.target === o) close(); });
    o.querySelector('.dn-x').onclick = close;
    var c = o.querySelector('.dn-copy');
    c.onclick = function () {
      try { navigator.clipboard.writeText(C.momo); } catch (e) {}
      c.textContent = 'Copied \u2713';
    };
    d.body.appendChild(o);
  }

  d.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  function init() {
    var b = d.createElement('button');
    b.className = 'dn-btn';
    b.innerHTML = '<span class="dn-heart">\u2764\uFE0F</span> Donate';
    b.onclick = open;
    d.body.appendChild(b);
    function sync() { b.style.display = SHOW.indexOf(location.pathname) > -1 ? 'flex' : 'none'; }
    ['pushState', 'replaceState'].forEach(function (k) {
      var orig = history[k];
      history[k] = function () { var r = orig.apply(this, arguments); sync(); return r; };
    });
    addEventListener('popstate', sync);
    sync();
  }
  if (d.readyState === 'complete') init(); else addEventListener('load', init);
})();
`;
const cfg = { momo: MOMO, network: NETWORK, name: NAME, ref: REF, email: EMAIL };
fs.writeFileSync('public/site.js', js.replace('__CFG__', () => JSON.stringify(cfg)));
console.log('public/site.js written');

// ---------- 3. layout: one script tag ----------
const layoutPaths = ['app/layout.js','app/layout.jsx','app/layout.tsx','src/app/layout.js','src/app/layout.jsx','src/app/layout.tsx'];
const lf = layoutPaths.find(p => fs.existsSync(p));
if (!lf) {
  console.log('layout file not found. Tell me, I will fix it.');
} else {
  let lay = fs.readFileSync(lf, 'utf8');
  lay = lay.replace(/<script src="\/(extras|donate)\.js" defer><\/script>/g, '');
  if (!lay.includes('/site.js')) {
    if (lay.includes('</body>')) {
      lay = lay.replace('</body>', '<script src="/site.js" defer></script></body>');
    } else {
      console.log('No </body> in layout. Tell me, I will fix it.');
    }
  }
  fs.writeFileSync(lf, lay);
  console.log('layout updated: ' + lf);
}

// ---------- 4. remove old files ----------
['public/extras.js','public/donate.js','polish.js','polish2.js','polish3.js','polish4.js','polish5.js','donate-all.js','donate-momo.js']
  .forEach(f => { if (fs.existsSync(f)) { fs.unlinkSync(f); console.log('removed ' + f); } });

console.log('Done.');