const store=require('./store');
const {normalise}=require('./core');

const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n||0)));
const round=n=>Math.round(Number(n||0)*10)/10;
const db=()=>store.read();

function professionalStats(professionalId){
  const d=db();
  const cases=(d.rescueCases||[]).filter(c=>c.assignedProfessionalId===professionalId||c.previousProfessionalIds?.includes?.(professionalId));
  const accepted=cases.filter(c=>c.professionalResponse==='Accepted').length;
  const declined=cases.filter(c=>c.professionalResponse==='Declined').length;
  const responded=accepted+declined;
  const resolved=cases.filter(c=>c.status==='Resolved').length;
  const responseHours=cases.filter(c=>c.professionalRespondedAt&&c.assignedAt).map(c=>(new Date(c.professionalRespondedAt)-new Date(c.assignedAt))/3600000).filter(n=>Number.isFinite(n)&&n>=0);
  const avgResponseHours=responseHours.length?responseHours.reduce((a,b)=>a+b,0)/responseHours.length:null;
  const ratings=(d.professionalRatings||[]).filter(r=>r.professionalId===professionalId&&r.status!=='Removed');
  const avgRating=ratings.length?ratings.reduce((s,r)=>s+Number(r.rating||0),0)/ratings.length:null;
  const qualityFlags=(d.professionalQualityFlags||[]).filter(f=>f.professionalId===professionalId&&f.status==='Open');
  const acceptanceRate=responded?accepted/responded:1;
  const resolutionRate=accepted?resolved/accepted:0;
  const responseScore=avgResponseHours==null?70:avgResponseHours<=2?100:avgResponseHours<=6?90:avgResponseHours<=24?75:avgResponseHours<=48?55:35;
  const ratingScore=avgRating==null?75:(avgRating/5)*100;
  const acceptanceScore=acceptanceRate*100;
  const resolutionScore=accepted?resolutionRate*100:70;
  const flagPenalty=Math.min(30,qualityFlags.length*10);
  const score=clamp(ratingScore*.40+responseScore*.20+acceptanceScore*.15+resolutionScore*.25-flagPenalty,0,100);
  return {score:round(score),rating:avgRating==null?null:round(avgRating),ratings:ratings.length,assigned:cases.length,accepted,declined,resolved,acceptanceRate:round(acceptanceRate*100),resolutionRate:round(resolutionRate*100),avgResponseHours:avgResponseHours==null?null:round(avgResponseHours),openQualityFlags:qualityFlags.length};
}

module.exports=function registerReputationRoutes(app){
  app.get('/api/professionals/reputation',(req,res)=>{
    if(!req.session?.professionalId)return res.status(401).json({error:'Professional Network sign-in required.'});
    const pro=(db().professionals||[]).find(p=>p.id===req.session.professionalId);if(!pro)return res.status(404).json({error:'Professional not found.'});
    const stats=professionalStats(pro.id);const ratings=(db().professionalRatings||[]).filter(r=>r.professionalId===pro.id&&r.status!=='Removed').map(r=>({rating:r.rating,comment:r.comment,createdAt:r.createdAt,caseNumber:r.caseNumber}));
    res.json({professionalId:pro.id,performance:stats,ratings});
  });

  app.get('/api/rescue/case-rating',(req,res)=>{
    if(!req.session?.rescueCaseId)return res.status(401).json({error:'Rescue case sign-in required.'});
    const d=db(),item=(d.rescueCases||[]).find(c=>c.id===req.session.rescueCaseId);if(!item)return res.status(404).json({error:'Rescue case not found.'});
    const existing=(d.professionalRatings||[]).find(r=>r.caseId===item.id&&r.clientCaseId===item.id&&r.status!=='Removed');
    res.json({eligible:item.status==='Resolved'&&Boolean(item.assignedProfessionalId),rating:existing||null});
  });

  app.post('/api/rescue/case-rating',(req,res)=>{
    if(!req.session?.rescueCaseId)return res.status(401).json({error:'Rescue case sign-in required.'});
    const d=db(),item=(d.rescueCases||[]).find(c=>c.id===req.session.rescueCaseId);if(!item)return res.status(404).json({error:'Rescue case not found.'});
    if(item.status!=='Resolved'||!item.assignedProfessionalId)return res.status(409).json({error:'A professional can be rated after the Rescue case is resolved.'});
    if((d.professionalRatings||[]).some(r=>r.caseId===item.id&&r.status!=='Removed'))return res.status(409).json({error:'A rating has already been submitted for this case.'});
    const rating=Number(req.body.rating);if(!Number.isInteger(rating)||rating<1||rating>5)return res.status(400).json({error:'Choose a rating from 1 to 5.'});
    const record=store.insert('professionalRatings',{caseId:item.id,clientCaseId:item.id,caseNumber:item.caseNumber,professionalId:item.assignedProfessionalId,professionalName:item.assignedProfessional||'',rating,comment:normalise(req.body.comment).slice(0,1200),status:'Published'});
    store.insert('caseActivity',{caseId:item.id,actorRole:'Client',actorName:item.name||'Client',action:'Professional rated',detail:`${rating}/5`});
    res.status(201).json({rating:record,performance:professionalStats(item.assignedProfessionalId)});
  });

  app.get('/api/admin/reputation',(req,res)=>{
    if(!req.session?.admin)return res.status(401).json({error:'Administrator sign-in required.'});
    const d=db();const professionals=(d.professionals||[]).map(p=>({id:p.id,name:p.name,profession:p.profession,membershipTier:p.membershipTier,verificationStatus:p.verificationStatus,active:p.active,performance:professionalStats(p.id)})).sort((a,b)=>b.performance.score-a.performance.score);
    res.json({professionals,ratings:d.professionalRatings||[],qualityFlags:d.professionalQualityFlags||[]});
  });

  app.post('/api/admin/professionals/:id/quality-flags',(req,res)=>{
    if(!req.session?.admin)return res.status(401).json({error:'Administrator sign-in required.'});
    const pro=(db().professionals||[]).find(p=>p.id===req.params.id);if(!pro)return res.status(404).json({error:'Professional not found.'});
    const reason=normalise(req.body.reason).slice(0,1000);if(!reason)return res.status(400).json({error:'Describe the quality concern.'});
    const flag=store.insert('professionalQualityFlags',{professionalId:pro.id,reason,severity:normalise(req.body.severity||'Review').slice(0,80),status:'Open'});res.status(201).json({flag,performance:professionalStats(pro.id)});
  });

  app.patch('/api/admin/quality-flags/:id',(req,res)=>{
    if(!req.session?.admin)return res.status(401).json({error:'Administrator sign-in required.'});
    const current=(db().professionalQualityFlags||[]).find(f=>f.id===req.params.id);if(!current)return res.status(404).json({error:'Quality flag not found.'});
    const status=normalise(req.body.status);if(!['Open','Resolved','Dismissed'].includes(status))return res.status(400).json({error:'Choose Open, Resolved or Dismissed.'});
    const flag=store.update('professionalQualityFlags',current.id,{status,resolutionNote:normalise(req.body.resolutionNote).slice(0,1000),resolvedAt:status==='Open'?null:new Date().toISOString()});res.json({flag,performance:professionalStats(current.professionalId)});
  });
};

module.exports.professionalStats=professionalStats;
