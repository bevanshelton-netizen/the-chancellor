class IzakhonoPayError extends Error {
  constructor(message,{status=500,code='izakhono_pay_error',details=null}={}){
    super(message);this.name='IzakhonoPayError';this.status=status;this.code=code;this.details=details;
  }
}

function text(value,name){const v=String(value||'').trim();if(!v)throw new IzakhonoPayError(`${name} is not configured`,{status:503,code:'misconfigured'});return v;}
function httpsUrl(value,name){const raw=text(value,name);let url;try{url=new URL(raw)}catch{throw new IzakhonoPayError(`${name} must be a valid URL`,{status:503,code:'misconfigured'})}if(url.protocol!=='https:'||url.username||url.password)throw new IzakhonoPayError(`${name} must be a clean HTTPS URL`,{status:503,code:'misconfigured'});return url.toString().replace(/\/$/,'');}

function configured(){return Boolean(String(process.env.IZAKHONO_PAY_URL||'').trim()&&String(process.env.IZAKHONO_PAY_API_KEY||'').trim());}

async function request(path,{method='GET',body,idempotencyKey}={}){
  const base=httpsUrl(process.env.IZAKHONO_PAY_URL,'IZAKHONO_PAY_URL');
  const key=text(process.env.IZAKHONO_PAY_API_KEY,'IZAKHONO_PAY_API_KEY');
  const headers={accept:'application/json','x-izakhono-key':key,'x-izakhono-app':'the-chancellor'};
  if(body!==undefined)headers['content-type']='application/json';
  if(idempotencyKey)headers['idempotency-key']=String(idempotencyKey);
  let response;
  try{response=await fetch(`${base}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'error'});}catch(error){throw new IzakhonoPayError('IZAKHONO PAY is temporarily unreachable',{status:503,code:'portal_unreachable',details:error?.message||null});}
  const payload=await response.json().catch(()=>null);
  if(!response.ok||!payload?.ok)throw new IzakhonoPayError(payload?.error?.message||`IZAKHONO PAY rejected the request (${response.status})`,{status:response.status,code:payload?.error?.code||'portal_error',details:payload});
  return payload;
}

async function createIntent({amountMinor,email,description,metadata={},idempotencyKey,returnUrl,cancelUrl,provider='payfast'}){
  if(!Number.isSafeInteger(amountMinor)||amountMinor<=0)throw new IzakhonoPayError('Invalid payment amount',{status:422,code:'invalid_amount'});
  const payload=await request('/api/v1/intents',{method:'POST',idempotencyKey,body:{amount_minor:amountMinor,currency:'ZAR',email,description,provider,return_url:returnUrl,cancel_url:cancelUrl,metadata}});
  const intent=payload.intent;
  if(!intent?.id||!intent?.checkout_url)throw new IzakhonoPayError('IZAKHONO PAY returned an incomplete checkout intent',{status:502,code:'bad_gateway_response'});
  return intent;
}

async function getIntent(intentId){const id=encodeURIComponent(text(intentId,'intentId'));const payload=await request(`/api/v1/intents/${id}`);return payload.intent;}

module.exports={IzakhonoPayError,configured,createIntent,getIntent};
