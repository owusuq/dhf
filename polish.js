const fs = require('fs');
const paths = ['app/globals.css','src/app/globals.css','styles/globals.css','src/styles/globals.css'];
const f = paths.find(p => fs.existsSync(p));
if (!f) { console.log('globals.css not found'); process.exit(1); }
let css = fs.readFileSync(f, 'utf8');
if (css.includes('/* polish */')) { console.log('Already added'); process.exit(0); }

const font = "@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');\n";

const block = `
/* polish */
html { scroll-behavior: smooth; }
body, button, input, select, textarea {
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3 { letter-spacing: -0.02em; font-weight: 700; }

@keyframes pFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
main > * { animation: pFadeUp .5s ease both; }
main > *:nth-child(2) { animation-delay: .06s; }
main > *:nth-child(3) { animation-delay: .12s; }
main > *:nth-child(4) { animation-delay: .18s; }
main > *:nth-child(5) { animation-delay: .24s; }

button, a, input, select, textarea, tr {
  transition: background-color .2s ease, color .2s ease, border-color .2s ease, box-shadow .2s ease, filter .2s ease;
}
button:not(:disabled):hover { filter: brightness(1.08); box-shadow: 0 6px 16px rgba(0,0,0,.12); }
button:not(:disabled):active { transform: scale(.98); }
input:focus, select:focus, textarea:focus { outline: none; box-shadow: 0 0 0 3px rgba(59,130,246,.25); }
tbody tr:hover { background: rgba(0,0,0,.03); }

@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
`;
fs.writeFileSync(f, font + css + block);
console.log('Done: ' + f);