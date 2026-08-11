const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const store=require('./store');
const {normalise}=require('./core');
const {syncPaidAssignments}=require('./delivery-core');

const requireAdmin=(req,res,next)=>req.session?.admin?next():res.status(401).json({error:'Administrator sign-in required.'});
const requireClient=(req,res,next)=>req.session?.clientId?next():res.status(401).json({error:'Please sign in to continue.'});
const deliverablesDir=path.join(process.env.DATA_DIR||path.join(__dirname,'data'),'deliverables');
fs.mkdirSync(deliverablesDir,{recursive:true});

const blueprints={
  'profile-revamp':['Executive profile','Company overview','Vision, mission and values','Products and services','Core capabilities','Leadership','Track record and differentiators','Compliance and credentials','Contact details'],
  'new-profile':['Executive profile','Company overview','Vision, mission and values','Products and services','Target markets','Core capabilities','Leadership','Competitive positioning','Compliance and credentials','Contact details'],
  'capability':['Company snapshot','Core capabilities','Relevant experience','Delivery capacity','Differentiators','Compliance','Contact details'],
  'marketing-plan':['Executive summary','Market position','Target customers','Value proposition','Competitor landscape','Marketing channels','Sales funnel','90-day action plan','KPIs and budget priorities'],
  'business-proposal':['Executive summary','Client need / opportunity','Proposed solution','Scope of work','Delivery approach','Timeline','Commercials','Why this business','Next steps'],
  'business-plan':['Executive summary','Business overview','Problem and opportunity','Products / services','Market analysis','Business model','Marketing and sales','Operations','Management and governance','Financial narrative','Funding / growth requirement','Risk and mitigation','Implementation roadmap'],
  'funding-proposal':['Executive summary','Funding request','Business case','Market opportunity','Use of funds','Implementation plan','Management capability','Financial narrative','Repayment / return logic where applicable','Risk and mitigation','Supporting evidence required'],
  'investor-pitch':['Investment thesis','Problem','Solution','Market opportunity','Business model','Traction','Competitive advantage','Go-to-market','Team','Financial story','Investment ask','Use of funds','Milestones'],
  'tender-support':['Bid summary','Requirement interpretation','Mandatory compliance checklist','Capability response','Methodology','Resources and capacity','Relevant experience','Risk controls','Pricing narrative','Submission checklist'],
  'retainer-starter':['Current position','Priority objectives','30-day actions','Sales and positioning actions','Document priorities','Management cadence'],
  'retainer-growth':['Current position','Growth objectives','90-day growth plan','Sales pipeline priorities','Marketing priorities','Operational improvements','Management cadence','KPIs'],
  'retainer-executive':['Executive situation','Strategic priorities','Growth and capital agenda','Commercial priorities','Operational priorities','Leadership actions','Risk register','Board / management cadence','Executive KPIs']
};

