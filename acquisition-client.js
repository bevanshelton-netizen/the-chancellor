(()=>{
const KEY='chancellor_acquisition_v1',VISITOR='chancellor_visitor_id';
const clean=v=>String(v||'').trim().slice(0,300);
const id=()=>{let v=localStorage.getItem(VISITOR);if(!v){v=`vis_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,10)}`;localStorage.setItem(VISITOR,v)}return v};
const params=new URLSearchParams(location.search);
function queryTouch(){
  const source=clean(params.get('utm_source')||params.get('source'));
  const medium=clean(params.get('utm_medium')||params.get('medium'));
  const campaign=clean(params.get('utm_campaign')||params.get('campaign'));
  const content=clean(params.get('utm_content'));
  const term=clean(params.get('utm_term'));
  const referralCode=clean(params.get('ref')||params.get('referral'));
  return {source:source||'direct',medium:medium||'none',campaign:campaign||'organic',content,term,referralCode,landingPath:location.pathname+location.search,referrer:document.referrer||''};
}
let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')}catch{}
const incoming=queryTouch();
const meaningful=incoming.source!=='direct'||incoming.campaign!=='organic'||incoming.referralCode;
if(!saved.firstTouch)saved.firstTouch=incoming;
if(meaningful||!saved.lastTouch)saved.lastTouch=incoming;
localStorage.setItem(KEY,JSON.stringify(saved));
const visitorId=id(),touch=saved.lastTouch||incoming;
async function send(event,extra={}){try{await fetch('/api/acquisition/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitorId,event,touch,...extra}),keepalive:true})}catch{}}
async function linkAudit(){try{await fetch('/api/acquisition/link-audit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitorId})})}catch{}}
window.ChancellorAcquisition={visitorId,touch,track:send,linkAudit,firstTouch:saved.firstTouch};
const pageKey=`acq_page_${location.pathname}_${location.search}`;if(!sessionStorage.getItem(pageKey)){sessionStorage.setItem(pageKey,'1');send('page_view')}
let chatTracked=false,auditTracked=false;
function chat(){if(chatTracked)return;chatTracked=true;send('conversation_started',{label:'The Chancellor chat'})}
function audit(){if(auditTracked)return;auditTracked=true;send('audit_started',{label:'R500 Business Readiness Audit'})}
document.addEventListener('submit',e=>{if(e.target?.id==='chatForm')chat();if(e.target?.id==='auditForm')audit()});
document.addEventListener('click',e=>{const el=e.target.closest('a,button');if(!el)return;const href=el.getAttribute('href')||'';const text=clean(el.textContent);if(href.includes('#adviser')||el.closest('#adviser')){if(href.includes('#adviser'))send('campaign_cta',{label:text,href});}if(href.includes('#audit')){audit();send('campaign_cta',{label:text,href})}if(/whatsapp|wa\.me/i.test(href)){send('whatsapp_click',{label:text,href})}});
const af=document.querySelector('#auditForm');if(af)af.addEventListener('focusin',audit,{once:true});
})();
