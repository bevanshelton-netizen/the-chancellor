const crypto = require('node:crypto');

module.exports = function registerRescueRoutes(app, { store, normalise, hashSecret, verifySecret, accessCode }) {
  const safeCase = item => ({ id:item.id, caseNumber:item.caseNumber, type:item.type, name:item.name, email:item.email, phone:item.phone, country:item.country, problem:item.problem, amount:item.amount, income:item.income, expenses:item.expenses, days:item.days, flags:item.flags, triage:item.triage, status:item.status, assignedProfessional:item.assignedProfessional || null, assignedProfessionalId:item.assignedProfessionalId || null, match:item.match || null, createdAt:item.createdAt, updatedAt:item.updatedAt });
  const categoryTerms = {
    tax:['tax','sars','revenue','accountant','tax practitioner','vat','paye'],
    debt:['debt','debt counsellor','ncr','credit','collections','restructuring'],
    asset:['debt','consumer','credit','repossession','vehicle','mortgage','property','attorney','legal'],
    business:['business rescue','turnaround','accountant','insolvency','restructuring','cash flow','commercial'],
    legal:['attorney','legal','litigation','consumer','credit','court','commercial']
  };
  const rankMatches = (caseItem, db) => {
    const active = (db.professionals || []).filter(p => p.active && String(p.verificationStatus || '').toLowerCase() === 'verified');
    const workloads = {};
    (db.rescueCases || []).forEach(c => { if (c.assignedProfessionalId && !['Resolved','Closed'].includes(c.status)) workloads[c.assignedProfessionalId] = (workloads[c.assignedProfessionalId] || 0) + 1; });
    const terms = categoryTerms[caseItem.type] || [];
    return active.map(p => {
      const hay = `${p.profession || ''} ${p.specialities || ''} ${p.rescueTypes || ''}`.toLowerCase();
      let score = 0; const reasons = [];
      const hits = terms.filter(t => hay.includes(t));
      if (hits.length) { score += Math.min(55, 20 + hits.length * 10); reasons.push(`Speciality fit: ${hits.slice(0,3).join(', ')}`); }
      const pCountry = String(p.country || 'South Africa').toLowerCase(); const cCountry = String(caseItem.country || '').toLowerCase();
      if (pCountry && cCountry && (pCountry === cCountry || pCountry.includes('international'))) { score += 20; reasons.push('Jurisdiction fit'); }
      const regions = String(p.regions || p.specialities || '').toLowerCase();
      if (cCountry === 'south africa' && (regions.includes('south africa') || pCountry === 'south africa')) { score += 10; reasons.push('South Africa coverage'); }
      const availability = String(p.availability || 'Available').toLowerCase();
      if (availability.includes('available') || availability.includes('open')) { score += 10; reasons.push('Available for cases'); }
      const load = workloads[p.id] || 0; score += Math.max(0, 15 - load * 5); reasons.push(`${load} active case${load === 1 ? '' : 's'}`);
      return { id:p.id, name:p.name, profession:p.profession, regulator:p.regulator, registrationNumber:p.registrationNumber, country:p.country || 'South Africa', regions:p.regions || '', availability:p.availability || 'Available', workload:load, score:Math.min(100,score), reasons };
    }).filter(x => x.score >= 25).sort((a,b) => b.score - a.score || a.workload - b.workload).slice(0,5);
  };

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
      name:normalise(req.body.name).slice(0,120), email:normalise(req.body.email).toLowerCase().slice(0,180), phone:normalise(req.body.phone).slice(0,60), country:normalise(req.body.country).slice(0,80), problem:normalise(req.body.problem).slice(0,2500),
      amount:Number(req.body.amount || 0), income:Number(req.body.income || 0), expenses:Number(req.body.expenses || 0), days:req.body.days === '' || req.body.days == null ? null : Number(req.body.days),
      flags:Array.isArray(req.body.flags) ? req.body.flags.map(x=>normalise(x)).slice(0,12) : [],
      triage:req.body.triage && typeof req.body.triage === 'object' ? { score:Number(req.body.triage.score||0), band:normalise(req.body.triage.band).slice(0,40), specialist:normalise(req.body.triage.specialist).slice(0,180), priorities:Array.isArray(req.body.triage.priorities)?req.body.triage.priorities.map(x=>normalise(x).slice(0,300)).slice(0,10):[] } : {},
      status:'New — awaiting case review', accessHash:hashSecret(code), assignedProfessional:null, assignedProfessionalId:null, match:null
    });
    req.session.rescueCaseId = item.id;
    res.status(201).json({ caseNumber:item.caseNumber, accessCode:code, status:item.status, message:'Save this access code. It is shown only once.' });
  });

  app.post('/api/rescue/access', (req, res) => { const db = store.read(); const email = normalise(req.body.email).toLowerCase(); const code = normalise(req.body.code); const item = [...db.rescueCases].reverse().find(x => x.email === email && verifySecret(code, x.accessHash)); if (!item) return res.status(401).json({ error:'Email or rescue access code is incorrect.' }); req.session.rescueCaseId = item.id; res.json({ ok:true, case:safeCase(item) }); });
  app.get('/api/rescue/case', (req, res) => { if (!req.session.rescueCaseId) return res.status(401).json({ error:'Rescue case sign-in required.' }); const item = store.read().rescueCases.find(x=>x.id===req.session.rescueCaseId); if (!item) return res.status(404).json({ error:'Rescue case not found.' }); res.json({ case:safeCase(item) }); });

  app.post('/api/professionals/apply', (req, res) => {
    const required=['name','email','phone','profession','registrationNumber','regulator','specialities'];
    if(required.some(k=>!normalise(req.body[k]))) return res.status(400).json({ error:'Please complete every professional application field.' });
    const number=`PRO-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    store.insert('professionals',{ applicationNumber:number, name:normalise(req.body.name).slice(0,120), email:normalise(req.body.email).toLowerCase().slice(0,180), phone:normalise(req.body.phone).slice(0,60), profession:normalise(req.body.profession).slice(0,140), registrationNumber:normalise(req.body.registrationNumber).slice(0,120), regulator:normalise(req.body.regulator).slice(0,140), country:normalise(req.body.country || 'South Africa').slice(0,80), regions:normalise(req.body.regions).slice(0,500), languages:normalise(req.body.languages).slice(0,300), availability:normalise(req.body.availability || 'Available').slice(0,80), rescueTypes:normalise(req.body.rescueTypes).slice(0,400), specialities:normalise(req.body.specialities).slice(0,1800), verificationStatus:'Pending verification', active:false });
    res.status(201).json({ applicationNumber:number, status:'Pending verification' });
  });

  app.get('/api/admin/rescue', (req,res) => {
    if (!req.session.admin) return res.status(401).json({ error:'Administrator sign-in required.' });
    const db=store.read();
    const rescueCases=(db.rescueCases||[]).map(item=>({ ...safeCase(item), matchCandidates:rankMatches(item,db) }));
    res.json({ metrics:{ rescueCases:db.rescueCases.length, critical:db.rescueCases.filter(x=>Number(x.triage?.score)>=80).length, professionals:db.professionals.length, verifiedProfessionals:db.professionals.filter(x=>x.active && String(x.verificationStatus||'').toLowerCase()==='verified').length }, rescueCases, professionals:db.professionals.map(({accessHash,...x})=>x) });
  });

  app.post('/api/admin/rescue/:id/auto-match', (req,res) => {
    if (!req.session.admin) return res.status(401).json({ error:'Administrator sign-in required.' });
    const db=store.read(); const item=db.rescueCases.find(x=>x.id===req.params.id); if(!item)return res.status(404).json({error:'Rescue case not found.'});
    const matches=rankMatches(item,db); if(!matches.length)return res.status(409).json({error:'No verified professional currently matches this case.'});
    const best=matches[0]; const updated=store.update('rescueCases',item.id,{ assignedProfessional:best.name, assignedProfessionalId:best.id, status:'Professional assigned', match:{score:best.score,reasons:best.reasons,matchedAt:new Date().toISOString()} });
    res.json({case:safeCase(updated),match:best,alternatives:matches.slice(1)});
  });

  app.patch('/api/admin/rescue/:id', (req,res) => {
    if (!req.session.admin) return res.status(401).json({ error:'Administrator sign-in required.' });
    const patch={}; if(req.body.status!==undefined)patch.status=normalise(req.body.status).slice(0,200);
    if(req.body.assignedProfessionalId!==undefined){ const db=store.read(); const pro=(db.professionals||[]).find(p=>p.id===req.body.assignedProfessionalId && p.active); patch.assignedProfessionalId=pro?pro.id:null; patch.assignedProfessional=pro?pro.name:''; }
    else if(req.body.assignedProfessional!==undefined)patch.assignedProfessional=normalise(req.body.assignedProfessional).slice(0,200);
    const item=store.update('rescueCases',req.params.id,patch); if(!item)return res.status(404).json({error:'Rescue case not found.'}); res.json({case:safeCase(item)});
  });

  app.patch('/api/admin/professionals/:id', (req,res) => {
    if (!req.session.admin) return res.status(401).json({ error:'Administrator sign-in required.' });
    const patch={}; if(req.body.verificationStatus!==undefined)patch.verificationStatus=normalise(req.body.verificationStatus).slice(0,120); if(req.body.active!==undefined)patch.active=Boolean(req.body.active); if(req.body.availability!==undefined)patch.availability=normalise(req.body.availability).slice(0,80);
    const item=store.update('professionals',req.params.id,patch); if(!item)return res.status(404).json({error:'Professional application not found.'}); res.json({professional:item});
  });
};
