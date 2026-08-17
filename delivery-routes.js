const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const multer=require('multer');
const store=require('./store');
const {normalise}=require('./core');
const {syncPaidAssignments}=require('./delivery-core');

const requireClient=(req,res,next)=>req.session?.clientId?next():res.status(401).json({error:'Please sign in to continue.'});
const requireAdmin=(req,res,next)=>req.session?.admin?next():res.status(401).json({error:'Administrator sign-in required.'});
const statuses=['Awaiting kickoff','Waiting for client information','In production','Internal review','Client review','Completed'];
const dir=path.join(process.env.DATA_DIR||path.join(__dirname,'data'),'deliverables');
fs.mkdirSync(dir,{recursive:true});
const allowed=new Set(['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation','image/jpeg','image/png']);
const upload=multer({storage:multer.diskStorage({destination:dir,filename:(_req,file,cb)=>cb(null,`${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname).toLowerCase()}`)}),limits:{fileSize:Number(process.env.MAX_DELIVERABLE_MB||20)*1024*1024,files:5},fileFilter:(_req,file,cb)=>cb(null,allowed.has(file.mimetype))});

function safeAssignment(a){const {internalNote,...safe}=a;return safe;}
function assignmentFiles(db,id){return (db.deliverables||[]).filter(f=>f.assignmentId===id).map(({storedName,...f})=>f);}
function progressFor(status){return {'Awaiting kickoff':10,'Waiting for client information':20,'In production':50,'Internal review':75,'Client review':90,'Completed':100}[status]||10;}

module.exports=function registerDeliveryRoutes(app){
  app.get('/api/client/assignments',requireClient,(req,res)=>{
    syncPaidAssignments();
    const db=store.read();
    const assignments=(db.assignments||[]).filter(a=>a.auditId===req.session.clientId).map(a=>({...safeAssignment(a),files:assignmentFiles(db,a.id)}));
    res.json({assignments});
  });

  app.get('/api/client/deliverables/:id/download',requireClient,(req,res)=>{
    const db=store.read();
    const file=(db.deliverables||[]).find(f=>f.id===req.params.id);
    const assignment=file&&(db.assignments||[]).find(a=>a.id===file.assignmentId&&a.auditId===req.session.clientId);
    if(!file||!assignment)return res.status(404).send('File not found');
    const full=path.join(dir,path.basename(file.storedName));
    if(!fs.existsSync(full))return res.status(404).send('File not found');
    res.download(full,file.originalName);
  });

  app.get('/api/admin/assignments',requireAdmin,(_req,res)=>{
    syncPaidAssignments();
    const db=store.read();
    const audits=db.audits||[];
    const assignments=(db.assignments||[]).map(a=>{
      const audit=audits.find(x=>x.id===a.auditId)||{};
      return {...a,clientName:audit.name||'',businessName:audit.businessName||'',email:audit.email||'',phone:audit.phone||'',files:assignmentFiles(db,a.id)};
    });
    const open=assignments.filter(a=>a.status!=='Completed');
    const overdue=open.filter(a=>a.deadline&&new Date(a.deadline).getTime()<Date.now()).length;
    res.json({metrics:{total:assignments.length,open:open.length,completed:assignments.length-open.length,overdue},assignments});
  });

  app.patch('/api/admin/assignments/:id',requireAdmin,(req,res)=>{
    const db=store.read();
    const current=(db.assignments||[]).find(a=>a.id===req.params.id);
    if(!current)return res.status(404).json({error:'Assignment not found.'});
    const patch={};
    if(req.body.status!==undefined){const s=normalise(req.body.status);if(!statuses.includes(s))return res.status(400).json({error:'Invalid assignment status.'});patch.status=s;patch.progress=progressFor(s);if(s==='In production'&&!current.startedAt)patch.startedAt=new Date().toISOString();if(s==='Completed')patch.completedAt=new Date().toISOString();}
    if(req.body.deadline!==undefined){const d=new Date(req.body.deadline);if(Number.isNaN(d.getTime()))return res.status(400).json({error:'Enter a valid deadline.'});patch.deadline=d.toISOString();}
    if(req.body.clientMessage!==undefined)patch.clientMessage=normalise(req.body.clientMessage).slice(0,1600);
    if(req.body.internalNote!==undefined)patch.internalNote=normalise(req.body.internalNote).slice(0,2400);
    if(Array.isArray(req.body.checklist))patch.checklist=req.body.checklist.map(item=>({id:normalise(item.id).slice(0,40),label:normalise(item.label).slice(0,240),status:['Pending','Received','Approved','Not required'].includes(item.status)?item.status:'Pending'})).filter(x=>x.id&&x.label);
    const updated=store.update('assignments',req.params.id,patch);
    if(updated.status==='Completed')store.update('audits',updated.auditId,{salesStage:'Delivered',nextAction:'Client follow-up / testimonial / retainer'});
    else if(updated.status==='In production')store.update('audits',updated.auditId,{salesStage:'In delivery',nextAction:`Deliver ${updated.service}`});
    res.json({assignment:updated});
  });

  app.post('/api/admin/assignments/:id/deliverables',requireAdmin,upload.array('files',5),(req,res)=>{
    const db=store.read();const assignment=(db.assignments||[]).find(a=>a.id===req.params.id);
    if(!assignment)return res.status(404).json({error:'Assignment not found.'});
    if(!req.files?.length)return res.status(400).json({error:'Choose at least one final file.'});
    const records=req.files.map(file=>store.insert('deliverables',{assignmentId:assignment.id,auditId:assignment.auditId,originalName:file.originalname,storedName:file.filename,mime:file.mimetype,size:file.size,status:'Available to client'}));
    store.update('assignments',assignment.id,{status:'Client review',progress:90,clientMessage:'Your deliverable is ready in the portal. Please review the file and send any final feedback.'});
    res.status(201).json({files:records.map(({storedName,...f})=>f)});
  });

  app.get('/api/admin/deliverables/:id/download',requireAdmin,(req,res)=>{
    const db=store.read();const file=(db.deliverables||[]).find(f=>f.id===req.params.id);
    if(!file)return res.status(404).send('File not found');
    const full=path.join(dir,path.basename(file.storedName));if(!fs.existsSync(full))return res.status(404).send('File not found');res.download(full,file.originalName);
  });

  require('./delivery-concierge-routes')(app);
};