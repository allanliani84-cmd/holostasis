(function () {
  'use strict';

  const endpoint = '/api/booking-calendar';
  const message = document.querySelector('#booking-status');
  const list = document.querySelector('#available-times');
  const details = document.querySelector('#booking-details');
  const form = document.querySelector('#reserve-form');
  const submit = form.querySelector('button[type=submit]');
  const release = document.querySelector('#release-time');
  const formatDay = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeZone: 'UTC' });
  const formatExpiry = new Intl.DateTimeFormat('en-GB', { timeStyle: 'short', timeZone: 'Europe/London' });
  const newKey = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
  let key = newKey();
  let held = null;
  let customer = null;
  let timer;
  let busy = false;
  const storageKey = 'holostasis-booking-hold';
  const formStatus = document.querySelector('#booking-form-status');

  function savedHold() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey));
      if (saved?.slot && Date.parse(saved.slot.expires) > Date.now() && /^[0-9a-f]{64}$/.test(saved.key)) return saved;
    } catch { /* The calendar also works with browser storage disabled. */ }
    return null;
  }

  function node(tag, value, className) {
    const el = document.createElement(tag);
    el.textContent = value;
    if (className) el.className = className;
    return el;
  }

  const label = slot => formatDay.format(new Date(slot.day + 'T12:00:00Z')) + ' · ' + slot.time + '–' + slot.end_time;

  async function request(data) {
    const response = await fetch(endpoint, {
      cache: 'no-store',
      ...(data ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}),
    });
    const result = await response.json();
    if (!response.ok) throw Object.assign(Error(result.error), { status: response.status });
    return result;
  }

  function showHold(slot) {
    clearTimeout(timer);
    held = slot;
    formStatus.textContent = '';
    try {
      if (held) sessionStorage.setItem(storageKey, JSON.stringify({ key, slot: held }));
      else sessionStorage.removeItem(storageKey);
    } catch { /* The calendar also works with browser storage disabled. */ }
    details.hidden = !held;
    if (!held) return;
    document.querySelector('#chosen-time').textContent = slot.service + ' · ' + label(slot);
    document.querySelector('#hold-expiry').textContent = 'Held until ' + formatExpiry.format(new Date(slot.expires)) + ' UK time.';
    timer = setTimeout(() => {
      showHold(null);
      message.textContent = 'Your hold expired. Choose an available time to continue.';
      if (!busy) run(null, load);
    }, Math.max(0, Date.parse(slot.expires) - Date.now()));
  }

  async function load() {
    const data = await request();
    customer = data.customer;
    document.querySelector('#guest-details').hidden = Boolean(customer);
    for (const name of ['name','email']) {
      form.elements[name].disabled = Boolean(customer);
    }
    document.querySelector('#booking-identity').textContent = customer ? 'Booking as ' + customer.name + '.' : 'Booking as a guest.';
    list.replaceChildren();
    if (!data.slots.length) list.append(node('p', 'There are no other appointments available. Check back or contact Holostasis.'));
    for (const slot of data.slots) {
      const card = node('article', '', 'appointment');
      card.append(node('h3', slot.service), node('p', label(slot)));
      const select = node('button', 'Hold this time', 'button ghost');
      select.type = 'button';
      select.addEventListener('click', () => run(select, async () => {
        document.querySelector('#booking-done').hidden = true;
        try {
          const result = await request({ action: 'hold', id: slot.id, key });
          showHold({ ...slot, expires: result.expires });
          message.textContent = 'Your appointment time is held.';
          details.scrollIntoView({ block: 'nearest' });
        } catch (error) {
          if (error.status === 409) {
            showHold(null);
            await load();
          }
          throw error;
        }
        await load();
      }));
      card.append(select);
      list.append(card);
    }
  }

  async function run(button, work) {
    if (busy) return;
    busy = true;
    if (button) button.disabled = true;
    formStatus.textContent = '';
    try { await work(); }
    catch (error) {
      const errorText = error.message || 'Please try again.';
      if (held && button === submit) formStatus.textContent = errorText;
      else message.textContent = errorText;
    }
    finally {
      busy = false;
      if (button) button.disabled = false;
    }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!held) return;
    const slot = held;
    run(submit, async () => {
      const data = Object.fromEntries(new FormData(form));
      try {
        await request({ ...data, action: 'book', id: slot.id, key, asGuest: !customer });
      } catch (error) {
        if (error.status === 409) {
          showHold(null);
          await load();
        } else if (error.status === 401) {
          await load();
        }
        throw error;
      }
      showHold(null);
      key = newKey();
      form.reset();
      const done = document.querySelector('#booking-done');
      document.querySelector('#booking-confirmation').textContent = slot.service + ' · ' + label(slot);
      document.querySelector('#booking-account-link').hidden = !customer;
      done.hidden = false;
      done.scrollIntoView({ block: 'nearest' });
      message.textContent = 'Your time is reserved. Holostasis will confirm the service details and total separately.';
      await load();
    });
  });

  release.addEventListener('click', () => {
    if (!held) return;
    run(release, async () => {
      await request({ action: 'release', id: held.id, key });
      showHold(null);
      key = newKey();
      message.textContent = 'The time was released.';
      await load();
    });
  });
  document.querySelector('#refresh-times').addEventListener('click', event => run(event.currentTarget, load));
  run(null, async () => {
    await load();
    const saved = savedHold();
    if (saved) {
      key = saved.key;
      showHold(saved.slot);
      message.textContent = 'Finish booking your held appointment.';
    } else {
      message.textContent = 'Select an available appointment below.';
    }
  });
})();
