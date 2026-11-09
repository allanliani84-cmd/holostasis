(function () {
  'use strict';

  const Q = window.HolostasisQuote;
  const section = document.querySelector('[data-package-type]');
  const detailing = section.dataset.packageType === 'detail';
  const form = document.querySelector('#package-options');
  const survey = document.querySelector('#package-survey');
  const choice = document.querySelector('#package-choice');
  const estimate = document.querySelector('#package-estimate');
  const buttons = new Map();
  let selected;

  function node(tag, value, className) {
    const el = document.createElement(tag);
    el.textContent = value;
    if (className) el.className = className;
    return el;
  }

  function selections() {
    const fields = form.elements;
    return {
      size: fields.size?.disabled ? undefined : fields.size?.value,
      petHair: Boolean(fields.petHair?.checked && !fields.petHair.disabled),
      photos: Number(fields.photos?.value || 0),
      filming: Number(fields.filming?.value || 0),
      shortReels: Number(fields.shortReels.value || 0),
      longVideos: Number(fields.longVideos.value || 0),
    };
  }

  function url(pack, options = {}) {
    const query = new URLSearchParams({ package:pack.id });
    const vehicle = pack.clean === 'bike' ? 'motorbike' : section.dataset.vehicle;
    if (vehicle) query.set('vehicle',vehicle);
    for (const [key,value] of Object.entries(options)) {
      if (value && value !== 'small') query.set(key,value === true ? '1' : String(value));
    }
    return 'book.html?' + query.toString();
  }

  function showPrice() {
    if (!selected) return;
    const quote = Q.estimatePackage(selected.id,selections());
    const invalid = form.elements.shortReels.validity.badInput || form.elements.longVideos.validity.badInput;
    estimate.textContent = quote && !invalid
      ? 'Estimated service price · ' + Q.money(quote.min) + (quote.max === quote.min ? '' : '–' + Q.money(quote.max))
      : 'Enter a valid number of edits.';
    return invalid ? null : quote;
  }

  function select(pack) {
    selected = pack;
    form.hidden = false;
    choice.textContent = pack.name;
    for (const [id,button] of buttons) button.setAttribute('aria-pressed', String(id === pack.id));
    const includesReel = ['photo-reel','signature'].includes(pack.id);
    const addonHelp = document.querySelector('#package-addon-help');
    addonHelp.hidden = !(includesReel || detailing);
    addonHelp.textContent = includesReel
      ? 'Your package includes one short reel. Edits selected here are additional.'
      : 'Choosing a video edit without a filming time adds a 45-minute filming session.';
    document.querySelector('#package-addons').hidden = !(pack.clean || pack.minutes || includesReel);
    if (detailing) {
      const isBike = pack.clean === 'bike';
      const hasInterior = ['interior','both'].includes(pack.clean);
      document.querySelector('#package-vehicle-size').hidden = isBike;
      form.elements.size.disabled = isBike;
      document.querySelector('#package-pet-hair').hidden = !hasInterior || Boolean(pack.includesPetHair);
      document.querySelector('#package-pet-included').hidden = !pack.includesPetHair;
      form.elements.petHair.disabled = !hasInterior || Boolean(pack.includesPetHair);
      document.querySelector('#package-photo-field').hidden = Boolean(pack.photos);
      document.querySelector('#package-film-field').hidden = includesReel;
    }
    showPrice();
    choice.focus();
  }

  function card(pack) {
    const el = node('article','','package-card');
    el.append(node('h3',pack.name),node('strong',Q.money(pack.price),'package-price'),node('p',pack.scope));
    if (!detailing && !pack.minutes && pack.id !== 'photo-reel') {
      const link = node('a','Book ' + pack.name,'button primary');
      link.href = url(pack);
      el.append(link);
    } else {
      const button = node('button','Choose ' + pack.name,'button primary');
      button.type = 'button';
      button.setAttribute('aria-pressed','false');
      button.addEventListener('click',() => select(pack));
      buttons.set(pack.id,button);
      el.append(button);
    }
    return el;
  }

  const packages = Q.packages.filter(pack => pack.extraPrice === undefined);
  document.querySelector('#package-list').replaceChildren(...packages
    .filter(pack => detailing ? pack.clean && pack.clean !== 'bike' && !pack.photos : !pack.clean)
    .map(card));
  if (detailing) {
    document.querySelector('#package-bike-list').replaceChildren(card(packages.find(pack => pack.clean === 'bike')));
    document.querySelector('#package-bundle-list').replaceChildren(...packages
      .filter(pack => pack.clean && pack.photos)
      .map(card));
  }

  form.addEventListener('input',showPrice);
  form.addEventListener('submit',event => {
    event.preventDefault();
    if (showPrice()) location.href = url(selected,selections());
  });

  survey.addEventListener('submit',event => {
    event.preventDefault();
    const inputs = Object.fromEntries(new FormData(survey));
    const id = inputs.clean === 'bike' ? 'motorbike-detail' : detailing ? Q.estimate(inputs).ids[0] : inputs.media;
    const pack = packages.find(item => item.id === id);
    const recommendation = document.querySelector('#package-recommendation');
    const button = node('button',detailing || pack.minutes || pack.id === 'photo-reel'
      ? 'Choose ' + pack.name : 'Book ' + pack.name,'button ghost');
    button.type = 'button';
    button.addEventListener('click',() => {
      if (buttons.has(pack.id)) select(pack);
      else location.href = url(pack);
    });
    recommendation.replaceChildren(node('p',pack.name + ' · ' + Q.money(pack.price) + '. ' + pack.scope),button);
  });
})();
