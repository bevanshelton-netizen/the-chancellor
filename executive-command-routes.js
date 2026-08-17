const store=require('./store');
const requireAdmin=(req,res,next)=>req.session?.admin?next():res.status(401).json({error:'Administrator sign-in required.'});
const done=v=>String(v||'').toUpperCase()==='COMPLETE';
const money=v=>Number(v||0);
const priorityRank={urgent:5,high:4,medium:3,low:2};
function ageDays(v){return v?Math.floor((Date.now()-new Date(v).getTime())/86400000):0}
function dashboard(){
  const db=store.read();
  const leads=db.crmLeads||[],quotes=db.crmQuotes||[],quotePayments=db.crmQuotePayments||[],offers=db.offers||[],offerPayments=db.offerPayments||[],payments=db.payments||[],assignments=db.assignments||[],actions=(db.relationshipActions||[]).filter(a=>a.status==='Open');
  const cashAudit=payments.filter(done).reduce((s,p)=>s+money(p.amount),0);
  const cashOffers=offerPayments.filter(done).reduce((s,p)=>s+money(p.amount),0);
  const cashQuotes=quotePayments.filter(p=>String(p.status||'').toUpperCase()!=='INITIATED').reduce((s,p)=>s+money(p.amount),0);
  const openDeals=leads.filter(l=>!['WON','LOST'].includes(String(l.stage||'').toUpperCase()));
  const pipeline=openDeals.reduce((s,l)=>s+money(l.value),0);
  const weighted=openDeals.reduce((s,l)=>{const stage=String(l.stage||'').toUpperCase();const pct=stage.includes('PROPOSAL')?0.7:stage.includes('CONVERSATION')?0.5:stage.includes('REPLIED')?0.35:stage.includes('CONTACT')?0.2:0.1;return s+money(l.value)*pct},0);
  const activeAssignments=assignments.filter(a=>a.status!=='Completed');
  const overdueAssignments=activeAssignments.filter(a=>a.deadline&&new Date(a.deadline).getTime()<Date.now());
  const renewals=actions.filter(a=>a.type==='renewal');
  const stalled=actions.filter(a=>['urgent','high'].includes(a.priority));
  const acceptedUnpaid=offers.filter(o=>String(o.status||'').includes('Accepted')&&!String(o.status||'').includes('Paid'));
  const openQuotes=quotes.filter(q=>!['PAID','CANCELLED','EXPIRED'].includes(String(q.status||'').toUpperCase()));
  const priorities=[];
  actions.forEach(a=>priorities.push({score:(priorityRank[a.priority]||1)*100+Math.min(30,ageDays(a.createdAt)),title:a.title,detail:a.nextAction,type:'relationship',id:a.id}));
  overdueAssignments.forEach(a=>priorities.push({score:480,title:`Overdue delivery: ${a.service}`,detail:a.clientMessage||'Review delivery status and unblock the assignment.',type:'assignment',id:a.id}));
  acceptedUnpaid.forEach(o=>priorities.push({score:470,title:`Close payment: ${o.service}`,detail:`Accepted offer awaiting R${money(o.amount).toFixed(0)} payment.`,type:'offer',id:o.id}));
  openDeals.filter(l=>String(l.temperature||'').toUpperCase()==='HOT').forEach(l=>priorities.push({score:430+Math.min(50,money(l.value)/1000),title:`Hot deal: ${l.businessName||l.name||'Lead'}`,detail:l.nextAction||'Make a closing attempt today.',type:'lead',id:l.id}));
  const top5=priorities.sort((a,b)=>b.score-a.score).slice(0,5);
  return{metrics:{cashCollected:cashAudit+cashOffers+cashQuotes,pipeline,weightedPipeline,openDeals:openDeals.length,openQuotes:openQuotes.length,stalledClients:stalled.length,activeAssignments:activeAssignments.length,overdueAssignments:overdueAssignments.length,renewalsDue:renewals.length,relationshipActions:actions.length},top5,generatedAt:new Date().toISOString()};
}
module.exports=function registerExecutiveCommand(app){app.get('/api/admin/executive-command',requireAdmin,(_req,res)=>{res.setHeader('Cache-Control','no-store');res.json({ok:true,...dashboard()})});};
