(function(){
 'use strict';
 const list=document.querySelector('#review-list'),status=document.querySelector('#review-status'),form=document.querySelector('#review-form');
 const admin=/\/reviews-admin(?:\.html)?\/?$/.test(location.pathname);
 const node=(tag,text,cls)=>{const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e;};
 async function load(){
  try{const response=await fetch('/api/reviews'+(admin?'?admin=1':''),{cache:'no-store'}),data=await response.json();if(!response.ok)throw Error(data.error||'Could not load reviews.');list.replaceChildren();
   if(!data.reviews.length)list.append(node('p',admin?'No reviews have been submitted yet.':'No published reviews yet. Be the first to share your experience.'));
   for(const review of data.reviews){const card=node('article','','review-card');card.append(node('h3',review.name),node('div','★'.repeat(review.rating)+' · '+review.service+(admin?' · '+review.status:''),'review-meta'),node('p',review.body),node('small',new Date(review.created_at).toLocaleDateString('en-GB')));
    if(admin){for(const [action,label]of [['approve','Publish'],['hide','Hide'],['delete','Delete']]){const b=node('button',label,'button ghost');b.type='button';b.addEventListener('click',async()=>{if(action==='delete'&&!confirm('Permanently delete this review?'))return;b.disabled=true;try{const r=await fetch('/api/reviews',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:review.id,action})});const result=await r.json();if(!r.ok)throw Error(result.error);status.textContent='Review updated.';await load();}catch(e){status.textContent=e.message;b.disabled=false;}});card.append(b);}}
    list.append(card);
   }
  }catch(e){list.replaceChildren(node('p',e.message));}
 }
 if(form)form.addEventListener('submit',async event=>{event.preventDefault();if(!form.reportValidity())return;const button=form.querySelector('button[type=submit]');button.disabled=true;status.textContent='Submitting your review…';try{const data=Object.fromEntries(new FormData(form));data.rating=Number(data.rating);data.consent=form.elements.consent.checked;const r=await fetch('/api/reviews',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await r.json();if(!r.ok)throw Error(result.error||'Your review could not be saved.');form.reset();status.textContent='Thank you! Your review has been saved and is awaiting approval before publication.';}catch(e){status.textContent=e.message;}finally{button.disabled=false;}});
 if(!admin)fetch('/api/reviews?admin=1',{cache:'no-store'}).then(r=>{if(r.ok)document.querySelector('#manage-reviews').hidden=false;}).catch(()=>{});
 load();
})();
