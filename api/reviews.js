module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const fail=(code,error)=>res.status(code).json({error});
 if(!['GET','POST'].includes(req.method))return fail(405,'Method not allowed.');
 if(req.query?.admin)return fail(403,'Manage reviews in the private owner dashboard.');
 const token=process.env.HOLOSTASIS_REVIEWS_TOKEN;
 if(!token)return fail(503,'Reviews are temporarily unavailable. Please try again later.');
 const backend='https://holostasis-automotive-draft.rifejade.chatgpt.site';
 let body;
 if(req.method==='POST'){
  let origin;try{origin=new URL(req.headers.origin).host;}catch{return fail(403,'Please submit from the website.');}
  if(origin!==req.headers.host)return fail(403,'Please submit from the website.');
  try{const d=typeof req.body==='string'?JSON.parse(req.body):req.body;if(!d||d.action)return fail(403,'Review management is available only in the private dashboard.');body=JSON.stringify({name:d.name,service:d.service,rating:d.rating,body:d.body,consent:d.consent,website:d.website});if(body.length>6000)return fail(413,'Your review is too long.');}catch{return fail(400,'Please check your review.');}
 }
 try{
  const result=await fetch(backend+'/api/reviews',{method:req.method,headers:{'OAI-Sites-Authorization':'Bearer '+token,'Content-Type':'application/json',...(req.method==='POST'?{Origin:backend}:{})},...(body?{body}:{}),signal:AbortSignal.timeout(15000),redirect:'error'});
  if(!result.headers.get('content-type')?.includes('application/json')){console.warn('Review upstream',result.status,result.headers.get('content-type'),(await result.text()).slice(0,160));return fail(502,'Reviews are temporarily unavailable.');}
  res.status(result.status).json(await result.json());
 }catch{return fail(502,'Reviews are temporarily unavailable. Please try again.');}
};