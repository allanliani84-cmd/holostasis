(function(){
 'use strict';
 const list=document.querySelector('#review-list'),status=document.querySelector('#review-status'),form=document.querySelector('#review-form');
 const admin=/\/reviews-admin(?:\.html)?\/?$/.test(location.pathname);
 const node=(tag,text,cls)=>{const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e;};
 async function load(){
  try{const response=await fetch('/api/reviews'+(admin?'?admin=1':''),{cache:'no-store'}),data=await response.json();if(!response.ok)throw Error(data.error||'Could not load reviews.');list.replaceChildren();
   if(!data.reviews.length)list.append(node('p',admin?'No reviews have been submitted yet.':'No published reviews yet. Be the first to share your experience.'));
   for(const review of data.reviews){const card=node('article','','review-card');card.append(node('h3',review.name),node('div','★'.repeat(review.rating)+' · '+review.service+(admin?' · '+review.status:''),'review-meta'),node('p',review.body),node('small',new Date(review.created_at).toLocaleDateString('en-GB')));
    if(review.photo_count>0){
      const photos=node('div','','review-photos');
      for(let i=0;i<review.photo_count;i++){
        const url='/api/reviews?photo='+encodeURIComponent(review.id+'/'+i)+(admin?'&admin=1':'');
        const link=node('a','');
        link.href=url;
        link.target='_blank';
        link.rel='noopener';
        const image=node('img','');
        image.src=url;
        image.alt='Photo '+(i+1)+' from '+review.name+'’s review';
        image.loading='lazy';
        image.decoding='async';
        link.append(image);
        photos.append(link);
      }
      card.append(photos);
    }
    if(admin){for(const [action,label]of [['approve','Publish'],['hide','Hide'],['delete','Delete']]){const b=node('button',label,'button ghost');b.type='button';b.addEventListener('click',async()=>{if(action==='delete'&&!confirm('Permanently delete this review?'))return;b.disabled=true;try{const r=await fetch('/api/reviews',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:review.id,action})});const result=await r.json();if(!r.ok)throw Error(result.error);status.textContent='Review updated.';await load();}catch(e){status.textContent=e.message;b.disabled=false;}});card.append(b);}}
    list.append(card);
   }
  }catch(e){list.replaceChildren(node('p',e.message));}
 }
 const photoInput=form?.elements.photos;
 if(photoInput){
   photoInput.addEventListener('change',()=>{
     photoInput.setCustomValidity(photoInput.files.length>3?'Choose up to 3 photos.':'');
     photoInput.reportValidity();
   });
 }

 async function preparePhoto(file){
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)){
     throw Error('Choose JPG, PNG or WebP photos.');
   }
   if(file.size>20*1024*1024)throw Error('Choose photos smaller than 20 MB each.');
   let image;
   try{image=await createImageBitmap(file);}
   catch{throw Error('One of your photos could not be opened. Try a different photo.');}
   const canvas=document.createElement('canvas');
   const scale=Math.min(1,1280/Math.max(image.width,image.height));
   canvas.width=Math.max(1,Math.round(image.width*scale));
   canvas.height=Math.max(1,Math.round(image.height*scale));
   const ctx=canvas.getContext('2d',{alpha:false});
   try{
     ctx.fillStyle='#fff';
     ctx.fillRect(0,0,canvas.width,canvas.height);
     ctx.drawImage(image,0,0,canvas.width,canvas.height);
   }finally{image.close();}
   for(const quality of [0.85,0.68,0.5,0.32]){
     const jpeg=canvas.toDataURL('image/jpeg',quality).split(',')[1];
     if(jpeg.length<=460000)return jpeg;
   }
   throw Error('One of your photos is too large. Try a smaller photo.');
 }

 if(form)form.addEventListener('submit',async event=>{event.preventDefault();if(!form.reportValidity())return;const button=form.querySelector('button[type=submit]');button.disabled=true;status.textContent='Submitting your review…';try{const data=Object.fromEntries(new FormData(form));delete data.photos;const photos=[];for(const file of photoInput?.files??[])photos.push(await preparePhoto(file));if(photos.length)data.photos=photos;data.rating=Number(data.rating);data.consent=form.elements.consent.checked;const r=await fetch('/api/reviews',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await r.json();if(!r.ok)throw Error(result.error||'Your review could not be saved.');form.reset();photoInput?.setCustomValidity('');status.textContent='Thank you! Your review has been saved and is awaiting approval before publication.';}catch(e){status.textContent=e.message;}finally{button.disabled=false;}});
 if(!admin)fetch('/api/reviews?admin=1',{cache:'no-store'}).then(r=>{if(r.ok)document.querySelector('#manage-reviews').hidden=false;}).catch(()=>{});
 load();
})();
