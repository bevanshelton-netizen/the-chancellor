const fs=require('node:fs');
const path=require('node:path');
const store=require('./store');
const {exportReviewedVersion}=require('./document-export');

const requireAdmin=(req,res,next)=>req.session?.admin?next():res.status(401).json({error:'Administrator sign-in required.'});
const dir=path.join(process.env.DATA_DIR||path.join(__dirname,'data'),'deliverables');
fs.mkdirSync(dir,{recursive:true});

function latestVersion(production){return (production.versions||[]).find(v=>v.id===production.finalisedVersionId)||(production.versions||[]).find(v=>v.id===production.currentVersionId)||(production.versions||[]).slice(-1)[0]||null}

module.exports=function registerExportRoutes(app){
  app.post('/api/admin/production/:assignmentId/export',requireAdmin,async(req,res)=>{
    try{
      const db=store.read();
      const assignment=(db.assignments||[]).find(a=>a.id===req.params.assignmentId);
      if(!assignment)return res.status(404).json({error:'Assignment not found.'});
      const production=(db.productions||[]).find(p=>p.assignmentId===assignment.id);
      if(!production)return res.status(409).json({error:'Production workspace not found.'});
      if(production.status!=='Finalised'&&!production.finalisedVersionId)return res.status(409).json({error:'Human finalisation is required before PDF/DOCX export.'});
      const version=latestVersion(production);
      if(!version)return res.status(409).json({error:'No finalised version is available.'});
      const audit=(db.audits||[]).find(a=>a.id===assignment.auditId)||{};
      const existing=(db.deliverables||[]).filter(f=>f.assignmentId===assignment.id&&f.exportVersionId===version.id&&['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(f.mime));
      if(existing.length>=2)return res.json({files:existing.map(({storedName,...f})=>f),message:'PDF and DOCX exports already exist for this reviewed version.'});
      const generated=await exportReviewedVersion({dir,assignment,audit,version});
      const records=[];
      for(const f of generated){
        const storedName=path.basename(f.path);
        const previous=(store.read().deliverables||[]).find(x=>x.assignmentId===assignment.id&&x.exportVersionId===version.id&&x.mime===f.mime);
        if(previous){records.push(previous);continue}
        records.push(store.insert('deliverables',{assignmentId:assignment.id,auditId:assignment.auditId,originalName:f.name,storedName,mime:f.mime,size:f.size,status:'Available to client',source:'reviewed-export',exportVersionId:version.id}));
      }
      store.update('assignments',assignment.id,{status:'Client review',progress:90,clientMessage:'Your reviewed Growth Desk document is ready in both PDF and Word format in your portal.'});
      store.update('productions',production.id,{exportedAt:new Date().toISOString(),exportedVersionId:version.id});
      res.status(201).json({files:records.map(({storedName,...f})=>f)});
    }catch(error){console.error('Document export failed:',error);res.status(500).json({error:error.message||'PDF/DOCX export failed.'})}
  });
};
