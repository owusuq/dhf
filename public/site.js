
(function () {
  var C = {"momo":"0598124922","network":"MTN","name":"Kwadjo Owusu-Ansah Quarshie","ref":"dhf","email":"daakyehenefoundation@outlook.com"};
  var SB = {"url":"https://eqgrjxeicpxhqbntoptu.supabase.co","key":"sb_publishable_4NoBh6-PgN-doYrv-cnq4w_r6Iklq6C"};
  var SHOW = ['/', '/login'];
  var d = document;
  try { if (localStorage.getItem('dark') === '1') d.documentElement.classList.add('dark'); } catch (e) {}

  var m = d.createElement('meta'); m.name = 'theme-color'; m.content = '#0a2342'; d.head.appendChild(m);
  var l = d.createElement('link'); l.rel = 'manifest'; l.href = '/manifest.json'; d.head.appendChild(l);

  window.toast = function (msg) {
    d.querySelectorAll('.p-toast').forEach(function (x) { x.remove(); });
    var t = d.createElement('div'); t.className = 'p-toast'; t.textContent = msg; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); d.body.appendChild(t);
    setTimeout(function () { t.classList.add('out'); }, 2200);
    setTimeout(function () { t.remove(); }, 2700);
  };

  function close() { var o = d.querySelector('.dn-ov'); if (o) o.remove(); }

  function open() {
    var o = d.createElement('div'); o.className = 'dn-ov';
    o.innerHTML = '<div class="dn-card"><h2>Support a student \u2764\uFE0F</h2>' +
      '<p>Your gift helps students at the Daakyehene Foundation stay in school. Thank you!</p>' +
      '<div class="dn-stats"></div>' +
      '<div class="dn-momo">Mobile Money (' + C.network + ')<br><span class="dn-num">' + C.momo + '</span><br>' + C.name +
      '<br>Payment reference: <b>' + C.ref + '</b><br><button class="dn-copy">Copy number</button></div>' +
      '<a class="dn-gfm" href="https://gofund.me/ded4e4e50" target="_blank" rel="noopener">💧 Clean drinking water project · GoFundMe</a>' +
      '<p class="dn-note">Giving from abroad, by bank transfer, or a large amount? Please email <a href="mailto:' + C.email + '">' + C.email + '</a></p>' +
      '<button class="dn-x">Close</button></div>';
    o.addEventListener('click', function (e) { if (e.target === o) close(); });
    o.querySelector('.dn-x').onclick = close;
    var c = o.querySelector('.dn-copy');
    c.onclick = function () {
      try { navigator.clipboard.writeText(C.momo); } catch (e) {}
      c.textContent = 'Copied \u2713';
    };
    fetch(SB.url + '/rest/v1/rpc/public_student_stats', {
      method: 'POST',
      headers: { apikey: SB.key, Authorization: 'Bearer ' + SB.key, 'Content-Type': 'application/json' },
      body: '{}'
    }).then(function (r) { return r.json(); }).then(function (j) {
      var n = j && j.tertiary;
      if (typeof n === 'number' && n > 0) {
        o.querySelector('.dn-stats').innerHTML = '🎓 <b>' + n + '</b> tertiary student' + (n === 1 ? '' : 's') + ' currently enrolled<br><small>Updated live from the portal</small>';
      }
    }).catch(function () {});
    d.body.appendChild(o);
  }

  d.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  function init() {
    var t = d.createElement('button');
    t.className = 'p-dark-toggle'; t.textContent = d.documentElement.classList.contains('dark') ? '\u2600\uFE0F' : '\u{1F319}'; t.setAttribute('aria-label', 'Toggle dark mode');
    t.onclick = function () {
      var on = d.documentElement.classList.toggle('dark');
      t.textContent = on ? '\u2600\uFE0F' : '\u{1F319}';
      try { localStorage.setItem('dark', on ? '1' : '0'); } catch (e) {}
    };
    d.body.appendChild(t);
    var tOrig = t.onclick, tm = false, tdr = false, tsx, tsy, tox, toy;
    t.style.touchAction = 'none';
    t.style.cursor = 'grab';
    try {
      var tp = JSON.parse(localStorage.getItem('dtpos') || 'null');
      if (tp) {
        t.style.left = Math.min(tp.x, innerWidth - 50) + 'px';
        t.style.top = Math.min(tp.y, innerHeight - 50) + 'px';
        t.style.right = 'auto';
        t.style.bottom = 'auto';
      }
    } catch (e) {}
    t.addEventListener('pointerdown', function (e) {
      tdr = true; tm = false; tsx = e.clientX; tsy = e.clientY;
      var r = t.getBoundingClientRect(); tox = r.left; toy = r.top;
      t.setPointerCapture(e.pointerId);
    });
    t.addEventListener('pointermove', function (e) {
      if (!tdr) return;
      var dx = e.clientX - tsx, dy = e.clientY - tsy;
      if (!tm && Math.abs(dx) + Math.abs(dy) < 6) return;
      tm = true;
      t.style.left = Math.min(Math.max(0, tox + dx), innerWidth - t.offsetWidth) + 'px';
      t.style.top = Math.min(Math.max(0, toy + dy), innerHeight - t.offsetHeight) + 'px';
      t.style.right = 'auto';
      t.style.bottom = 'auto';
    });
    t.addEventListener('pointerup', function () {
      tdr = false;
      if (tm) {
        try { localStorage.setItem('dtpos', JSON.stringify({ x: parseInt(t.style.left), y: parseInt(t.style.top) })); } catch (e) {}
      }
    });
    t.onclick = function () { if (tm) { tm = false; return; } tOrig(); };
    var b = d.createElement('button');
    b.className = 'dn-btn';
    b.innerHTML = '<span class="dn-heart">\u2764\uFE0F</span> Donate';
    b.onclick = open;
    d.body.appendChild(b);
    b.style.touchAction = 'none';
    b.style.cursor = 'grab';
    try {
      var p = JSON.parse(localStorage.getItem('dnpos') || 'null');
      if (p) {
        b.style.left = Math.min(p.x, innerWidth - 90) + 'px';
        b.style.top = Math.min(p.y, innerHeight - 50) + 'px';
        b.style.bottom = 'auto';
      }
    } catch (e) {}
    var sx, sy, ox, oy, moved = false, drag = false;
    b.addEventListener('pointerdown', function (e) {
      drag = true; moved = false; sx = e.clientX; sy = e.clientY;
      var r = b.getBoundingClientRect(); ox = r.left; oy = r.top;
      b.setPointerCapture(e.pointerId);
    });
    b.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 6) return;
      moved = true;
      b.style.left = Math.min(Math.max(0, ox + dx), innerWidth - b.offsetWidth) + 'px';
      b.style.top = Math.min(Math.max(0, oy + dy), innerHeight - b.offsetHeight) + 'px';
      b.style.bottom = 'auto';
    });
    b.addEventListener('pointerup', function () {
      drag = false;
      if (moved) {
        try { localStorage.setItem('dnpos', JSON.stringify({ x: parseInt(b.style.left), y: parseInt(b.style.top) })); } catch (e) {}
      }
    });
    b.onclick = function () { if (moved) { moved = false; return; } open(); };
    function sync() { b.style.display = true ? 'flex' : 'none'; }
    ['pushState', 'replaceState'].forEach(function (k) {
      var orig = history[k];
      history[k] = function () { var r = orig.apply(this, arguments); sync(); return r; };
    });
    addEventListener('popstate', sync);
    sync();
  }
  if (d.readyState === 'complete') init(); else addEventListener('load', init);
})();
