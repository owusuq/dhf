const fs = require('fs');

// CHANGE these 3 lines
const PAYMENT_LINK = 'https://paystack.com/pay/YOUR-PAGE';
const MOMO_NUMBER = '';   // e.g. '024 000 0000' or leave empty
const MOMO_NAME = '';     // name on the Mobile Money account

fs.mkdirSync('public', { recursive: true });

const js = `
(function () {
  var LINK = ${JSON.stringify(PAYMENT_LINK)};
  var MOMO = ${JSON.stringify(MOMO_NUMBER)};
  var MOMO_NAME = ${JSON.stringify(MOMO_NAME)};
  var d = document;

  var css = [
    '.dn-btn{position:fixed;left:16px;bottom:16px;z-index:9998;display:flex;align-items:center;gap:8px;',
    'padding:12px 20px;border:none;border-radius:999px;background:linear-gradient(135deg,#c9a227,#e6c35c);',
    'color:#0a2342;font-weight:700;font-size:15px;cursor:pointer;animation:dnGlow 2.4s ease-in-out infinite;}',
    '.dn-heart{display:inline-block;animation:dnBeat 1.6s ease-in-out infinite;}',
    '@keyframes dnGlow{0%,100%{box-shadow:0 0 0 0 rgba(201,162,39,.55)}50%{box-shadow:0 0 0 12px rgba(201,162,39,0)}}',
    '@keyframes dnBeat{0%,100%{transform:scale(1)}15%{transform:scale(1.25)}30%{transform:scale(1)}45%{transform:scale(1.2)}60%{transform:scale(1)}}',
    '@keyframes dnIn{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}',
    '.dn-ov{position:fixed;inset:0;background:rgba(10,35,66,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;animation:pFade .25s ease both}',
    '.dn-card{background:#fff;color:#0a2342;max-width:380px;width:100%;border-radius:18px;padding:28px 24px;text-align:center;border-top:5px solid #c9a227;box-shadow:0 20px 50px rgba(0,0,0,.35);animation:dnIn .35s ease both}',
    '.dn-card h2{margin:0 0 8px;font-size:22px}',
    '.dn-card p{margin:0 0 18px;opacity:.8;font-size:14px;line-height:1.5}',
    '.dn-go{display:block;width:100%;padding:14px;border:none;border-radius:12px;background:#0a2342;color:#fff;font-weight:700;font-size:16px;cursor:pointer;text-decoration:none;box-sizing:border-box}',
    '.dn-momo{margin-top:16px;padding:12px;border:1px dashed #c9a227;border-radius:12px;font-size:14px}',
    '.dn-copy{margin-top:8px;padding:8px 14px;border:none;border-radius:8px;background:#c9a227;color:#0a2342;font-weight:700;cursor:pointer}',
    '.dn-x{margin-top:14px;background:none;border:none;color:#0a2342;opacity:.6;cursor:pointer;font-size:14px}',
    '@media (prefers-reduced-motion:reduce){.dn-btn,.dn-heart{animation:none!important}}'
  ].join('');
  var st = d.createElement('style'); st.textContent = css; d.head.appendChild(st);

  function close() { var o = d.querySelector('.dn-ov'); if (o) o.remove(); }

  function open() {
    var o = d.createElement('div'); o.className = 'dn-ov';
    var html = '<div class="dn-card"><h2>Support a student ❤️</h2>' +
      '<p>Your gift helps students at the Daakyehene Foundation stay in school. Thank you!</p>' +
      '<a class="dn-go" href="' + LINK + '" target="_blank" rel="noopener">Donate now</a>';
    if (MOMO) {
      html += '<div class="dn-momo">Mobile Money<br><b>' + MOMO + '</b>' +
        (MOMO_NAME ? '<br>' + MOMO_NAME : '') +
        '<br><button class="dn-copy">Copy number</button></div>';
    }
    html += '<button class="dn-x">Close</button></div>';
    o.innerHTML = html;
    o.addEventListener('click', function (e) { if (e.target === o) close(); });
    o.querySelector('.dn-x').onclick = close;
    var c = o.querySelector('.dn-copy');
    if (c) c.onclick = function () {
      try { navigator.clipboard.writeText(MOMO.replace(/\\s/g, '')); } catch (e) {}
      c.textContent = 'Copied ✓';
      if (window.toast) window.toast('Number copied. Thank you!');
    };
    d.body.appendChild(o);
  }

  d.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  function init() {
    var b = d.createElement('button');
    b.className = 'dn-btn';
    b.innerHTML = '<span class="dn-heart">❤️</span> Donate';
    b.onclick = open;
    d.body.appendChild(b);
  }
  if (d.readyState === 'complete') init(); else window.addEventListener('load', init);
})();
`;
fs.writeFileSync('public/donate.js', js);
console.log('public/donate.js written');

const layoutPaths = ['app/layout.js','app/layout.jsx','app/layout.tsx','src/app/layout.js','src/app/layout.jsx','src/app/layout.tsx'];
const lf = layoutPaths.find(p => fs.existsSync(p));
if (!lf) {
  console.log('layout file not found. Tell me, I will fix it.');
} else {
  let lay = fs.readFileSync(lf, 'utf8');
  if (lay.includes('/donate.js')) {
    console.log('layout already hooked');
  } else if (lay.includes('</body>')) {
    lay = lay.replace('</body>', '<script src="/donate.js" defer></script></body>');
    fs.writeFileSync(lf, lay);
    console.log('layout hooked: ' + lf);
  } else {
    console.log('No </body> in layout. Tell me, I will fix it.');
  }
}
console.log('Done.');