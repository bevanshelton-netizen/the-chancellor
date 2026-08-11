const store=require('./store');
const {normalise}=require('./core');
const {scanFollowups,followupSnapshot,buildContact}=require('./followup-engine');

const requireAdmin=(req,res,next)=>req.session?.admin?next():res.status(401).json({error:'Administrator sign-in required.'});
const requireClient=(req,res,next)=>req.session?.clientId?next():res.status(401).json({error:'Please sign in to continue.'});

module.exports=function registerFollowupRoutes(app){
  app.get('/api/admin/followups',requireAdmin,(_req,res)=>{
    const snapshot=scanFollowups();
    res.json({...snapshot,tasks:snapshot.tasks.map(t=>({...t,contact:buildContact(t)}))});
  });

  app.post('/api/admin/followups/scan',requireAdmin,(_req,res)=>{
    const snapshot=scanFollowups();
    res.json({...snapshot,tasks:snapshot.tasks.map(t=>({...t,contact:buildContact(t)}))});
  });

  app.patch('/api/admin/followups/:id',requireAdmin,(req,res)=>{
    const db=store.read();const task=(db.followUps||[]).find(x=>x.id===req.params.id);
    if(!task)return res.status(404).json({error:'Follow-up not found.'});
    const action=normalise(req.body.action).toLowerCase();
    let patch={};
    if(action==='done')patch={status:'Done',completedAt:new Date().toISOString(),note:normalise(req.body.note).slice(0,1000)};
    else if(action==='reopen')patch={status:'Open',completedAt:null,snoozedUntil:null,note:normalise(req.body.note).slice(0,1000)};
    else if(action==='snooze'){
      const hours=Math.min(168,Math.max(1,Number(req.body.hours||24)));
      patch={status:'Snoozed',snoozedUntil:new Date(Date.now()+hours*60*60*1000).toISOString(),note:normalise(req.body.note).slice(0,1000)};
    }else return res.status(400).json({error:'Choose done, snooze or reopen.'});
    const updated=store.update('followUps',task.id,patch);
    res.json({task:{...updated,contact:buildContact(updated)}});
  });

  app.get('/api/client/notifications',requireClient,(req,res)=>{
    scanFollowups();
    const db=store.read();
    const notices=(db.clientNotices||[]).filter(x=>x.auditId===req.session.clientId).slice().reverse();
    res.json({unread:notices.filter(x=>!x.read).length,notices});
  });

  app.patch('/api/client/notifications/:id/read',requireClient,(req,res)=>{
    const db=store.read();const notice=(db.clientNotices||[]).find(x=>x.id===req.params.id&&x.auditId===req.session.clientId);
    if(!notice)return res.status(404).json({error:'Notification not found.'});
    const updated=store.update('clientNotices',notice.id,{read:true,readAt:new Date().toISOString()});
    res.json({notice:updated});
  });
};
