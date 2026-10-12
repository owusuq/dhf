
(function () {
  var d = document;
  try { if (localStorage.getItem('dark') === '1') d.documentElement.classList.add('dark'); } catch (e) {}
  function init() {
    if (!d.querySelector('link[rel=manifest]')) {
      var l = d.createElement('link'); l.rel = 'manifest'; l.href = '/manifest.json'; d.head.appendChild(l);
    }
    var m = d.createElement('meta'); m.name = 'theme-color'; m.content = '#0a2342'; d.head.appendChild(m);
    var b = d.createElement('button');
    b.className = 'p-dark-toggle'; b.textContent = '🌙'; b.setAttribute('aria-label', 'Toggle dark mode');
    b.onclick = function () {
      var on = d.documentElement.classList.toggle('dark');
      try { localStorage.setItem('dark', on ? '1' : '0'); } catch (e) {}
    };
    d.body.appendChild(b);
    window.toast = function (msg) {
      var t = d.createElement('div'); t.className = 'p-toast'; t.textContent = msg; d.body.appendChild(t);
      setTimeout(function () { t.classList.add('out'); }, 2200);
      setTimeout(function () { t.remove(); }, 2700);
    };
  }
  if (d.readyState === 'complete') init(); else window.addEventListener('load', init);
})();
