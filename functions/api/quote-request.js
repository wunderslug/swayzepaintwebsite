const MAX_PHOTOS=10;
const MAX_FILE_SIZE=15*1024*1024;
const ALLOWED_TYPES=new Set(['image/jpeg','image/png','image/webp','image/avif']);
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function text(v,max=5000){return String(v||'').trim().slice(0,max)}
function ext(file){return({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'})[file.type]||'bin'}
function required(form,name,label,max=500){const value=text(form.get(name),max);if(!value)throw new Error(`${label} is required.`);return value}
export async function onRequestPost({request,env}){
  if(!env.QUOTE_BUCKET)return json({ok:false,error:'Quote storage is unavailable.'},500);
  let form;try{form=await request.formData()}catch{return json({ok:false,error:'Invalid form submission.'},400)}
  try{
    const name=required(form,'name','Name',150),phone=required(form,'phone','Phone',100),email=required(form,'email','Email',254),location=required(form,'location','Town / job location',250),service=required(form,'service','Service',100),description=required(form,'description','Project description',5000);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json({ok:false,error:'Enter a valid email address.'},400);
    const files=form.getAll('photos').filter(v=>v instanceof File&&v.size>0);
    if(files.length>MAX_PHOTOS)return json({ok:false,error:`Please upload no more than ${MAX_PHOTOS} photos.`},400);
    for(const file of files){if(!ALLOWED_TYPES.has(file.type))return json({ok:false,error:'Photos must be JPEG, PNG, WebP, or AVIF.'},415);if(file.size>MAX_FILE_SIZE)return json({ok:false,error:'Each photo must be 15 MB or smaller.'},413)}
    const id=crypto.randomUUID(),createdAt=new Date().toISOString(),prefix=`requests/${createdAt.slice(0,10)}/${id}`;
    const photoRecords=[];
    for(let i=0;i<files.length;i++){const file=files[i],key=`${prefix}/photos/${String(i+1).padStart(2,'0')}-${crypto.randomUUID()}.${ext(file)}`;await env.QUOTE_BUCKET.put(key,file.stream(),{httpMetadata:{contentType:file.type},customMetadata:{requestId:id,originalName:text(file.name,200),uploadedAt:createdAt}});photoRecords.push({key,name:text(file.name,200),type:file.type,size:file.size})}
    const record={id,createdAt,status:'new',name,phone,email,location,service,description,contactMethod:text(form.get('contact_method'),100),timeframe:text(form.get('timeframe'),100),cabinetDoors:text(form.get('cabinet_doors'),20),cabinetDrawers:text(form.get('cabinet_drawers'),20),photos:photoRecords};
    await env.QUOTE_BUCKET.put(`${prefix}/request.json`,JSON.stringify(record,null,2),{httpMetadata:{contentType:'application/json'}});
    return json({ok:true,requestId:id,message:'Quote request received.'},201);
  }catch(error){return json({ok:false,error:String(error?.message||'Unable to submit quote request.')},400)}
}
export function onRequestGet(){return json({ok:true,endpoint:'quote-request',maxPhotos:MAX_PHOTOS,maxPhotoBytes:MAX_FILE_SIZE})}
