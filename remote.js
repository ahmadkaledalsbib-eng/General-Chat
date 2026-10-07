(function () {
  const B = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const load = u => new Promise((ok, no) => {
    const s = document.createElement('script');
    s.src = u; s.onload = ok; s.onerror = no; document.head.appendChild(s);
  });

  load(B + 'firebase-app-compat.js')
    .then(() => load(B + 'firebase-firestore-compat.js'))
    .then(() => {
      firebase.initializeApp(window.FB_CFG);
      firebase.firestore().doc('config/app').onSnapshot(s => { if (s.exists) apply(s.data()); });
    })
    .catch(() => {}); // بلا إنترنت: يعمل التطبيق بآخر إعدادات محفوظة

  function apply(d) {
    // نخزّن الإعدادات في نفس المفتاح الذي يقرأ منه التطبيق (getAdm)
    localStorage.setItem('wallet_admin', JSON.stringify(d));
    applyAdmin();
    if (!document.getElementById('lockPin') && !document.getElementById('authWrap')) render();

    const seen = localStorage.getItem('wallet_seen_ver');
    if (!seen) localStorage.setItem('wallet_seen_ver', d.version || '');
    else if (d.version && d.version !== seen) showUpdate(d);
  }

  function showUpdate(d) {
    if (document.getElementById('updBox')) return;
    const w = document.createElement('div');
    w.id = 'updBox';
    w.style.cssText = 'position:fixed;inset:0;background:#000b;z-index:99;display:grid;place-items:center;padding:20px';
    const c = document.createElement('div');
    c.style.cssText = 'background:var(--bg);color:var(--tx);border-radius:20px;padding:20px;width:100%;max-width:380px;max-height:80%;overflow:auto';
    const h = document.createElement('h2');
    h.style.marginTop = '0';
    h.textContent = 'تحديث جديد · v' + d.version;
    const ul = document.createElement('ul');
    ul.style.cssText = 'padding-inline-start:20px;margin:12px 0;line-height:1.9';
    (d.changelog || []).forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
    const b = document.createElement('button');
    b.className = 'btn'; b.textContent = 'تحديث الآن';
    b.onclick = () => {
      localStorage.setItem('wallet_seen_ver', d.version);
      const rs = navigator.serviceWorker ? navigator.serviceWorker.getRegistrations() : Promise.resolve([]);
      rs.then(r => Promise.all(r.map(x => x.update()))).catch(() => {}).then(() => location.reload());
    };
    c.append(h, ul, b); w.appendChild(c); document.body.appendChild(w);
  }
})();
