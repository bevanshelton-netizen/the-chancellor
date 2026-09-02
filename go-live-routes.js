const fs=require('node:fs');
const path=require('node:path');
const {SECTION_DEFS}=require('./readiness-engine');
const {buildGrowthTiers}=require('./growth-offer-engine');

function exists(name){try{return fs.existsSync(path.join(__dirname,name))}catch{return false}}
function bool(value){return Boolean(value)}
function safeHost(value=''){try{return new URL(String(value)).host}catch{return ''}}
function truthy(value){return /^(1|true|yes|on)$/i.test(String(value||'').trim())}
function storageCheck(){
  const dir=path.resolve(process.env.DATA_DIR||path.join(__dirname,'data'));
  try{
    fs.mkdirSync(dir,{recursive:true});
    const file=path.join(dir,`.go-live-${process.pid}.tmp`);
    fs.writeFileSync(file,'ok');
    fs.unlinkSync(file);
    return{ok:true,path:dir};
  }catch(error){
    return{ok:false,path:dir,error:String(error.message||error).slice(0,180)};
  }
}
function runtimeInfo(){
  const izakhono=truthy(process.env.IZAKHONO_RUNTIME)||truthy(process.env.IZAKHONO_HOST);
  const render=String(process.env.RENDER||'').toLowerCase()==='true';
  const vercel=String(process.env.VERCEL||'')==='1';
  const provider=izakhono?'IZAKHONO':render?'Render':vercel?'Vercel':'unknown';
  const branch=process.env.IZAKHONO_GIT_BRANCH||process.env.RENDER_GIT_BRANCH||process.env.VERCEL_GIT_COMMIT_REF||'';
  const repo=process.env.IZAKHONO_GIT_REPO_SLUG||process.env.RENDER_GIT_REPO_SLUG||process.env.VERCEL_GIT_REPO_SLUG||'';
  const commit=process.env.IZAKHONO_GIT_COMMIT||process.env.RENDER_GIT_COMMIT||process.env.VERCEL_GIT_COMMIT_SHA||'';
  const externalUrl=process.env.IZAKHONO_PUBLIC_URL||process.env.RENDER_EXTERNAL_URL||(process.env.VERCEL_PROJECT_PRODUCTION_URL?`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`:'');
  return{provider,branch,repo,commit,externalUrl,izakhono,render,vercel};
}
function check(id,label,ok,critical=true,detail=''){return{id,label,ok:Boolean(ok),critical,detail}}
function auditModel(){
  const sections=Array.isArray(SECTION_DEFS)?SECTION_DEFS:[];
  return{
    sections:sections.length,
    questions:sections.reduce((sum,s)=>sum+(Array.isArray(s.questions)?s.questions.length:0),0),
    maxScore:sections.reduce((sum,s)=>sum+Number(s.weight||0),0),
    names:sections.map(s=>s.name)
  };
}
function growthTiers(){
  try{return buildGrowthTiers({priorities:[],readinessPercent:50}).map(t=>Number(t.amount||0))}catch{return[]}
}

