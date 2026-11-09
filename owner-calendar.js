(function () {
  'use strict';
  const endpoint = '/api/owner-bookings?section=calendar';
  const message = document.querySelector('#calendar-status');
  const form = document.querySelector('#slot-form');
  const list = document.querySelector('#owner-slots');

  function node(tag, value) {
    const el = document.createElement(tag);
    el.textContent = value;
    return el;
  }

  async function request(payload) {
    const response = await fetch(endpoint, {
      cache: 'no-store',
      ...(payload ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) } : {}),
    });
    if (response.status === 403) {
      document.querySelector('#calendar-workspace').hidden = true;
      document.querySelector('#calendar-sign-in').hidden = false;
      throw Error('Log in with your Holostasis owner account.');
    }
    const result = await response.json();
    if (!response.ok) throw Error(result.error);
    return result;
  }

  async function run(button, work) {
    if (button) button.disabled = true;
    try { await work(); }
    catch (error) { message.textContent = error.message || 'Please try again.'; }
    finally { if (button) button.disabled = false; }
  }

  function action(label, payload, success, confirmText) {
    const button = node('button', label);
    button.type = 'button';
    button.className = 'button ghost';
    button.addEventListener('click', () => {
      if (confirmText && !confirm(confirmText)) return;
      run(button, async () => {
        await request(payload);
        await load();
        message.textContent = success;
      });
    });
    return button;
  }

  function moveControl(booking, targets) {
    const form = node('form', '');
    form.className = 'contact-form';
    const label = node('label', 'Move to an open slot');
    const select = node('select', '');
    select.required = true;
    select.append(new Option('Choose a new date and time', ''));
    for (const target of targets) {
      select.append(new Option(target.day + ' · ' + target.time + '–' + target.end_time, target.id));
    }
    label.append(select);
    const button = node('button', 'Move booking');
    button.className = 'button ghost';
    button.type = 'submit';
    form.append(label, button);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const destination = select.selectedOptions[0];
      if (!confirm('Move this booking to ' + destination.textContent + '?')) return;
      run(button, async () => {
        await request({ action: 'move', id: booking.booking_id, target: destination.value });
        await load();
        message.textContent = 'Booking moved. The customer can see the new time in My Bookings if linked to an account.';
      });
    });
    return form;
  }

  async function load() {
    const { slots, now } = await request();
    const ukNow = new Intl.DateTimeFormat('sv-SE', {
      timeZone:'Europe/London', year:'numeric', month:'2-digit', day:'2-digit',
      hour:'2-digit', minute:'2-digit', hourCycle:'h23',
    }).format(new Date(now));
    const openSlots = slots.filter(slot => !slot.booking_id && !slot.closed && !slot.manual_conflict &&
      (!slot.hold_until || slot.hold_until<=now) && slot.day+' '+slot.time>ukNow);
    list.replaceChildren();
    if (!slots.length) list.append(node('p', 'There are no published slots yet.'));
    for (const slot of slots) {
      const card = node('article', '');
      card.className = 'appointment';
      const held = slot.hold_until && slot.hold_until > now;
      const state = slot.status || (slot.closed ? 'Closed' : slot.manual_conflict ? 'Blocked by a manual appointment' : held ? 'Temporarily held' : 'Open');
      card.append(node('h3', slot.service), node('p', slot.day + ' · ' + slot.time + '–' + slot.end_time), node('p', state));
      const buttons = node('div', '');
      buttons.className = 'account-actions';
      if (slot.booking_id) {
        card.append(node('p', slot.name + ' · ' + slot.email), node('p', slot.location));
        if (slot.notes) card.append(node('p', slot.notes));
        if (!slot.customer_id) buttons.append(action('Link to account', { action: 'link-guest', id: slot.booking_id },
          'Booking linked.', 'Confirm you have verified that this email belongs to the customer.'));
        if (slot.status === 'confirmed') {
          const targets = openSlots.filter(target => target.service.toLowerCase()===slot.service.toLowerCase());
          if (targets.length) card.append(moveControl(slot, targets));
          else card.append(node('p', 'Publish a new slot for this service to move the booking.'));

          buttons.append(
            action('Mark completed', { action: 'complete', id: slot.booking_id }, 'Booking marked completed.'),
            action('Cancel booking', { action: 'cancel', id: slot.booking_id }, 'Booking cancelled and slot reopened.',
              'Cancel this booking and make the time available again?'),
          );
        }
      } else if (!slot.closed && !held) {
        buttons.append(action('Remove slot', { action: 'close-slot', id: slot.id }, 'Slot removed from public availability.'));
      }
      card.append(buttons);
      list.append(card);
    }
    document.querySelector('#calendar-workspace').hidden = false;
    message.textContent = 'Manage the times customers can book.';
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    run(event.submitter, async () => {
      await request({ action: 'create-slot', ...Object.fromEntries(new FormData(form)) });
      form.reset();
      await load();
      message.textContent = 'Slot published.';
    });
  });
  document.querySelector('#refresh-calendar').addEventListener('click', event => run(event.currentTarget, load));
  run(null, load);
})();
