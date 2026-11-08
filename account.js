(function () {
  'use strict';

  const endpoint = '/api/customer-account';
  const status = document.querySelector('#account-status');
  const signIn = document.querySelector('#account-sign-in');
  const signOut = document.querySelector('#sign-out');
  const redeem = document.querySelector('#redeem-link');
  let invite = new URLSearchParams(location.hash.slice(1)).get('invite');
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  redeem.hidden = !invite;

  const formatDay = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeZone: 'UTC' });
  const ukClock = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/London',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });

  function node(tag, value, className) {
    const element = document.createElement(tag);
    element.textContent = value;
    if (className) element.className = className;
    return element;
  }

  function renderList(selector, list, empty) {
    const container = document.querySelector(selector);
    container.replaceChildren();
    if (!list.length) container.append(node('p', empty));
    for (const booking of list) {
      const card = node('article', '', 'appointment');
      card.append(
        node('p', booking.status, 'appointment-status'),
        node('h3', booking.service),
        node('p', formatDay.format(new Date(booking.day + 'T12:00:00Z')) + ' · ' + booking.time + (booking.end_time ? '–' + booking.end_time : '')),
      );
      if (booking.location) card.append(node('p', 'Location · ' + booking.location));
      if (booking.notes) card.append(node('p', booking.notes));
      container.append(card);
    }
  }

  function signedIn(value) {
    signIn.hidden = value;
    document.querySelector('#account-controls').hidden = !value;
    document.querySelector('#account-bookings').hidden = !value;
  }

  async function load() {
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (response.status === 401) {
        signedIn(false);
        status.textContent = invite ? 'Your sign-in link is ready.' : 'Sign in to see your appointments.';
        return;
      }
      if (!response.ok) throw Error();
      const data = await response.json();
      const now = ukClock.format(new Date());
      const upcoming = data.bookings.filter(booking => booking.status === 'confirmed' && booking.day + ' ' + booking.time >= now);
      const past = data.bookings.filter(booking => !upcoming.includes(booking)).reverse();
      renderList('#upcoming-bookings', upcoming, 'You have no upcoming bookings.');
      renderList('#past-bookings', past, 'You have no past bookings.');
      status.textContent = 'Welcome, ' + data.customer.name + '.';
      signedIn(true);
      // A new invite can switch accounts on a shared device.
      signIn.hidden = !invite;
    } catch {
      signedIn(false);
      status.textContent = 'My Bookings is temporarily unavailable. Please try again.';
    }
  }

  async function action(button, payload) {
    button.disabled = true;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      invite = null;
      redeem.hidden = true;
      if (payload.action === 'sign-out') {
        document.querySelector('#upcoming-bookings').replaceChildren();
        document.querySelector('#past-bookings').replaceChildren();
      }
      await load();
    } catch (error) {
      status.textContent = error.message || 'Please try again.';
    } finally {
      button.disabled = false;
    }
  }

  redeem.addEventListener('click', () => action(redeem, { action: 'redeem', invite }));
  signOut.addEventListener('click', () => action(signOut, { action: 'sign-out' }));
  load();
})();