module.exports=function registerGoLiveRoutes(app){
  app.get('/api/go-live',(_req,res)=>{
    const payfastMode=String(process.env.PAYFAST_MODE||'sandbox').toLowerCase()==='live'?'live':'sandbox';
    const appUrl=String(process.env.APP_URL||'');
    const runtime=runtimeInfo();
    const storage=storageCheck();
    const persistentStorage=truthy(process.env.PERSISTENT_STORAGE)||truthy(process.env.IZAKHONO_PERSISTENT_STORAGE);
    const audit=auditModel();
    const tiers=growthTiers();
    const requiredAuditSections=['Business Foundation','Products & Services','Customers','Sales','Marketing','Finance','Compliance & Governance','Operations & Systems','Funding, Tenders & Growth'];
    const auditReady=audit.sections===9&&audit.questions===90&&audit.maxScore===180&&requiredAuditSections.every(name=>audit.names.includes(name));
    const tiersReady=tiers.length===3&&tiers[0]===3500&&tiers[1]===7500&&tiers[2]===10000;
    const pages=['index.html','campaign.html','assessment.html','rescue.html','rescue-portal.html','professional-portal.html','portal.html','admin.html','proof.html','partner-portal.html','institutional-portal.html'];
    const modules=['readiness-assessment-routes.js','readiness-report-routes.js','post-audit-concierge-routes.js','growth-offer-engine.js','offer-routes.js','delivery-routes.js','production-routes.js','intelligence-routes.js','export-routes.js','followup-routes.js','acquisition-routes.js','activation-routes.js','membership-routes.js','firm-routes.js','case-room-routes.js','case-billing-routes.js','notification-routes.js','reputation-routes.js','outcome-routes.js','public-proof-routes.js','referral-routes.js','institutional-routes.js','communications-routes.js','brand-fallback-routes.js','rescue-triage.js'];
    const comms=Boolean(process.env.RESEND_API_KEY)||Boolean(process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN);
    const realIdentity=exists('the-chancellor.jpg')&&exists('the-chancellor-avatar.png');
    const crestReady=exists('assets/the-chancellor-crest.svg');
    const hostMatch=!runtime.externalUrl||safeHost(appUrl)===safeHost(runtime.externalUrl);
    const checks=[
      check('runtime','Running in production mode',process.env.NODE_ENV==='production',true,process.env.NODE_ENV||'unset'),
      check('provider','Recognised deployment provider',runtime.provider!=='unknown',false,runtime.provider),
      check('branch','Deployment branch is main',!runtime.branch||runtime.branch==='main',true,runtime.branch||'not supplied'),
      check('repo','Deployment source repo is the-chancellor',!runtime.repo||/the-chancellor$/i.test(runtime.repo),true,runtime.repo||'not supplied'),
      check('entrypoint','Production entrypoint present',exists('revenue-server.js'),true,'revenue-server.js'),
      check('app-url','Secure production APP_URL',/^https:\/\//i.test(appUrl),true,safeHost(appUrl)||'unset'),
      check('url-match','APP_URL matches public runtime host',hostMatch,true,runtime.externalUrl?safeHost(runtime.externalUrl):'runtime URL not supplied'),
      check('session','Session secret configured',String(process.env.SESSION_SECRET||'').length>=32,true,process.env.SESSION_SECRET?'configured':'missing'),
      check('admin','Admin access configured',bool(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD)&&String(process.env.ADMIN_PASSWORD||'').length>=12,true,process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD?'configured':'missing'),
      check('storage','Application data directory is writable',storage.ok,true,storage.ok?storage.path:storage.error||'not writable'),
      check('persistent-storage','Persistent production storage explicitly enabled',persistentStorage,true,persistentStorage?'declared persistent':'set PERSISTENT_STORAGE=true only on a runtime with durable /app/data'),
      check('pages','All public/private v1 pages present',pages.every(exists),true,pages.filter(x=>!exists(x)).join(', ')||'all present'),
      check('identity','Approved real Chancellor portrait and avatar present',realIdentity,true,realIdentity?'the-chancellor.jpg + the-chancellor-avatar.png':'missing approved real identity file'),
      check('brand','Chancellor crest present',crestReady,true,crestReady?'assets/the-chancellor-crest.svg':'crest missing'),
      check('modules','Complete v1 modules present',modules.every(exists),true,modules.filter(x=>!exists(x)).join(', ')||'all present'),
      check('audit-model','R500 audit is the approved 90-question / 180-point model',auditReady,true,`${audit.sections} sections · ${audit.questions} questions · ${audit.maxScore} points`),
      check('growth-tiers','Paid implementation tiers are R3,500 / R7,500 / R10,000',tiersReady,true,tiers.length?tiers.map(v=>`R${v}`).join(' / '):'not available'),
      check('payfast-creds','PayFast merchant credentials configured',bool(process.env.PAYFAST_MERCHANT_ID&&process.env.PAYFAST_MERCHANT_KEY),true,process.env.PAYFAST_MERCHANT_ID&&process.env.PAYFAST_MERCHANT_KEY?'configured':'missing'),
      check('payfast-passphrase','PayFast passphrase configured for recurring memberships',bool(process.env.PAYFAST_PASSPHRASE),true,process.env.PAYFAST_PASSPHRASE?'configured':'missing'),
      check('payfast-live','PayFast mode is LIVE',payfastMode==='live',true,payfastMode.toUpperCase()),
      check('openai','OpenAI adviser / production AI configured',bool(process.env.OPENAI_API_KEY),false,process.env.OPENAI_API_KEY?'configured':'fallback/manual mode'),
      check('communications','At least one outbound communications channel configured',comms,false,comms?'configured':'in-app notifications only')
    ];
    const blockers=checks.filter(x=>x.critical&&!x.ok);
    const warnings=checks.filter(x=>!x.critical&&!x.ok);
    res.setHeader('Cache-Control','no-store');
    res.json({
      ok:blockers.length===0,
      readyForPaidTraffic:blockers.length===0,
      service:"The Chancellor's Business Growth Desk",
      version:'v1-commercial',
      checkedAt:new Date().toISOString(),
      deployment:{provider:runtime.provider,repo:runtime.repo,branch:runtime.branch,commit:runtime.commit,commitShort:runtime.commit?runtime.commit.slice(0,8):'',publicHost:safeHost(runtime.externalUrl)},
      audit:{sections:audit.sections,questions:audit.questions,maxScore:audit.maxScore},
      implementation:{tiers},
      identity:{approvedRealPortrait:exists('the-chancellor.jpg'),approvedRealAvatar:exists('the-chancellor-avatar.png'),crest:crestReady},
      storage:{writable:storage.ok,persistentDeclared:persistentStorage,path:storage.path},
      payment:{mode:payfastMode,configured:bool(process.env.PAYFAST_MERCHANT_ID&&process.env.PAYFAST_MERCHANT_KEY),recurringReady:bool(process.env.PAYFAST_PASSPHRASE)},
      communications:{configured:comms},
      ai:{configured:bool(process.env.OPENAI_API_KEY)},
      blockers:blockers.map(x=>x.id),
      warnings:warnings.map(x=>x.id),
      checks
    });
  });
};
