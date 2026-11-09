(function () {
  'use strict';

  const links = document.querySelectorAll('[data-account-nav]');
  if (!links.length) return;
  const hintKey = 'holostasis-profile';

  function show(signedIn) {
    for (const link of links) link.textContent = signedIn ? 'Profile' : 'Log in';
  }

  try { show(sessionStorage.getItem(hintKey) === '1'); }
  catch { /* The server still checks the session. */ }

  async function update() {
    try {
      const response = await fetch('/api/customer-account?session=1', { cache:'no-store', credentials:'same-origin' });
      if (response.status !== 401 && !response.ok) return;
      const signedIn = response.ok && Boolean((await response.json()).customer);
      show(signedIn);
      try { sessionStorage.setItem(hintKey, signedIn ? '1' : '0'); }
      catch { /* The server still checks the session. */ }
    } catch { /* A temporary network error does not change the navigation. */ }
  }

  update();
  addEventListener('pageshow', event => { if (event.persisted) update(); });
})();
