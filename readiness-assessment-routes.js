const store=require('./store');
const {normalise,hashSecret,accessCode,cleanPublicAudit}=require('./core');
const {ANSWER_OPTIONS,scoreReadiness,publicDefinition}=require('./readiness-engine');

function leadClassification(body={},scoring={}){
  const challenge=normalise(body.primaryChallenge).toLowerCase();
  const funding=normalise(body.fundingNeed).toLowerCase();
  const turnover=normalise(body.turnoverBand).toLowerCase();
  const intent=normalise(body.implementationIntent).toLowerCase();
  if(/cash|debt|tax|creditor|struggl|rescue/.test(challenge)) return 'STABILISATION LEAD';
  if((funding && !['no','not currently'].includes(funding)) || /fund/.test(challenge)) return 'FUNDING LEAD';
  if(/website|digital|online|automation/.test(challenge)) return 'DIGITAL GROWTH LEAD';
  if(/r0|idea|pre-revenue|not trading/.test(turnover)) return 'EARLY-STAGE LEAD';
  if(intent==='yes' || Number(scoring.readinessPercent||0)>=70) return 'HOT IMPLEMENTATION LEAD';
  return 'GROWTH LEAD';
}

module.exports=function registerReadinessAssessmentRoutes(app){
  app.get('/api/readiness/definition',(_req,res)=>{
    res.setHeader('Cache-Control','no-store');
    res.json({ok:true,maxScore:225,price:500,currency:'ZAR',options:ANSWER_OPTIONS,sections:publicDefinition()});
  });

  app.post('/api/readiness/preview',(req,res)=>{
    const result=scoreReadiness(req.body||{});
    res.json({ok:true,score:result.score,maxScore:225,readinessPercent:result.readinessPercent,band:result.band,bandCode:result.bandCode,bandTone:result.bandTone,bandMeaning:result.bandMeaning,sections:result.sections,priorities:result.priorities,recommendations:result.recommendations,biggestRisk:result.biggestRisk,biggestOpportunity:result.biggestOpportunity,priorityIntervention:result.priorityIntervention});
  });

  app.post('/api/readiness/submit',(req,res)=>{
    const required=['name','email','phone','businessName','industry','goal'];
    if(required.some(key=>!normalise(req.body?.[key]))) return res.status(400).json({error:'Please complete every required business and contact field.'});
    const answers=req.body.answers&&typeof req.body.answers==='object'?req.body.answers:{};
    const definition=publicDefinition();
    const expected=definition.flatMap(section=>section.questions.map(q=>q.id));
    if(expected.some(id=>answers[id]===undefined||answers[id]===null||String(answers[id]).trim()==='')) return res.status(400).json({error:'Please answer all Business Readiness Audit questions before submitting.'});

    const scoring=scoreReadiness({
      answers,
      goal:req.body.goal,
      primaryGoal:req.body.goal,
      primaryChallenge:req.body.primaryChallenge,
      fundingNeed:req.body.fundingNeed
    });
    const leadClass=leadClassification(req.body,scoring);
    const code=accessCode();
    const audit=store.insert('audits',{
      name:normalise(req.body.name),
      email:normalise(req.body.email).toLowerCase(),
      phone:normalise(req.body.phone),
      businessName:normalise(req.body.businessName),
      registrationNumber:normalise(req.body.registrationNumber),
      industry:normalise(req.body.industry),
      goal:normalise(req.body.goal),
      primaryChallenge:normalise(req.body.primaryChallenge),
      turnoverBand:normalise(req.body.turnoverBand),
      fundingNeed:normalise(req.body.fundingNeed),
      implementationIntent:normalise(req.body.implementationIntent),
      answers,
      assessmentType:'Business Readiness 225',
      ...scoring,
      leadClassification:leadClass,
      status:'Awaiting payment',
      salesStage:'Audit lead',
      recommendedService:scoring.recommendations[0]?.service||'',
      quoteAmount:scoring.recommendations[0]?.indicativeFrom||0,
      nextAction:'Complete R500 Business Readiness Audit payment',
      accessHash:hashSecret(code),
      notes:[],
      recommendation:scoring.recommendation
    });
    req.session.clientId=audit.id;
    res.status(201).json({ok:true,audit:cleanPublicAudit(audit),accessCode:code,message:'Preliminary score saved. Complete the R500 payment to unlock the formal Business Readiness Report and Growth Desk action plan.'});
  });
};
