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
  const formatMonth = new Intl.DateTimeFormat('en-GB', { month:'long', year:'numeric', timeZone:'UTC' });
  const dateButtons = document.querySelector('#booking-days');
  const previous = document.querySelector('#booking-previous');
  const next = document.querySelector('#booking-next');
  const monthPanel = document.querySelector('#booking-month');
  const timeLabel = document.querySelector('#booking-times-label');
  const parameters = new URLSearchParams(location.search);
  const options = Object.fromEntries(['size','photos','filming','shortReels','longVideos']
    .map(name => [name,parameters.get(name) || '']));
  options.petHair = parameters.get('petHair') === '1';
  const quote = window.HolostasisQuote.estimatePackage(parameters.get('package'),options);
  const normalize = text => text.trim().toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const matches = slot => !quote || normalize(slot.service) === normalize(quote.pack.name);
  const total = quote && (window.HolostasisQuote.money(quote.min) +
    (quote.max===quote.min ? '' : '–'+window.HolostasisQuote.money(quote.max)));
  const vehicle = parameters.get('vehicle');
  const bookingNotes = quote && [
    ...(['car','motorbike'].includes(vehicle) ? ['Vehicle: '+vehicle] : []),
    ...(quote.pack.clean ? ['Vehicle: '+(['small','medium','large'].includes(options.size) ? options.size : 'small')] : []),
    ...quote.lines.slice(1).map(line => line.label),
  ];
  if (quote) {
    const title = document.querySelector('#booking-package');
    title.textContent = quote.pack.name + ' · estimated ' + total;
    title.hidden = false;
    const summary = document.querySelector('#booking-package-options');
    summary.textContent = bookingNotes.join(' · ');
    summary.hidden = !bookingNotes.length;
    form.elements.notes.maxLength = Math.max(0,1000-bookingNotes.join('\n').length-2);
  }
  const postcodeForm = document.querySelector('#postcode-form');
  const postcodeInput = postcodeForm.elements.postcode;
  const postcodeSubmit = postcodeForm.querySelector('button');
  const refresh = document.querySelector('#refresh-times');
  const selection = JSON.stringify([quote?.pack.id,options]);
  const packageRequest = quote ? { package:quote.pack.id,...options } : null;
  let postcode = '';
  let slots = [];
  let month;
  let day;
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
      if (held) sessionStorage.setItem(storageKey, JSON.stringify({ key, slot: held, postcode, selection }));
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

  function shiftMonth(value, offset) {
    const date = new Date(value + '-01T12:00:00Z');
    date.setUTCMonth(date.getUTCMonth()+offset);
    return date.toISOString().slice(0,7);
  }

  function renderTimes() {
    list.replaceChildren();
    timeLabel.textContent = day ? 'Times for ' + formatDay.format(new Date(day+'T12:00:00Z')) : 'Select an available date.';
    const available = slots.filter(slot => slot.day===day);
    if (day && !available.length) timeLabel.textContent = 'There are no other times for this date.';
    for (const slot of available) {
      const select = node('button',slot.time+'–'+slot.end_time+(quote?'':' · '+slot.service),'button ghost');
      select.type = 'button';
      select.addEventListener('click', () => run(select, async () => {
        document.querySelector('#booking-done').hidden = true;
        try {
          if (held) {
            await request({ action:'release', id:held.id, key });
            showHold(null);
          }
          key = newKey();
          const result = await request({
            action:'hold', id:slot.id, key, ...packageRequest, postcode, day:slot.day, time:slot.time,
          });
          showHold({ ...slot, expires:result.expires });
          message.textContent = 'Your appointment time is held.';
          details.scrollIntoView({ block:'nearest' });
        } catch (error) {
          if (error.status===409) {
            showHold(null);
            await load();
          }
          throw error;
        }
        await load();
      }));
      list.append(select);
    }
  }

  function renderCalendar() {
    monthPanel.hidden = !slots.length;
    if (!slots.length) {
      list.replaceChildren();
      timeLabel.textContent = quote
        ? (postcode ? 'No times fit this package in the next four weeks. Try a different package or contact Holostasis.' : '')
        : 'Choose a service package to see its available times.';
      return;
    }
    const firstMonth = slots[0].day.slice(0,7);
    const lastMonth = slots[slots.length-1].day.slice(0,7);
    if (!month || month<firstMonth || month>lastMonth) month = firstMonth;
    if (day && !day.startsWith(month+'-')) day = null;
    const days = new Set(slots.map(slot => slot.day));
    const first = new Date(month+'-01T12:00:00Z');
    document.querySelector('#booking-month-title').textContent = formatMonth.format(first);
    previous.disabled = month===firstMonth;
    next.disabled = month===lastMonth;
    dateButtons.replaceChildren();
    for (let i=0;i<(first.getUTCDay()+6)%7;i++) dateButtons.append(node('span',''));
    for (let date=first; date.toISOString().slice(0,7)===month; date.setUTCDate(date.getUTCDate()+1)) {
      const value = date.toISOString().slice(0,10);
      const button = node('button',String(date.getUTCDate()),'booking-day');
      button.type = 'button';
      button.disabled = !days.has(value);
      button.dataset.day = value;
      button.setAttribute('aria-label',formatDay.format(date)+(button.disabled?', unavailable':', available'));
      button.setAttribute('aria-pressed',String(value===day));
      button.addEventListener('click',() => {
        day = value;
        for (const option of dateButtons.querySelectorAll('button')) {
          option.setAttribute('aria-pressed',String(option.dataset.day===day));
        }
        renderTimes();
      });
      dateButtons.append(button);
    }
    renderTimes();
  }

  previous.addEventListener('click',() => { month = shiftMonth(month,-1); day = null; renderCalendar(); });
  next.addEventListener('click',() => { month = shiftMonth(month,1); day = null; renderCalendar(); });

  async function load() {
    if (quote && !postcode) return;
    const data = await request(quote ? { action:'availability', ...packageRequest, postcode } : undefined);
    refresh.hidden = false;
    customer = data.customer;
    document.querySelector('#guest-details').hidden = Boolean(customer);
    for (const name of ['name','email']) form.elements[name].disabled = Boolean(customer);
    document.querySelector('#booking-identity').textContent = customer ? 'Booking as '+customer.name+'.' : 'Booking as a guest.';
    slots = data.slots.filter(matches).sort((left,right) => (left.day+left.time).localeCompare(right.day+right.time));
    renderCalendar();
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
      if (bookingNotes?.length) data.notes = [...bookingNotes,data.notes].filter(Boolean).join('\n');
      try {
        await request({ ...data, action: 'book', id: slot.id, key, postcode, asGuest: !customer });
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
  postcodeForm.hidden = !quote;
  postcodeForm.addEventListener('submit', event => {
    event.preventDefault();
    run(postcodeSubmit, async () => {
      if (held) await request({ action:'release', id:held.id, key });
      showHold(null);
      postcode = postcodeInput.value.trim().toUpperCase();
      slots = [];
      month = null;
      day = null;
      monthPanel.hidden = true;
      timeLabel.textContent = '';
      list.replaceChildren();
      refresh.hidden = true;
      message.textContent = 'Checking availability…';
      await load();
      message.textContent = slots.length ? 'Choose an available date, then pick a time.' : '';
      if (slots.length) monthPanel.scrollIntoView({ block:'nearest' });
    });
  });
  refresh.addEventListener('click', event => run(event.currentTarget, load));
  run(null, async () => {
    const saved = savedHold();
    if (saved && matches(saved.slot) && (!quote || (saved.postcode && saved.selection===selection))) {
      key = saved.key;
      postcode = saved.postcode || '';
      postcodeInput.value = postcode;
      await load();
      day = saved.slot.day;
      month = day.slice(0,7);
      showHold(saved.slot);
      renderCalendar();
      message.textContent = 'Finish booking your held appointment.';
    } else {
      if (saved) {
        await request({ action:'release', id:saved.slot.id, key:saved.key });
        showHold(null);
      }
      await load();
      renderCalendar();
      message.textContent = slots.length ? 'Choose an available date, then pick a time.' : '';
    }
  });
})();
