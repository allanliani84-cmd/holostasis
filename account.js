(function () {
  'use strict';

  const endpoint = '/api/customer-account';
  const status = document.querySelector('#account-status');
  const login = document.querySelector('#login-form');
  const signup = document.querySelector('#signup-form');
  const setup = document.querySelector('#setup-form');
  const heading = document.querySelector('#account-heading');
  const signOut = document.querySelector('#sign-out');
  let invite = new URLSearchParams(location.hash.slice(1)).get('invite');
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);


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

  function show(mode) {
    login.hidden = mode !== 'login';
    signup.hidden = mode !== 'signup';
    setup.hidden = mode !== 'setup';
    document.querySelector('#account-controls').hidden = mode !== 'bookings';
    document.querySelector('#account-bookings').hidden = mode !== 'bookings';
    heading.textContent = mode === 'bookings' ? 'My Bookings' : mode === 'setup' ? 'Set your password' : mode === 'signup' ? 'Sign up' : 'Log in';
    document.title = heading.textContent + ' | Holostasis';
    document.querySelector('[data-account-nav]').textContent = mode === 'bookings' ? 'My Bookings' : 'Log in';
  }

  async function load() {
    if (invite) {
      show('setup');
      status.textContent = '';
      return;
    }
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (response.status === 401) {
        show('login');
        status.textContent = 'Log in to see your appointments.';
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
      show('bookings');
    } catch {
      show('login');
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
      if (payload.action === 'setup') {
        invite = null;
        setup.reset();
        show('login');
        status.textContent = 'Password saved. Log in with your email and new password.';
        return;
      }
      if (payload.action === 'login') login.reset();
      if (payload.action === 'signup') signup.reset();
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

  document.querySelector('#open-signup').addEventListener('click', () => {
    show('signup');
    status.textContent = '';
    signup.elements.name.focus();
  });
  document.querySelector('#open-login').addEventListener('click', () => {
    show('login');
    status.textContent = '';
    login.elements.email.focus();
  });
  signup.addEventListener('submit', event => {
    event.preventDefault();
    const fields = new FormData(signup);
    action(event.submitter, {
      action:'signup', name:fields.get('name'), email:fields.get('email'), password:fields.get('password')
    });
  });
  login.addEventListener('submit', event => {
    event.preventDefault();
    const fields = new FormData(login);
    action(event.submitter, { action:'login', email:fields.get('email'), password:fields.get('password') });
  });
  setup.addEventListener('submit', event => {
    event.preventDefault();
    const fields = new FormData(setup);
    if (fields.get('password') !== fields.get('confirmPassword')) {
      status.textContent = 'The passwords do not match.';
      return;
    }
    action(event.submitter, { action:'setup', invite, password:fields.get('password') });
  });
  signOut.addEventListener('click', () => action(signOut, { action: 'sign-out' }));
  load();
})();
