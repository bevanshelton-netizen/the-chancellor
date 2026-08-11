const store=require('./store');
const crypto=require('node:crypto');

const plans={
  'profile-revamp':{days:5,checklist:['Current company profile','Company registration details','Logo and brand assets','Latest services / products','Key contact details']},
  'new-profile':{days:7,checklist:['Company registration details','Business overview','Services / products','Leadership information','Logo and brand assets','Contact details']},
  'capability':{days:5,checklist:['Company profile','Core capabilities','Relevant experience','Client / project examples','Compliance details']},
  'marketing-plan':{days:7,checklist:['Business profile','Target customers','Current marketing channels','Sales goals','Competitor information']},
  'business-proposal':{days:7,checklist:['Opportunity brief','Client / funder requirements','Company profile','Pricing / commercial information','Supporting evidence']},
  'business-plan':{days:10,checklist:['Company information','Business model','Market information','Management team','Financial information','Funding / growth objective']},
  'funding-proposal':{days:10,checklist:['Funding requirement','Use of funds','Business plan / profile','Financial statements or management accounts','Supporting compliance documents']},
  'investor-pitch':{days:10,checklist:['Business model','Investment amount sought','Market opportunity','Traction / financials','Team information','Use of funds']},
  'tender-support':{days:5,checklist:['Tender document','Submission deadline','Mandatory compliance documents','Pricing information','Capability evidence']},
  'retainer-starter':{days:30,checklist:['Current priorities','Existing business documents','Sales / growth targets','Monthly meeting availability']},
  'retainer-growth':{days:30,checklist:['Current priorities','Existing business documents','Sales / growth targets','Management information','Monthly meeting availability']},
  'retainer-executive':{days:30,checklist:['Executive priorities','Strategic plan / business plan','Management information','Financial performance','Leadership meeting availability']}
};

function makeChecklist(code){
  const source=(plans[code]||{checklist:['Supporting business information','Relevant source documents','Client instructions']}).checklist;
  return source.map(label=>({id:crypto.randomBytes(4).toString('hex'),label,status:'Pending'}));
}
function deadlineFor(code){const days=(plans[code]||{days:7}).days;return new Date(Date.now()+days*86400000).toISOString();}
function ensureAssignment(offer){
  if(!offer||offer.status!=='Paid')return null;
  const db=store.read();
  const existing=(db.assignments||[]).find(a=>a.offerId===offer.id);
  if(existing)return existing;
  return store.insert('assignments',{
    auditId:offer.auditId,offerId:offer.id,service:offer.service,code:offer.code,amount:Number(offer.amount||0),
    status:'Awaiting kickoff',deadline:deadlineFor(offer.code),progress:10,
    clientMessage:'Payment received. Your assignment has been opened and the Growth Desk is preparing the work.',
    internalNote:'',checklist:makeChecklist(offer.code),startedAt:null,completedAt:null
  });
}
function syncPaidAssignments(){
  const db=store.read();
  return (db.offers||[]).filter(o=>o.status==='Paid').map(ensureAssignment).filter(Boolean);
}
module.exports={ensureAssignment,syncPaidAssignments,plans};
