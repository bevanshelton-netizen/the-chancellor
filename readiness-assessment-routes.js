const store=require('./store');
const {normalise,hashSecret,accessCode,cleanPublicAudit}=require('./core');
const {scoreReadiness,publicDefinition}=require('./readiness-engine');

module.exports=function registerReadinessAssessmentRoutes(app){
  app.get('/api/readiness/definition',(_req,res)=>{
    res.setHeader('Cache-Control','no-store');
    res.json({ok:true,maxScore:90,price:500,currency:'ZAR',sections:publicDefinition()});
  });

  app.post('/api/readiness/preview',(req,res)=>{
    const result=scoreReadiness(req.body||{});
    res.json({ok:true,score:result.score,maxScore:90,readinessPercent:result.readinessPercent,band:result.band,bandCode:result.bandCode,bandTone:result.bandTone,bandMeaning:result.bandMeaning,sections:result.sections,priorities:result.priorities,recommendations:result.recommendations});
  });

  app.post('/api/readiness/submit',(req,res)=>{
    const required=['name','email','phone','businessName','industry','goal'];
    if(required.some(key=>!normalise(req.body?.[key]))) return res.status(400).json({error:'Please complete every required business and contact field.'});
    const answers=req.body.answers&&typeof req.body.answers==='object'?req.body.answers:{};
    const definition=publicDefinition();
    const expected=definition.flatMap(section=>section.questions.map(q=>q.id));
    if(expected.some(id=>answers[id]===undefined||answers[id]===null||String(answers[id]).trim()==='')) return res.status(400).json({error:'Please answer all readiness questions before submitting.'});

    const scoring=scoreReadiness({answers});
    const code=accessCode();
    const audit=store.insert('audits',{
      name:normalise(req.body.name),
      email:normalise(req.body.email).toLowerCase(),
      phone:normalise(req.body.phone),
      businessName:normalise(req.body.businessName),
      registrationNumber:normalise(req.body.registrationNumber),
      industry:normalise(req.body.industry),
      goal:normalise(req.body.goal),
      answers,
      assessmentType:'Business Readiness 90',
      ...scoring,
      status:'Awaiting payment',
      salesStage:'Audit lead',
      recommendedService:scoring.recommendations[0]?.service||'',
      quoteAmount:0,
      nextAction:'Complete R500 audit payment',
      accessHash:hashSecret(code),
      notes:[],
      recommendation:scoring.recommendation
    });
    req.session.clientId=audit.id;
    res.status(201).json({ok:true,audit:cleanPublicAudit(audit),accessCode:code,message:'Assessment saved. Complete the R500 payment to unlock the formal readiness report and Growth Desk action plan.'});
  });
};