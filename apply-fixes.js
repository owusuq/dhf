// Run from the project root:  node apply-fixes.js
const fs = require('fs');
function edit(file, fn) {
  const s = fs.readFileSync(file, 'utf8');
  const out = fn(s);
  if (out === s) console.log('skipped (already applied or not found): ' + file);
  else { fs.writeFileSync(file, out); console.log('fixed: ' + file); }
}

// 1) Password Show/Hide: keep focus, instant toggle
const eyeOld = 'className="pw-eye" onClick={() => setShow(!show)}';
const eyeNew = 'className="pw-eye" onMouseDown={(e) => e.preventDefault()} onClick={() => setShow((v) => !v)}';
edit('app/page.js', (s) => s.replace(eyeOld, eyeNew));
edit('app/reset/page.js', (s) => s.replace(eyeOld, eyeNew));

edit('app/globals.css', (s) => s.includes('password Show/Hide: instant') ? s : s +
`
/* password Show/Hide: instant, no jump, no blur lag */
.pw-eye,.pw-eye:hover,.pw-eye:active{transition:none!important;filter:none!important;transform:translateY(-50%)!important;-webkit-backdrop-filter:none;backdrop-filter:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.pw-eye:active{background:#d5dfeb}
`);

// 2) Student edit modal: render on document.body so the card can't clip it
edit('app/dashboard/StudentFees.js', (s) => {
  if (s.includes('createPortal')) return s;
  s = s.replace("import { useEffect, useState, useCallback } from 'react';",
    "import { useEffect, useState, useCallback } from 'react';\nimport { createPortal } from 'react-dom';");
  s = s.replace('      {sel && (\n        <div className="sf-back"',
    "      {sel && typeof document !== 'undefined' && createPortal(\n        <div className=\"sf-back\"");
  s = s.replace('        </div>\n      )}\n    </section>',
    '        </div>,\n        document.body\n      )}\n    </section>');
  s = s.replace('z-index:1000;display:flex;align-items:center', 'z-index:20000;display:flex;align-items:center');
  s = s.replace('overflow-y:auto;border-radius:18px;', 'overflow-y:auto;overscroll-behavior:contain;border-radius:18px;');
  return s;
});