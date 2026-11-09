(function () {
  'use strict';

  const endpoint = '/api/owner-bookings?section=customers';
  const status = document.querySelector('#owner-status');
  const picker = document.querySelector('#customer-select');
  const customerForm = document.querySelector('#customer-form');
  const bookingForm = document.querySelector('#booking-form');
  const bookingList = document.querySelector('#owner-bookings');
  const invitePanel = document.querySelector('#invite-panel');
  const inviteUrl = document.querySelector('#invite-url');
  const newBooking = document.querySelector('#new-booking');
  let bookingLoad = 0;

  function node(tag, label, className) {
    const element = document.createElement(tag);
    element.textContent = label;
    if (className) element.className = className;
    return element;
  }

  async function request(data, customer) {
    const response = await fetch(endpoint + (customer ? '&customer=' + encodeURIComponent(customer) : ''), {
      cache: 'no-store',
      ...(data ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}),
    });
    if (response.status === 403) {
      document.querySelector('#owner-workspace').hidden = true;
      document.querySelector('#owner-sign-in').hidden = false;
      throw Error('Log in with your Holostasis owner account.');
    }
    const result = await response.json();
    if (!response.ok) throw Error(result.error);
    return result;
  }

  function resetBooking() {
    bookingForm.reset();
    bookingForm.elements.id.value = '';
    document.querySelector('#booking-title').textContent = 'Add a booking';
    newBooking.hidden = true;
  }

  async function loadBookings() {
    const customer = picker.value;
    const load = ++bookingLoad;
    bookingList.replaceChildren();
    document.querySelector('#booking-panel').hidden = !customer;
    document.querySelector('#customer-actions').hidden = !customer;
    if (!customer) return;
    const result = await request(null, customer);
    if (load !== bookingLoad) return;
    if (!result.bookings.length) bookingList.append(node('p', 'No appointments for this customer yet.'));
    for (const booking of result.bookings) {
      const card = node('article', '', 'appointment');
      card.append(node('h3', booking.service), node('p', booking.day + ' · ' + booking.time + (booking.end_time ? '–' + booking.end_time : '') + ' · ' + booking.status));
      if (booking.source === 'online') {
        const calendar = node('a', 'Open in Manage Calendar');
        calendar.href = 'owner-calendar.html';
        card.append(calendar);
        bookingList.append(card);
        continue;
      }
      const edit = node('button', 'Edit booking', 'button ghost');
      edit.type = 'button';
      edit.addEventListener('click', () => {
        for (const key of ['id', 'service', 'day', 'time', 'end_time', 'location', 'notes', 'status']) {
          bookingForm.elements[key].value = booking[key] ?? '';
        }
        document.querySelector('#booking-title').textContent = 'Edit booking';
        newBooking.hidden = false;
        bookingForm.elements.service.focus();
      });
      card.append(edit);
      bookingList.append(card);
    }
  }

  async function loadCustomers(preferredEmail) {
    const { customers } = await request();
    const current = customers.find(customer => customer.email === preferredEmail)?.id || picker.value;
    picker.replaceChildren(new Option('Choose a customer', ''));
    for (const customer of customers) picker.add(new Option(customer.name + ' · ' + customer.email, customer.id));
    picker.value = current || '';
    document.querySelector('#owner-workspace').hidden = false;
    await loadBookings();
  }

  function clearInvite() {
    invitePanel.hidden = true;
    inviteUrl.value = '';
  }

  async function perform(button, work) {
    if (button) button.disabled = true;
    try { await work(); }
    catch (error) { status.textContent = error.message || 'Please try again.'; }
    finally { if (button) button.disabled = false; }
  }

  picker.addEventListener('change', () => {
    clearInvite();
    resetBooking();
    perform(null, loadBookings);
  });

  newBooking.addEventListener('click', resetBooking);
  customerForm.addEventListener('submit', event => {
    event.preventDefault();
    perform(event.submitter, async () => {
      const data = Object.fromEntries(new FormData(customerForm));
      await request({ action: 'create-customer', ...data });
      customerForm.reset();
      clearInvite();
      resetBooking();
      await loadCustomers(data.email.trim().toLowerCase());
      status.textContent = 'Customer added.';
    });
  });
  bookingForm.addEventListener('submit', event => {
    event.preventDefault();
    perform(event.submitter, async () => {
      const customerId = picker.value;
      const data = Object.fromEntries(new FormData(bookingForm));
      await request({ ...data, action: 'save-booking', customerId });
      if (picker.value === customerId) {
        resetBooking();
        await loadBookings();
      }
      status.textContent = 'Booking saved.';
    });
  });

  document.querySelector('#new-link').addEventListener('click', event => perform(event.currentTarget, async () => {
    const customerId = picker.value;
    clearInvite();
    const { invite } = await request({ action: 'invite', customerId });
    if (picker.value !== customerId) return;
    inviteUrl.value = 'https://www.holostasis.co.uk/account.html#invite=' + invite;
    invitePanel.hidden = false;
    status.textContent = 'Password setup link created.';
  }));
  document.querySelector('#copy-link').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl.value);
      status.textContent = 'Link copied.';
    } catch {
      inviteUrl.select();
      status.textContent = 'Copy the selected link.';
    }
  });
  document.querySelector('#revoke-links').addEventListener('click', event => {
    if (!confirm('Disable this customer’s login and sign them out on every device?')) return;
    perform(event.currentTarget, async () => {
      await request({ action: 'revoke', customerId: picker.value });
      clearInvite();
      status.textContent = 'Customer access revoked. Send a new password setup link to restore access.';
    });
  });
  perform(null, async () => {
    await loadCustomers();
    status.textContent = 'Add or select a customer to manage their confirmed bookings.';
  });
})();
