(() => {
  // L'endpoint va inserito solo dopo il deploy verificato del servizio.
  const endpoint = document.currentScript?.dataset.endpoint;
  if (!endpoint || !endpoint.startsWith('https://')) return;
  function record(kind) {
    if (!crypto.randomUUID) return;
    const body = JSON.stringify({id:crypto.randomUUID(),kind});
    fetch(endpoint.replace(/\/$/, '')+'/event', {
      method:'POST',headers:{'Content-Type':'application/json'},body,
      credentials:'omit',referrerPolicy:'no-referrer',keepalive:true
    }).catch(() => {});
  }
  record('view');
  // Non contare display-mode:standalone come installazione: sarebbe una riapertura.
  window.addEventListener('appinstalled',()=>record('install'),{once:true});
})();
