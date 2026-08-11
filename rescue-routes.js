const crypto = require('node:crypto');

module.exports = function registerRescueRoutes(app, { store, normalise, hashSecret, verifySecret, accessCode }) {
  const safeCase = item => ({ id:item.id, caseNumber:item.caseNumber, type:item.type, name:item.name, email:item.email, phone:item.phone, country:item.country, problem:item.problem, amount:item.amount, income:item.income, expenses:item.expenses, days:item.days, flags:item.flags, triage:item.triage, status:item.status, assignedProfessional:item.assignedProfessional || null, createdAt:item.createdAt, updatedAt:item.updatedAt });

  app.post('/api/rescue/cases', (req, res) => {
    const required = ['name','email','phone','country','type','problem'];
    if (required.some(k => !normalise(req.body[k]))) return res.status(400).json({ error:'Please complete the required rescue information.' });
    const validTypes = ['tax','debt','asset','business','legal'];
    const type = normalise(req.body.type).toLowerCase();
    if (!validTypes.includes(type)) return res.status(400).json({ error:'Choose a valid rescue category.' });
    const code = accessCode();
    const idPart = crypto.randomBytes(3).toString('hex').toUpperCase();
    const item = store.insert('rescueCases', {
      caseNumber:`CR-${new Date().getFullYear()}-${idPart}`,
      type,
      name:normalise(req.body.name).slice(0,120),
      email:normalise(req.body.email).toLowerCase().slice(0,180),
      phone:normalise(req.body.phone).slice(0,60),
      country:normalise(req.body.country).slice(0,80),
      problem:normalise(req.body.problem).slice(0,2500),
      amount:Number(req.body.amount || 0), income:Number(req.body.income || 0), expenses:Number(req.body.expenses || 0), days:req.body.days === '' || req.body.days == null ? null : Number(req.body.days),
      flags:Array.isArray(req.body.flags) ? req.body.flags.map(x=>normalise(x)).slice(0,12) : [],
      triage:req.body.triage && typeof req.body.triage === 'object' ? { score:Number(req.body.triage.score||0), band:normalise(req.body.triage.band).slice(0,40), specialist:normalise(req.body.triage.specialist).slice(0,180), priorities:Array.isArray(req.body.triage.priorities)?req.body.triage.priorities.map(x=>normalise(x).slice(0,300)).slice(0,10):[] } : {},
      status:'New — awaiting case review', accessHash:hashSecret(code), assignedProfessional:null
    });
    req.session.rescueCaseId = item.id;
    res.status(201).json({ caseNumber:item.caseNumber, accessCode:code, status:item.status, message:'Save this access code. It is shown only once.' });
  });

  app.post('/api/rescue/access', (req, res) => {
    const db = store.read(); const email = normalise(req.body.email).toLowerCase(); const code = normalise(req.body.code);
    const item = [...db.rescueCases].reverse().find(x => x.email === email && verifySecret(code, x.accessHash));
    if (!item) return res.status(401).json({ error:'Email or rescue access code is incorrect.' });
    req.session.rescueCaseId = item.id; res.json({ ok:true, case:safeCase(item) });
  });

  app.get('/api/rescue/case', (req, res) => {
    if (!req.session.rescueCaseId) return res.status(401).json({ error:'Rescue case sign-in required.' });
    const item = store.read().rescueCases.find(x=>x.id===req.session.rescueCaseId);
    if (!item) return res.status(404).json({ error:'Rescue case not found.' });
    res.json({ case:safeCase(item) });
  });

  app.post('/api/professionals/apply', (req, res) => {
    const required=['name','email','phone','profession','registrationNumber','regulator','specialities'];
    if(required.some(k=>!normalise(req.body[k]))) return res.status(400).json({ error:'Please complete every professional application field.' });
    const number=`PRO-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    store.insert('professionals',{ applicationNumber:number, name:normalise(req.body.name).slice(0,120), email:normalise(req.body.email).toLowerCase().slice(0,180), phone:normalise(req.body.phone).slice(0,60), profession:normalise(req.body.profession).slice(0,140), registrationNumber:normalise(req.body.registrationNumber).slice(0,120), regulator:normalise(req.body.regulator).slice(0,140), specialities:normalise(req.body.specialities).slice(0,1800), verificationStatus:'Pending verification', active:false });
    res.status(201).json({ applicationNumber:number, status:'Pending verification' });
  });

  app.get('/api/admin/rescue', (req,res) => {
    if (!req.session.admin) return res.status(401).json({ error:'Administrator sign-in required.' });
    const db=store.read();
    res.json({ metrics:{ rescueCases:db.rescueCases.length, critical:db.rescueCases.filter(x=>Number(x.triage?.score)>=80).length, professionals:db.professionals.length, verifiedProfessionals:db.professionals.filter(x=>x.active).length }, rescueCases:db.rescueCases.map(safeCase), professionals:db.professionals.map(({accessHash,...x})=>x) });
  });

  app.patch('/api/admin/rescue/:id', (req,res) => {
    if (!req.session.admin) return res.status(401).json({ error:'Administrator sign-in required.' });
    const patch={}; ['status','assignedProfessional'].forEach(k=>{if(req.body[k]!==undefined)patch[k]=normalise(req.body[k]).slice(0,200)});
    const item=store.update('rescueCases',req.params.id,patch); if(!item)return res.status(404).json({error:'Rescue case not found.'}); res.json({case:safeCase(item)});
  });

  app.patch('/api/admin/professionals/:id', (req,res) => {
    if (!req.session.admin) return res.status(401).json({ error:'Administrator sign-in required.' });
    const patch={}; if(req.body.verificationStatus!==undefined)patch.verificationStatus=normalise(req.body.verificationStatus).slice(0,120); if(req.body.active!==undefined)patch.active=Boolean(req.body.active);
    const item=store.update('professionals',req.params.id,patch); if(!item)return res.status(404).json({error:'Professional application not found.'}); res.json({professional:item});
  });
};
