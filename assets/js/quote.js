const form=document.querySelector('#quote-form');
const service=document.querySelector('#service');
const cabinets=document.querySelector('#cabinet-fields');
const photos=document.querySelector('#photos');
const photoStatus=document.querySelector('#photo-status');
const message=document.querySelector('#form-message');
const submit=form?.querySelector('button[type="submit"]');
service?.addEventListener('change',()=>{cabinets.hidden=service.value!=='Cabinet Refinishing'});
photos?.addEventListener('change',()=>{const count=photos.files.length;if(count>10){photos.value='';photoStatus.textContent='Please choose no more than 10 photos.';return}photoStatus.textContent=count?`${count} photo${count===1?'':'s'} selected`:'Choose photos from your phone or computer'});
form?.addEventListener('submit',async event=>{
  event.preventDefault();
  if(photos.files.length>10){message.textContent='Please choose no more than 10 photos.';return}
  submit.disabled=true;submit.textContent='Sending…';message.textContent='Uploading your request securely…';
  try{
    const response=await fetch('/api/quote-request',{method:'POST',body:new FormData(form)});
    const result=await response.json();
    if(!response.ok||!result.ok)throw new Error(result.error||'Unable to send your request.');
    form.reset();cabinets.hidden=true;photoStatus.textContent='Choose photos from your phone or computer';
    message.innerHTML='<strong>Request received.</strong> Thank you. I’ll review your project details and get in touch.';
    message.scrollIntoView({behavior:'smooth',block:'center'});
  }catch(error){message.textContent=error.message||'Unable to send your request. Please try again.';message.scrollIntoView({behavior:'smooth',block:'center'});
  }finally{submit.disabled=false;submit.textContent='Send Quote Request'}
});
