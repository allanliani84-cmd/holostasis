(function (root) {
  'use strict';
  // Draft prices recovered on 2 November 2026. Confirm before deployment.
  const packages = [
    {id:'exterior',name:'Exterior Maintenance',price:35,clean:'exterior',depth:1,photos:0,seconds:0,scope:'Wheels, pre-wash, contact wash, drying and tyre dressing. No heavy decontamination.'},
    {id:'exterior-deep',name:'Exterior Deep Clean',price:65,clean:'exterior',depth:2,photos:0,seconds:0,scope:'Draft scope: thorough exterior wash, detailed wheels and exterior crevices. Decontamination quoted separately.'},
    {id:'interior',name:'Interior Refresh',price:40,clean:'interior',depth:1,photos:0,seconds:0,scope:'Vacuum, surfaces, mats and interior glass. No extraction.'},
    {id:'interior-deep',name:'Interior Deep Clean',price:90,clean:'interior',depth:2,photos:0,seconds:0,scope:'Draft scope: detailed vacuum, crevices, mats, surfaces and glass. No extraction or guaranteed stain removal.'},
    {id:'mini',name:'Mini Valet',price:60,clean:'both',depth:1,photos:0,seconds:0,scope:'Exterior Maintenance plus Interior Refresh. Approximately 1.5–2 hours before travel.'},
    {id:'full',name:'Full Valet',price:125,clean:'both',depth:2,photos:0,seconds:0,scope:'Draft scope: thorough interior and exterior clean, detailed crevices and spray protection. Extraction and decontamination extra.'},
    {id:'snapshot',name:'Snapshot',price:50,clean:'none',depth:0,photos:5,seconds:0,scope:'5 edited photos; up to 30 minutes shooting.'},
    {id:'portfolio',name:'Portfolio',price:90,clean:'none',depth:0,photos:12,seconds:0,scope:'12 edited photos; up to 60 minutes shooting.'},
    {id:'editorial',name:'Editorial',price:150,clean:'none',depth:0,photos:20,seconds:0,scope:'20 edited photos; up to 2 hours shooting, 2 locations. Travel separately confirmed.'},
    {id:'reel',name:'Reel',price:85,clean:'none',depth:0,photos:0,seconds:30,scope:'One 15–30-second edit; up to 45 minutes shooting.'},
    {id:'cinematic',name:'Cinematic',price:150,clean:'none',depth:0,photos:0,seconds:60,scope:'One 45–60-second edit; up to 90 minutes shooting.'},
    {id:'film',name:'Film',price:250,clean:'none',depth:0,photos:0,seconds:90,from:true,scope:'One 60–90-second edit; up to 3 hours shooting. Custom quote required.'},
    {id:'clean-capture',name:'Clean Capture',price:95,clean:'both',depth:1,photos:5,seconds:0,scope:'Draft bundle scope: Mini Valet plus 5 edited photos. Confirm inclusion before launch.'},
    {id:'signature',name:'Signature Showcase',price:195,clean:'both',depth:2,photos:10,seconds:30,scope:'Draft bundle scope carried from the PDF Showcase: Full Valet, 10 edited photos and a 15–30-second reel. Confirm newer bundle scope before launch.'}
  ];
  const money = value => new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(value);
  function estimate(input) {
    const clean=input.clean||'none', condition=input.condition||'normal';
    const photos=Number(input.photos)||0, seconds=Number(input.seconds)||0;
    if(!['none','exterior','interior','both'].includes(clean) || !['normal','heavy','hazard'].includes(condition) || ![0,5,12,20].includes(photos) || ![0,30,60,90].includes(seconds) || !['small','medium','large'].includes(input.size||'small')) throw new Error('Unsupported choice');
    if(clean==='none' && !photos && !seconds) return {empty:true,lines:[],min:0,max:0,notes:['Choose cleaning, photography or video to see a recommendation.']};
    if(clean!=='none' && condition==='hazard') return {unavailable:true,lines:[],notes:['Mould, bodily fluids, pests and other hazardous contamination are outside the service scope. No automatic cleaning quote is available.']};
    const depth=clean==='none'?0:condition==='heavy'?2:1;
    const covers=c=>clean==='none'||c===clean||c==='both';
    // Include itemised standalone options so bundles are compared against the same requirements.
    const cleaning=clean==='none'?[null]:packages.filter(p=>p.clean!=='none'&&covers(p.clean)&&p.depth>=depth&&!p.photos&&!p.seconds);
    const photo=photos?packages.filter(p=>p.clean==='none'&&p.photos>=photos&&!p.seconds):[null];
    const video=seconds?packages.filter(p=>p.clean==='none'&&p.seconds>=seconds&&!p.photos):[null];
    const candidates=[];
    for(const c of cleaning) for(const p of photo) for(const v of video) candidates.push([c,p,v].filter(Boolean));
    for(const bundle of packages.filter(p=>p.clean!=='none'&&(p.photos||p.seconds))) {
      if(clean==='none'||!covers(bundle.clean)||bundle.depth<depth) continue;
      // Do not add photo/video packs on top of a bundle: avoid duplicated deliverables.
      if(bundle.photos>=photos&&bundle.seconds>=seconds) candidates.push([bundle]);
    }
    const cost=arr=>arr.reduce((n,p)=>n+p.price,0);
    candidates.sort((a,b)=>cost(a)-cost(b)||a.length-b.length);
    const chosen=candidates[0];
    const lines=chosen.map(p=>({label:p.name,min:p.price,max:p.price,scope:p.scope}));
    if(clean!=='none'&&input.size==='medium') lines.push({label:'Medium vehicle allowance (draft)',min:10,max:10});
    if(clean!=='none'&&input.size==='large') lines.push({label:'Large vehicle allowance (draft)',min:10,max:25});
    if((clean==='interior'||clean==='both')&&input.petHair) lines.push({label:'Pet hair removal',min:15,max:40});
    const notes=['Indicative draft estimate, subject to photos and written confirmation.','Travel is not included. A return-travel charge will be confirmed from your postcode; this is not a live Uber estimate.'];
    if(clean!=='none') notes.push('Cleaning is subject to equipment readiness, suitable access, water/power requirements and an agreed wash-water arrangement.');
    if(condition==='heavy'&&clean!=='none') notes.push('A deeper cleaning service is selected. Exceptional soiling needs assessment; no extra dirt surcharge has been automatically added.');
    if(photos||seconds) notes.push('Stationary vehicle shoot. Editing and delivery schedule to be agreed. Rolling shots, drone work and extra revisions are not included.');
    if(clean==='none'&&input.petHair) notes.push('No pet hair charge: this request is for media only.');
    if(input.custom) notes.push('Additional requests require manual assessment and are not included in this estimate.');
    if(input.size==='large'&&clean!=='none') notes.push('Vans, unusually large or modified vehicles may require a custom quote.');
    if(chosen.some(p=>p.from)) notes.push('Film pricing starts from £250; the displayed figure is a minimum, not an upper limit.');
    return {lines,min:lines.reduce((n,l)=>n+l.min,0),max:lines.reduce((n,l)=>n+l.max,0),from:chosen.some(p=>p.from),notes,ids:chosen.map(p=>p.id)};
  }
  const api={packages,estimate,money};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  root.HolostasisQuote=api;
})(typeof globalThis!=='undefined'?globalThis:this);
