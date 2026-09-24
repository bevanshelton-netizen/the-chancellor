const OWNED_DEFAULT='https://fabric.izakhonoafrica.co.za'
const EXTERNAL_BRIDGE='https://yfawrenhudjomhnglfhq.supabase.co/functions/v1/izakhono-gateway-event'
const PRODUCT_ORIGIN='https://chancellor.izakhonoafrica.co.za'

const clean=(v,max=500)=>String(v??'').trim().slice(0,max)

async function post(url,body,headers={},timeoutMs=1800){
  const controller=new AbortController()
  const timer=setTimeout(()=>controller.abort(),timeoutMs)
  try{
    const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body),signal:controller.signal})
    const data=await r.json().catch(()=>({}))
    if(r.ok||r.status===202)return {ok:true,status:r.status,...data}
    return {ok:false,status:r.status,error:data?.error||'APP FABRIC rejected event'}
  }catch(error){
    return {ok:false,status:null,error:error?.name==='AbortError'?'timeout':String(error?.message||error)}
  }finally{clearTimeout(timer)}
}

async function emitLead({subjectRef,name,email,phone,businessName,role='business contact',source='the-chancellor',title='The Chancellor opportunity',value=0,note=''}) {
  const owned=clean(process.env.IZAKHONO_FABRIC_URL||OWNED_DEFAULT).replace(/\/$/,'')
  const token=clean(process.env.IZAKHONO_FABRIC_INTERNAL_TOKEN||'',1000)
  const body={
    platform_id:'the-chancellor',
    event_type:'lead.created',
    subject_ref:clean(subjectRef,180),
    contact:{name:clean(name,200),email:clean(email,320).toLowerCase(),phone:clean(phone,80),company:clean(businessName,200),role:clean(role,120),source:clean(source,120)},
    opportunity:{title:clean(title,240),value:Number.isFinite(Number(value))?Number(value):0,currency:'ZAR',source:clean(source,120)},
    note:clean(note,1000)
  }
  if(!body.subject_ref)return {ok:false,error:'subject_ref_required'}
  const primary=token
    ? await post(owned+'/api/fabric/event',body,{authorization:'Bearer '+token})
    : await post(owned+'/api/fabric/intake',body,{origin:PRODUCT_ORIGIN})
  if(primary.ok)return {...primary,route:'owned-primary'}
  const external=await post(EXTERNAL_BRIDGE,{...body,fabric_bridge:true},{origin:PRODUCT_ORIGIN},3000)
  if(external.ok)return {...external,route:'external-resilience',primary_error:primary.error}
  return {ok:false,route:'unavailable',primary_error:primary.error,external_error:external.error}
}

module.exports={emitLead,OWNED_DEFAULT,EXTERNAL_BRIDGE}
