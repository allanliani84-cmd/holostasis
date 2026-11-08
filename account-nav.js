(function () {
  'use strict';

  const links = document.querySelectorAll('[data-account-nav]');
  if (!links.length) return;

  async function update() {
    let signedIn = false;
    try {
      const response = await fetch('/api/customer-account?session=1', { cache:'no-store' });
      signedIn = response.ok && Boolean((await response.json()).customer);
    } catch { /* The login link remains available if the network fails. */ }
    for (const link of links) link.textContent = signedIn ? 'My Bookings' : 'Log in';
  }
  addEventListener('pageshow', update);
})();