function assignmentContext(assignment){
  const db=store.read();
  const audit=(db.audits||[]).find(a=>a.id===assignment.auditId)||{};
  const offer=(db.offers||[]).find(o=>o.id===assignment.offerId)||{};
  const sourceFiles=(db.files||[]).filter(f=>f.auditId===assignment.auditId).map(f=>f.originalName);
  return {audit,offer,sourceFiles};
}
function ensureProduction(assignment){
  const db=store.read();
  const existing=(db.productions||[]).find(p=>p.assignmentId===assignment.id);
  if(existing)return existing;
  return store.insert('productions',{assignmentId:assignment.id,auditId:assignment.auditId,offerId:assignment.offerId,status:'Briefing',brief:'',reviewNotes:'',currentVersionId:null,versions:[],finalisedVersionId:null,finalDeliverableId:null});
}
function latestVersion(production){return (production.versions||[]).find(v=>v.id===production.currentVersionId)||(production.versions||[]).slice(-1)[0]||null;}
function addVersion(production,text,kind,author){
  const versions=[...(production.versions||[])];
  const version={id:`ver_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`,number:versions.length+1,kind,author,text:String(text||'').slice(0,120000),createdAt:new Date().toISOString()};
  versions.push(version);
  return store.update('productions',production.id,{versions,currentVersionId:version.id,status:'Human review'});
}
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function inline(text){return esc(text).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');}
function markdownBody(md){
  const lines=String(md||'').split(/\r?\n/);let list=false,out='';
  for(const raw of lines){const line=raw.trimEnd();
    if(/^###\s+/.test(line)){if(list){out+='</ul>';list=false}out+=`<h3>${inline(line.replace(/^###\s+/,''))}</h3>`;continue}
    if(/^##\s+/.test(line)){if(list){out+='</ul>';list=false}out+=`<h2>${inline(line.replace(/^##\s+/,''))}</h2>`;continue}
    if(/^#\s+/.test(line)){if(list){out+='</ul>';list=false}out+=`<h1>${inline(line.replace(/^#\s+/,''))}</h1>`;continue}
    if(/^[-*]\s+/.test(line)){if(!list){out+='<ul>';list=true}out+=`<li>${inline(line.replace(/^[-*]\s+/,''))}</li>`;continue}
    if(list){out+='</ul>';list=false}
    if(!line.trim()){out+='<div class="spacer"></div>';continue}
    out+=`<p>${inline(line)}</p>`;
  }
  if(list)out+='</ul>';return out;
}
function brandedHtml(assignment,audit,version){
  const date=new Date().toLocaleDateString('en-ZA',{year:'numeric',month:'long',day:'numeric'});
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(assignment.service)} · ${esc(audit.businessName||'Client')}</title><style>@page{margin:20mm}*{box-sizing:border-box}body{margin:0;background:#f5f1e8;color:#19150f;font-family:Georgia,'Times New Roman',serif;line-height:1.55}.cover{min-height:92vh;padding:70px;display:flex;flex-direction:column;justify-content:center;background:#0a0907;color:#f3ead7;border:12px solid #b99452}.brand{letter-spacing:.22em;text-transform:uppercase;color:#d2b26f;font:700 12px Arial,sans-serif}.cover h1{font-size:46px;line-height:1.05;margin:18px 0}.cover h2{font-weight:400;color:#d8c7a5}.meta{margin-top:40px;color:#bdb4a5}.document{max-width:900px;margin:0 auto;background:white;padding:70px}.document h1,.document h2,.document h3{color:#6f541f}.document h1{font-size:34px;border-bottom:2px solid #c6a35e;padding-bottom:12px}.document h2{margin-top:36px}.document p{margin:12px 0}.document li{margin:7px 0}.spacer{height:8px}.footer{border-top:1px solid #c7bda9;margin-top:50px;padding-top:18px;color:#777;font:11px Arial,sans-serif}.notice{background:#fff8e7;border-left:4px solid #b99452;padding:12px 16px;margin:22px 0;font:12px Arial,sans-serif}@media print{body{background:white}.cover{page-break-after:always}.document{padding:0}}</style></head><body><section class="cover"><div class="brand">The Chancellor’s Business Growth Desk</div><h1>${esc(assignment.service)}</h1><h2>${esc(audit.businessName||'Client')}</h2><div class="meta">Prepared ${esc(date)}<br>Build. Position. Fund. Grow.<br>Powered by Izakhono Africa</div></section><main class="document"><div class="notice">Human-reviewed Growth Desk document. Any facts, figures, registrations, compliance claims or financial assumptions should be verified against client source material before external submission.</div>${markdownBody(version.text)}<div class="footer">The Chancellor’s Business Growth Desk · Powered by Izakhono Africa · Professional preparation and business-growth support. No guarantee of funding, tenders, contracts or investment.</div></main></body></html>`;
}
function sourcePack(assignment,production){
  const {audit,offer,sourceFiles}=assignmentContext(assignment);
  const checklist=(assignment.checklist||[]).map(x=>`${x.label}: ${x.status}`).join('\n');
  return {audit,offer,sourceFiles,prompt:`SERVICE: ${assignment.service}\nBUSINESS: ${audit.businessName||''}\nCLIENT: ${audit.name||''}\nINDUSTRY: ${audit.industry||''}\nCLIENT GOAL: ${audit.goal||''}\nREADINESS SCORE: ${audit.score||0}/100 (${audit.band||''})\nOFFER SCOPE: ${offer.description||''}\nDELIVERABLES AGREED: ${offer.deliverables||''}\nPRODUCTION BRIEF / VERIFIED NOTES: ${production.brief||''}\nCHECKLIST STATUS:\n${checklist||'No checklist data'}\nSOURCE FILE NAMES AVAILABLE TO HUMAN REVIEWER: ${sourceFiles.join(', ')||'None listed'}\n\nImportant: file names above are metadata only; you have NOT read their contents.`};
}
async function aiDraft(assignment,production,revisionInstruction=''){
  if(!process.env.OPENAI_API_KEY)throw new Error('AI drafting is not configured on this deployment. You can still write and save a human draft.');
  const pack=sourcePack(assignment,production);
  const sections=blueprints[assignment.code]||['Executive summary','Background','Recommended approach','Implementation','Next steps'];
  const current=latestVersion(production);
  const task=current&&revisionInstruction?`Revise the CURRENT DRAFT using the REVISION INSTRUCTION. Preserve verified facts and improve only what is needed.\n\nREVISION INSTRUCTION:\n${revisionInstruction}\n\nCURRENT DRAFT:\n${current.text}`:`Create a strong first draft for this paid ${assignment.service}. Use these sections as a sensible structure: ${sections.join('; ')}.`;
  const instructions=`You are the production drafting engine for The Chancellor's Business Growth Desk. Produce professional South African business material in polished, human business English. Never invent facts, registrations, clients, contracts, turnover, financial figures, compliance status, market statistics or credentials. When information is missing, write [CLIENT INPUT REQUIRED: describe exactly what is missing]. Distinguish verified client information from recommendations. Do not promise funding, tenders, contracts or investment. Return Markdown only, with clear headings and useful prose. This is an AI draft for mandatory human review before release.`;
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',instructions,input:`${pack.prompt}\n\n${task}`})});
  if(!response.ok)throw new Error('AI drafting service is temporarily unavailable.');
  const result=await response.json();
  const text=normalise(result.output_text||'');
  if(!text)throw new Error('The drafting service returned an empty draft.');
  return text;
}

module.exports=function registerProductionRoutes(app){
  app.get('/api/admin/production',requireAdmin,(_req,res)=>{
    syncPaidAssignments();const db=store.read();const assignments=db.assignments||[];
    const rows=assignments.map(a=>{const production=ensureProduction(a);const context=assignmentContext(a);const feedback=(store.read().productionFeedback||[]).filter(f=>f.assignmentId===a.id);return {assignment:a,production,audit:{name:context.audit.name,businessName:context.audit.businessName,email:context.audit.email,phone:context.audit.phone,industry:context.audit.industry,goal:context.audit.goal},sourceFiles:context.sourceFiles,feedback};});
    const productions=rows.map(x=>x.production);res.json({metrics:{total:productions.length,briefing:productions.filter(p=>p.status==='Briefing').length,review:productions.filter(p=>p.status==='Human review').length,finalised:productions.filter(p=>p.status==='Finalised').length},rows,aiConfigured:Boolean(process.env.OPENAI_API_KEY)});
  });

  app.patch('/api/admin/production/:assignmentId',requireAdmin,(req,res)=>{
    const db=store.read();const assignment=(db.assignments||[]).find(a=>a.id===req.params.assignmentId);if(!assignment)return res.status(404).json({error:'Assignment not found.'});const production=ensureProduction(assignment);const patch={};
    if(req.body.brief!==undefined)patch.brief=normalise(req.body.brief).slice(0,12000);
    if(req.body.reviewNotes!==undefined)patch.reviewNotes=normalise(req.body.reviewNotes).slice(0,8000);
    const updated=store.update('productions',production.id,patch);res.json({production:updated});
  });

  app.post('/api/admin/production/:assignmentId/generate',requireAdmin,async(req,res)=>{
    try{const db=store.read();const assignment=(db.assignments||[]).find(a=>a.id===req.params.assignmentId);if(!assignment)return res.status(404).json({error:'Assignment not found.'});let production=ensureProduction(assignment);if(req.body.brief!==undefined)production=store.update('productions',production.id,{brief:normalise(req.body.brief).slice(0,12000)});const text=await aiDraft(assignment,production);const updated=addVersion(production,text,'AI first draft','The Chancellor AI');store.update('assignments',assignment.id,{status:'In production',progress:50,clientMessage:'Your assignment is in production and undergoing human review.'});store.update('audits',assignment.auditId,{salesStage:'In delivery',nextAction:`Human review of ${assignment.service} draft`});res.json({production:updated,version:latestVersion(updated)});}catch(error){res.status(502).json({error:error.message||'Draft could not be generated.'})}
  });

  app.post('/api/admin/production/:assignmentId/revise',requireAdmin,async(req,res)=>{
    try{const db=store.read();const assignment=(db.assignments||[]).find(a=>a.id===req.params.assignmentId);if(!assignment)return res.status(404).json({error:'Assignment not found.'});let production=ensureProduction(assignment);if(!latestVersion(production))return res.status(409).json({error:'Create or save a draft before requesting a revision.'});const instruction=normalise(req.body.instruction).slice(0,6000);if(!instruction)return res.status(400).json({error:'Enter revision instructions.'});const text=await aiDraft(assignment,production,instruction);const updated=addVersion(production,text,'AI revision','The Chancellor AI');res.json({production:updated,version:latestVersion(updated)});}catch(error){res.status(502).json({error:error.message||'Revision could not be generated.'})}
  });

  app.post('/api/admin/production/:assignmentId/save',requireAdmin,(req,res)=>{
    const db=store.read();const assignment=(db.assignments||[]).find(a=>a.id===req.params.assignmentId);if(!assignment)return res.status(404).json({error:'Assignment not found.'});const production=ensureProduction(assignment);const text=String(req.body.text||'').trim();if(text.length<40)return res.status(400).json({error:'The draft is too short to save.'});let updated=addVersion(production,text,'Human edit','Growth Desk reviewer');if(req.body.reviewNotes!==undefined)updated=store.update('productions',updated.id,{reviewNotes:normalise(req.body.reviewNotes).slice(0,8000)});res.json({production:updated,version:latestVersion(updated)});
  });

  app.post('/api/admin/production/:assignmentId/finalise',requireAdmin,(req,res)=>{
    const db=store.read();const assignment=(db.assignments||[]).find(a=>a.id===req.params.assignmentId);if(!assignment)return res.status(404).json({error:'Assignment not found.'});let production=ensureProduction(assignment);const version=latestVersion(production);if(!version)return res.status(409).json({error:'There is no reviewed draft to finalise.'});
    if(production.finalisedVersionId===version.id&&production.finalDeliverableId){const existing=(db.deliverables||[]).find(f=>f.id===production.finalDeliverableId);if(existing)return res.json({production,deliverable:{...existing,storedName:undefined}})}
    const {audit}=assignmentContext(assignment);const html=brandedHtml(assignment,audit,version);const storedName=`${Date.now()}-${crypto.randomBytes(6).toString('hex')}.html`;fs.writeFileSync(path.join(deliverablesDir,storedName),html,'utf8');const record=store.insert('deliverables',{assignmentId:assignment.id,auditId:assignment.auditId,originalName:`${(audit.businessName||'Client').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'')}-${assignment.service.replace(/[^a-z0-9]+/gi,'-')}-Final.html`,storedName,mime:'text/html',size:Buffer.byteLength(html),status:'Available to client'});production=store.update('productions',production.id,{status:'Finalised',finalisedVersionId:version.id,finalDeliverableId:record.id,finalisedAt:new Date().toISOString()});store.update('assignments',assignment.id,{status:'Client review',progress:90,clientMessage:'Your human-reviewed Growth Desk document has been released in the portal. Please review it and send any final feedback.'});store.update('audits',assignment.auditId,{salesStage:'Client review',nextAction:'Client review / final feedback'});res.json({production,deliverable:{...record,storedName:undefined}});
  });

  app.get('/api/client/production',requireClient,(req,res)=>{
    syncPaidAssignments();const db=store.read();const assignments=(db.assignments||[]).filter(a=>a.auditId===req.session.clientId);const rows=assignments.map(a=>{const p=(db.productions||[]).find(x=>x.assignmentId===a.id);const feedback=(db.productionFeedback||[]).filter(f=>f.assignmentId===a.id).map(f=>({id:f.id,text:f.text,createdAt:f.createdAt,status:f.status}));return {assignmentId:a.id,service:a.service,status:p?.status||'Briefing',versionCount:p?.versions?.length||0,finalisedAt:p?.finalisedAt||null,feedback}});res.json({rows});
  });

  app.post('/api/client/assignments/:assignmentId/feedback',requireClient,(req,res)=>{
    const db=store.read();const assignment=(db.assignments||[]).find(a=>a.id===req.params.assignmentId&&a.auditId===req.session.clientId);if(!assignment)return res.status(404).json({error:'Assignment not found.'});const text=normalise(req.body.text).slice(0,4000);if(text.length<5)return res.status(400).json({error:'Please enter your feedback.'});const item=store.insert('productionFeedback',{assignmentId:assignment.id,auditId:assignment.auditId,text,status:'New',source:'Client portal'});store.update('assignments',assignment.id,{status:'Client review',progress:90,clientMessage:'Thank you. Your feedback has been received and is awaiting Growth Desk review.'});store.update('audits',assignment.auditId,{salesStage:'Client feedback',nextAction:`Review client feedback on ${assignment.service}`});res.status(201).json({feedback:item});
  });
};
