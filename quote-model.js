(function (root) {
  'use strict';

  const cleaningPackages = [
    {id:'exterior',name:'Exterior Maintenance',price:30,clean:'exterior',depth:1,scope:'Pre-wash, hand wash, wheels, exterior glass, towel dry and tyre dressing.'},
    {id:'exterior-deep',name:'Enhanced Exterior',price:50,clean:'exterior',depth:2,scope:'Exterior Maintenance plus extra attention to wheels and trim, with spray protection.'},
    {id:'interior',name:'Interior Refresh',price:35,clean:'interior',depth:1,scope:'Vacuum, mats, dashboard and plastics wipe-down, and interior glass.'},
    {id:'interior-deep',name:'Interior Detail',price:60,clean:'interior',depth:2,includesPetHair:true,scope:'Interior Refresh plus more thorough vacuuming and cleaning around vents, seams and crevices. Pet hair removal is included. Extraction is separate.'},
    {id:'mini',name:'Mini Valet',price:45,clean:'both',depth:1,scope:'Exterior Maintenance plus Interior Refresh. Allow approximately 1.5–2 hours on site.'},
    {id:'full',name:'Full Valet',price:80,clean:'both',depth:2,includesPetHair:true,scope:'Enhanced Exterior plus Interior Detail, including pet hair removal. Extraction and decontamination are separate.'}
  ];
  const motorbikeDetail = {
    id:'motorbike-detail',name:'Motorbike Clean',price:35,clean:'bike',
    scope:'A gentle hand wash for the tank, fairings and accessible bodywork, wheel and mudguard cleaning, windscreen wipe and hand drying. Allow about 1 hour. Chain cleaning and lubrication are excluded.'
  };
  const photography = [
    {id:'snapshot',name:'Snapshot',price:40,photos:5,scope:'5 edited photos, up to 30 minutes, one location.'},
    {id:'portfolio',name:'Portfolio',price:65,photos:12,scope:'12 edited photos, up to 60 minutes, one location.'},
    {id:'editorial',name:'Editorial',price:105,photos:20,scope:'20 edited photos, up to 2 hours, up to two nearby locations.'}
  ];
  const filmingSessions = [
    {id:'filming-45',name:'Filming Session (up to 45 min)',price:40,minutes:45,scope:'One stationary vehicle. Add edited videos separately.'},
    {id:'filming-90',name:'Filming Session (up to 90 min)',price:60,minutes:90,scope:'One stationary vehicle. Add edited videos separately.'}
  ];
  const shortEdit = {id:'reel',name:'Short Reel',price:20,extraPrice:10,scope:'Vertical edit up to 30 seconds. One round of minor changes included.'};
  const longEdit = {id:'long-video',name:'Longer Video',price:40,extraPrice:20,scope:'31–60 seconds. One round of minor changes included.'};
  const photoReel = {id:'photo-reel',name:'Photo + Reel',price:90,photos:5,scope:'5 edited photos and one short reel, with up to an hour on location. Extra edits can be added.'};
  const cleanCapture = {id:'clean-capture',name:'Clean Capture',price:80,clean:'both',depth:1,photos:5,scope:'Mini Valet and 5 edited photos.'};
  const signature = {id:'signature',name:'Signature Showcase',price:195,clean:'both',depth:2,includesPetHair:true,photos:10,scope:'Full Valet, 10 edited photos and one short reel. Extra edits can be added.'};
  const packages = [...cleaningPackages, motorbikeDetail, ...photography, ...filmingSessions, shortEdit, longEdit, photoReel, cleanCapture, signature];

  const money = value => new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(value);
  const cost = items => items.reduce((total,item) => total + item.price, 0);

  function videoEdits(shortReels, longVideos, includesFirstEdit = false) {
    const lines = [];
    if (!includesFirstEdit && (shortReels || longVideos)) {
      if (shortReels) {
        lines.push(shortEdit);
        shortReels--;
      } else {
        lines.push(longEdit);
        longVideos--;
      }
    }
    for (const [edit, quantity] of [[shortEdit, shortReels], [longEdit, longVideos]]) {
      if (quantity) {
        lines.push({...edit, name:'Additional '+edit.name.toLowerCase()+' × '+quantity, price:edit.extraPrice*quantity});
      }
    }
    return lines;
  }

  function vehicleLines(clean, size, petHair, includesPetHair) {
    const lines = [];
    if (clean && clean !== 'none' && size === 'medium') lines.push({label:'Medium vehicle allowance',min:10,max:10});
    if (clean && clean !== 'none' && size === 'large') lines.push({label:'Large vehicle allowance',min:10,max:25});
    if ((clean === 'interior' || clean === 'both') && petHair && !includesPetHair) lines.push({label:'Pet hair removal',min:15,max:40});
    return lines;
  }

  function estimatePackage(id, input = {}) {
    const pack = packages.find(p => p.id === id && p.extraPrice === undefined);
    if (!pack) return null;
    const size = ['small','medium','large'].includes(input.size) ? input.size : 'small';
    const photo = pack.clean && !pack.photos ? photography.find(p => p.photos === Number(input.photos)) : null;
    const includesReel = pack === photoReel || pack === signature;
    const shortReels = Number(input.shortReels || 0);
    const longVideos = Number(input.longVideos || 0);
    if (![shortReels,longVideos].every(n => Number.isSafeInteger(n) && n>=0) ||
        !Number.isSafeInteger(shortReels*shortEdit.price + longVideos*longEdit.price + 500)) return null;
    const canAddVideo = Boolean(pack.clean || pack.minutes || includesReel);
    const requestedFilming = Number(input.filming);
    const filmingMinutes = requestedFilming === 90 ? 90 : requestedFilming === 45 ? 45 : 0;
    const filming = pack.clean && !includesReel &&
      (filmingMinutes || shortReels || longVideos)
      ? filmingSessions.find(p => p.minutes === (filmingMinutes || 45)) : null;
    const edits = canAddVideo ? videoEdits(shortReels,longVideos,includesReel) : [];
    const lines = [pack,photo,filming,...edits].filter(Boolean)
      .map(p => ({label:p.name,min:p.price,max:p.price}));
    if (pack.clean !== 'bike') lines.push(...vehicleLines(pack.clean,size,input.petHair,pack.includesPetHair));
    return {
      pack, lines,
      min:lines.reduce((total,line) => total+line.min,0),
      max:lines.reduce((total,line) => total+line.max,0),
    };
  }

  function estimate(input) {
    const clean = input.clean || 'none';
    const condition = input.condition || 'normal';
    const size = input.size || 'small';
    const photos = Number(input.photos || 0);
    const filming = Number(input.filming || 0);
    const shortReels = Number(input.shortReels || 0);
    const longVideos = Number(input.longVideos || 0);
    if (![shortReels,longVideos].every(quantity => Number.isSafeInteger(quantity) && quantity >= 0) ||
        !Number.isSafeInteger(shortReels*shortEdit.price + longVideos*longEdit.price + 500)) {
      return {unavailable:true,lines:[],notes:['Enter a valid whole number of edits.']};
    }
    if (!['none','exterior','interior','both'].includes(clean) ||
        !['normal','heavy','hazard'].includes(condition) ||
        !['small','medium','large'].includes(size) ||
        ![0,5,10,12,20].includes(photos) || ![0,45,90].includes(filming)) {
      throw new Error('Unsupported choice');
    }

    const needsVideo = Boolean(filming || shortReels || longVideos);
    if (clean === 'none' && !photos && !needsVideo) {
      return {empty:true,lines:[],notes:['Choose cleaning, photography or video to see a recommendation.']};
    }
    if (clean !== 'none' && condition === 'hazard') {
      return {unavailable:true,lines:[],notes:['Mould, bodily fluids, pests and other hazardous contamination are outside the cleaning service scope.']};
    }

    const depth = condition === 'heavy' ? 2 : 1;
    const fitsCleaning = p => clean !== 'none' && (p.clean === clean || p.clean === 'both') && p.depth >= depth;
    const cleaningOptions = clean === 'none' ? [[]] : cleaningPackages.filter(fitsCleaning).map(p => [p]);
    const photoOptions = photos ? photography.filter(p => p.photos >= photos).map(p => [p]) : [[]];
    const session = needsVideo ? filmingSessions.find(p => p.minutes === (filming || 45)) : null;
    const video = session ? [session, ...videoEdits(shortReels,longVideos)] : [];

    const candidates = cleaningOptions.flatMap(cleaning =>
      photoOptions.map(photoshoot => [...cleaning, ...photoshoot, ...video]));
    if (fitsCleaning(cleanCapture) && photos > 0 && photos <= cleanCapture.photos) {
      candidates.push([cleanCapture, ...video]);
    }
    if (photos > 0 && photos <= photoReel.photos && shortReels > 0 && filming !== 90) {
      for (const cleaning of cleaningOptions) {
        candidates.push([...cleaning, photoReel, ...videoEdits(shortReels-1,longVideos,true)]);
      }
    }
    if (fitsCleaning(signature) && photos > 0 && photos <= signature.photos && shortReels > 0 && filming !== 90) {
      candidates.push([signature, ...videoEdits(shortReels-1,longVideos,true)]);
    }

    candidates.sort((a,b) => cost(a)-cost(b) || a.length-b.length);
    const chosen = candidates[0];
    const lines = chosen.map(p => ({label:p.name,min:p.price,max:p.price,scope:p.scope}));
    lines.push(...vehicleLines(clean,size,input.petHair,chosen.some(p => p.includesPetHair)));

    const notes = ['Indicative estimate. The final total, including return travel, is confirmed from your postcode and agreed before booking.'];
    if (clean !== 'none') notes.push('Cleaning is subject to suitable access, water and power, and an agreed wash-water arrangement.');
    if (condition === 'heavy' && clean !== 'none') notes.push('A deeper clean is selected. Exceptional soiling is assessed separately.');
    if (photos || needsVideo) notes.push('One stationary vehicle. Deliverables and turnaround are agreed before booking.');
    if (shortReels || longVideos) notes.push('The number of edits depends on the footage from the booked session. Plan the edits together before filming.');
    if (clean === 'none' && input.petHair) notes.push('Pet hair removal only applies to interior cleaning.');
    if (input.custom) notes.push('Additional requests are quoted separately.');
    if (size === 'large' && clean !== 'none') notes.push('Vans and unusually large or modified vehicles may require a custom quote.');
    return {
      lines,
      min:lines.reduce((total,line) => total + line.min, 0),
      max:lines.reduce((total,line) => total + line.max, 0),
      notes,
      ids:chosen.map(p => p.id)
    };
  }
  const api = {packages,estimate,estimatePackage,money};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.HolostasisQuote = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
