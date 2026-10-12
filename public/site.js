
(function () {
  var C = {"momo":"0598124922","network":"MTN","name":"Kwadjo Owusu-Ansah Quarshie","ref":"dhf","email":"daakyehenefoundation@outlook.com"};
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
