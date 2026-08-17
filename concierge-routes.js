const crypto=require('node:crypto');
const store=require('./store');

const clean=(v,max=1200)=>String(v??'').trim().replace(/[\u0000-\u001F\u007F]/g,'').slice(0,max);
const yes=/^(yes|y|sure|okay|ok|please do|go ahead|i agree|agreed|consent)$/i;
const no=/^(no|n|not now|don't|do not)$/i;
const emailRe=/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const phoneRe=/(?:\+?27|0)[6-8][0-9\s-]{7,12}/;
const regulated=/\b(tax dispute|sars|debt review|debt counselling|legal action|court|attorney|lawyer|insolvency|liquidation|sequestration|credit provider|labour dispute|ccma)\b/i;
const distress=/\b(can't pay|cannot pay|behind on|arrears|repossession|auction|foreclosure|sheriff|summons|garnishee|business rescue|liquidat|insolven|debt)\b/i;

function classify(text){
  const t=text.toLowerCase();
  if(regulated.test(t)||distress.test(t))return{code:'rescue',label:'Financial Rescue / specialist routing',action:'rescue',priority:'urgent'};
  if(/fund|investor|finance|capital/.test(t))return{code:'funding',label:'Funding readiness',action:'audit'};
  if(/tender|contract|bid|rfq|rfp/.test(t))return{code:'tenders',label:'Tender and contract readiness',action:'audit'};
  if(/customer|sales|sell|revenue|market/.test(t))return{code:'sales',label:'Sales and marketing growth',action:'audit'};
  if(/cash ?flow|pricing|profit|margin|money/.test(t))return{code:'cashflow',label:'Cash-flow and profitability',action:'audit'};
  if(/business plan|company profile|proposal|pitch/.test(t))return{code:'documents',label:'Business documents and positioning',action:'audit'};
  if(/website|digital|online|ai|automat/.test(t))return{code:'digital',label:'Digital growth and automation',action:'audit'};
  return{code:'growth',label:'Business growth diagnosis',action:'audit'};
}
function findSession(token){return(store.read().conciergeSessions||[]).find(x=>x.token===token)||null}
function leadBySession(sessionId){return(store.read().crmLeads||[]).find(x=>x.conciergeSessionId===sessionId)||null}
function append(session,message,role='client'){const messages=[...(session.messages||[]),{role,text:clean(message,1500),at:new Date().toISOString()}].slice(-30);return store.update('conciergeSessions',session.id,{messages,lastActiveAt:new Date().toISOString()})}
function leadSource(){return 'Website'}
function createLead(session){const existing=leadBySession(session.id);if(existing)return existing;return store.insert('crmLeads',{name:session.contactName||'',businessName:session.businessName||'',phone:session.phone||'',email:session.email||'',source:leadSource(),category:session.pathway?.label||'Business Growth Desk',need:session.need||'',stage:'REPLIED',value:500,nextAction:session.pathway?.action==='rescue'?'Open Financial Rescue triage':'Complete R500 Business Readiness Audit',followUpDate:new Date().toISOString().slice(0,10),notes:'Captured automatically by The Chancellor Concierge.',conciergeSessionId:session.id})}
function actionFor(session){if(session.pathway?.action==='rescue')return{type:'rescue',label:'Open Financial Rescue',href:'/rescue.html'};return{type:'audit',label:'Start my R500 Business Readiness Audit',href:'#audit',prefill:{name:session.contactName||'',businessName:session.businessName||'',phone:session.phone||'',email:session.email||'',goal:session.need||''}}}
function reply(text,session,extra={}){const updated=append(session,text,'chancellor');return{ok:true,reply:text,session:{id:updated.token,stage:updated.stage,pathway:updated.pathway},...extra}}

module.exports=function registerConcierge(app){
  app.post('/api/concierge/message',(req,res)=>{
    try{
      const message=clean(req.body?.message,1500);if(!message)return res.status(400).json({error:'Tell The Chancellor what you need help with.'});
      let token=clean(req.body?.sessionId,100);if(!/^[a-f0-9-]{16,100}$/i.test(token))token=crypto.randomUUID();
      let session=findSession(token);
      if(!session)session=store.insert('conciergeSessions',{token,stage:'problem',need:'',pathway:null,businessName:'',contactName:'',phone:'',email:'',consent:false,leadId:null,messages:[],createdAt:new Date().toISOString(),lastActiveAt:new Date().toISOString()});
      session=append(session,message,'client');
      const email=message.match(emailRe)?.[0]||'';const phone=message.match(phoneRe)?.[0]||'';
      if(email||phone)session=store.update('conciergeSessions',session.id,{email:email||session.email,phone:phone||session.phone});
      if(session.stage==='problem'){
        const pathway=classify(message);session=store.update('conciergeSessions',session.id,{need:message,pathway,stage:'business'});
        const urgency=pathway.action==='rescue'?'I can see this may need urgent or regulated specialist attention. I will keep the first step focused and route regulated work appropriately. ':'';
        return res.json(reply(`${urgency}I understand the issue as ${pathway.label.toLowerCase()}. What is the name of your business?`,session));
      }
      if(session.stage==='business'){
        session=store.update('conciergeSessions',session.id,{businessName:message,stage:'name'});
        return res.json(reply(`Thank you. And what name should I use for you?`,session));
      }
      if(session.stage==='name'){
        session=store.update('conciergeSessions',session.id,{contactName:message,stage:'contact'});
        return res.json(reply(`Good to meet you, ${clean(message,80)}. Please give me either your mobile number or email address so I can keep this business conversation connected to your client record.`,session));
      }
      if(session.stage==='contact'){
        if(!(session.email||session.phone))return res.json(reply('I did not recognise a valid mobile number or email address. Please enter one so I can connect this conversation to your client record.',session));
        session=store.update('conciergeSessions',session.id,{stage:'consent'});
        return res.json(reply('May I save these business contact details and this enquiry in The Chancellor CRM so I can manage your follow-up, quotation and service journey end to end? Reply YES or NO.',session));
      }
      if(session.stage==='consent'){
        if(no.test(message)){session=store.update('conciergeSessions',session.id,{stage:'recommendation',consent:false});return res.json(reply('Understood. I will not create a CRM lead from this conversation. I can still show you the appropriate next step.',session,{action:actionFor(session)}));}
        if(!yes.test(message))return res.json(reply('Please reply YES if I may save the enquiry in the CRM, or NO if you prefer to continue without a saved client record.',session));
        session=store.update('conciergeSessions',session.id,{stage:'recommendation',consent:true});const lead=createLead(session);session=store.update('conciergeSessions',session.id,{leadId:lead.id});
        const action=actionFor(session);const text=session.pathway?.action==='rescue'?`Your client record is open. The correct next step is Financial Rescue triage so urgency can be assessed and any regulated work can be routed to an appropriately qualified professional.`:`Your client record is open. Based on what you told me, the sensible next step is the R500 Business Readiness Audit. It gives us a structured diagnosis before I recommend or quote a larger intervention.`;
        return res.json(reply(text,session,{leadCreated:true,leadId:lead.id,action}));
      }
      const pathway=classify(message);if(pathway.code!==session.pathway?.code)session=store.update('conciergeSessions',session.id,{need:`${session.need}\n${message}`.slice(0,1200),pathway});
      return res.json(reply(`I have added that to your case. Your current pathway is ${session.pathway?.label||pathway.label}. I can take you to the next step now.`,session,{leadId:session.leadId||null,action:actionFor(session)}));
    }catch(error){console.error('Concierge failed:',error);res.status(500).json({error:'The Chancellor Concierge could not continue just now. Please try again.'})}
  });
  app.get('/api/concierge/session/:token',(req,res)=>{const session=findSession(clean(req.params.token,100));if(!session)return res.status(404).json({error:'Session not found.'});res.json({ok:true,stage:session.stage,pathway:session.pathway,leadId:session.leadId||null})});
};