const fs = require('fs');

const PAYMENT_LINK = 'PASTE-YOUR-PAYSTACK-LINK-HERE';   // CHANGE
const SHOW_ON = ['/', '/login'];                         // pages before login

const f = 'public/donate.js';
if (!fs.existsSync(f)) { console.log('public/donate.js not found. Run polish3.js first.'); process.exit(1); }
let s = fs.readFileSync(f, 'utf8');

s = s.replace(/var LINK = ".*?";/, 'var LINK = ' + JSON.stringify(PAYMENT_LINK) + ';');

if (!s.includes('SHOW_ON')) {
  s = s.replace(
    'b.onclick = open;',
    'b.onclick = open;\n' +
    '    var SHOW_ON = ' + JSON.stringify(SHOW_ON) + ';\n' +
    '    function sync() { b.style.display = SHOW_ON.indexOf(location.pathname) > -1 ? "flex" : "none"; }\n' +
    '    sync(); setInterval(sync, 400);'
  );
}

fs.writeFileSync(f, s);
console.log('Done.');