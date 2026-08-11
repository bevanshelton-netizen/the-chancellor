const store = require('./store');
const { normalise } = require('./core');

module.exports = function registerFirmRoutes(app) {
  const requireProfessional = (req,res,next) => req.session?.professionalId ? next() : res.status(401).json({error:'Professional Network sign-in required.'});
  const requireAdmin = (req,res,next) => req.session?.admin ? next() : res.status(401).json({error:'Administrator sign-in required.'});

  const safeMember = p => ({id:p.id,name:p.name,email:p.email,profession:p.profession,verificationStatus:p.verificationStatus,membershipStatus:p.membershipStatus,membershipTier:p.membershipTier,availability:p.availability,firmRole:p.firmRole||'Team member'});
  const safeFirm = f => ({id:f.id,name:f.name,registrationNumber:f.registrationNumber||'',practiceType:f.practiceType||'',website:f.website||'',phone:f.phone||'',country:f.country||'South Africa',regions:f.regions||'',capacity:Number(f.capacity||0),ownerProfessionalId:f.ownerProfessionalId,status:f.status||'Active',createdAt:f.createdAt,updatedAt:f.updatedAt});

  function currentProfessional(req){ return (store.read().professionals||[]).find(p=>p.id===req.session.professionalId); }
  function ownerFirm(pro,db){ return (db.firms||[]).find(f=>f.ownerProfessionalId===pro.id); }

  app.get('/api/professionals/firm',requireProfessional,(req,res)=>{
    const db=store.read(); const pro=(db.professionals||[]).find(p=>p.id===req.session.professionalId);
    if(!pro)return res.status(404).json({error:'Professional record not found.'});
    const firm=(db.firms||[]).find(f=>f.id===pro.firmId)||(db.firms||[]).find(f=>f.ownerProfessionalId===pro.id);
    if(!firm)return res.json({firm:null,members:[],metrics:{teamSize:0,verified:0,available:0,activeCases:0}});
    const members=(db.professionals||[]).filter(p=>p.firmId===firm.id||p.id===firm.ownerProfessionalId);
    const memberIds=new Set(members.map(p=>p.id));
    const activeCases=(db.rescueCases||[]).filter(c=>memberIds.has(c.assignedProfessionalId)&&!['Resolved','Closed'].includes(c.status));
    res.json({firm:safeFirm(firm),members:members.map(safeMember),isOwner:firm.ownerProfessionalId===pro.id,metrics:{teamSize:members.length,verified:members.filter(p=>p.verificationStatus==='Verified').length,available:members.filter(p=>!String(p.availability||'').toLowerCase().includes('not taking')).length,activeCases:activeCases.length}});
  });

  app.post('/api/professionals/firm',requireProfessional,(req,res)=>{
    const pro=currentProfessional(req); if(!pro)return res.status(404).json({error:'Professional record not found.'});
    const name=normalise(req.body.name).slice(0,180); if(!name)return res.status(400).json({error:'Firm or practice name is required.'});
    const db=store.read(); let firm=ownerFirm(pro,db);
    const patch={name,registrationNumber:normalise(req.body.registrationNumber).slice(0,120),practiceType:normalise(req.body.practiceType).slice(0,140),website:normalise(req.body.website).slice(0,240),phone:normalise(req.body.phone).slice(0,80),country:normalise(req.body.country||'South Africa').slice(0,80),regions:normalise(req.body.regions).slice(0,500),capacity:Math.max(0,Number(req.body.capacity||0)),status:'Active'};
    firm=firm?store.update('firms',firm.id,patch):store.insert('firms',{...patch,ownerProfessionalId:pro.id});
    store.update('professionals',pro.id,{firmId:firm.id,firmRole:'Principal / Practice Admin'});
    res.status(firm.createdAt===firm.updatedAt?201:200).json({firm:safeFirm(firm)});
  });

  app.post('/api/professionals/firm/team',requireProfessional,(req,res)=>{
    const db=store.read(); const pro=(db.professionals||[]).find(p=>p.id===req.session.professionalId); if(!pro)return res.status(404).json({error:'Professional record not found.'});
    const firm=ownerFirm(pro,db); if(!firm)return res.status(403).json({error:'Create your firm or practice profile before adding team members.'});
    if(pro.membershipTier!=='Chancellor Premier')return res.status(403).json({error:'Multi-professional practice management is available on Chancellor Premier.'});
    const email=normalise(req.body.email).toLowerCase(); const member=(db.professionals||[]).find(p=>p.email===email);
    if(!member)return res.status(404).json({error:'That person must first register with The Chancellor’s Professional Network.'});
    if(member.firmId&&member.firmId!==firm.id)return res.status(409).json({error:'This professional is already attached to another firm or practice.'});
    const updated=store.update('professionals',member.id,{firmId:firm.id,firmRole:normalise(req.body.role||'Professional').slice(0,120)});
    res.json({member:safeMember(updated)});
  });

  app.delete('/api/professionals/firm/team/:id',requireProfessional,(req,res)=>{
    const db=store.read(); const pro=(db.professionals||[]).find(p=>p.id===req.session.professionalId); const firm=pro?ownerFirm(pro,db):null;
    if(!firm)return res.status(403).json({error:'Practice administrator access required.'});
    if(req.params.id===pro.id)return res.status(400).json({error:'The practice principal cannot remove themselves.'});
    const member=(db.professionals||[]).find(p=>p.id===req.params.id&&p.firmId===firm.id); if(!member)return res.status(404).json({error:'Team member not found.'});
    const updated=store.update('professionals',member.id,{firmId:null,firmRole:null}); res.json({member:safeMember(updated)});
  });

  app.post('/api/professionals/firm/cases/:id/assign',requireProfessional,(req,res)=>{
    const db=store.read(); const pro=(db.professionals||[]).find(p=>p.id===req.session.professionalId); const firm=pro?ownerFirm(pro,db):null;
    if(!firm)return res.status(403).json({error:'Practice administrator access required.'});
    const members=(db.professionals||[]).filter(p=>p.firmId===firm.id||p.id===firm.ownerProfessionalId); const memberIds=new Set(members.map(p=>p.id));
    const item=(db.rescueCases||[]).find(c=>c.id===req.params.id&&memberIds.has(c.assignedProfessionalId)); if(!item)return res.status(404).json({error:'Firm case not found.'});
    const target=members.find(p=>p.id===normalise(req.body.professionalId)); if(!target)return res.status(400).json({error:'Choose a professional from this practice.'});
    if(target.verificationStatus!=='Verified'||target.membershipStatus!=='Active member'||!target.active)return res.status(409).json({error:'Cases can only be routed to verified active Network members.'});
    const updated=store.update('rescueCases',item.id,{assignedProfessionalId:target.id,assignedProfessional:target.name,professionalResponse:'Pending',status:'Professional assigned',firmId:firm.id,firmName:firm.name,firmAssignedAt:new Date().toISOString()});
    res.json({case:updated});
  });

  app.get('/api/admin/firms',requireAdmin,(_req,res)=>{
    const db=store.read(); const firms=(db.firms||[]).map(f=>{const members=(db.professionals||[]).filter(p=>p.firmId===f.id||p.id===f.ownerProfessionalId);const ids=new Set(members.map(p=>p.id));const cases=(db.rescueCases||[]).filter(c=>ids.has(c.assignedProfessionalId));return {...safeFirm(f),teamSize:members.length,verifiedMembers:members.filter(p=>p.verificationStatus==='Verified').length,activeCases:cases.filter(c=>!['Resolved','Closed'].includes(c.status)).length,resolvedCases:cases.filter(c=>c.status==='Resolved').length};});
    res.json({firms,metrics:{firms:firms.length,teamMembers:firms.reduce((s,f)=>s+f.teamSize,0),activeCases:firms.reduce((s,f)=>s+f.activeCases,0)}});
  });
};
