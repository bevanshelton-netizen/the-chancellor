const fs=require('node:fs');
const path=require('node:path');

function exists(name){try{return fs.existsSync(path.join(__dirname,name))}catch{return false}}
function bool(value){return Boolean(value)}
function safeHost(value=''){try{return new URL(String(value)).host}catch{return ''}}
function storageCheck(){
  const dir=path.resolve(process.env.DATA_DIR||path.join(__dirname,'data'));
  try{
    fs.mkdirSync(dir,{recursive:true});
    const file=path.join(dir,`.go-live-${process.pid}.tmp`);
    fs.writeFileSync(file,'ok');
    fs.unlinkSync(file);
    return {ok:true,path:dir};
  }catch(error){return {ok:false,path:dir,error:String(error.message||error).slice(0,180)}}
}
function check(id,label,ok,critical=true,detail=''){return {id,label,ok:Boolean(ok),critical,detail}}

module.exports=function registerGoLiveRoutes(app){
  app.get('/api/go-live',(_req,res)=>{
    const payfastMode=String(process.env.PAYFAST_MODE||'sandbox').toLowerCase()==='live'?'live':'sandbox';
    const appUrl=String(process.env.APP_URL||'');
    const renderUrl=String(process.env.RENDER_EXTERNAL_URL||'');
    const storage=storageCheck();
    const pages=['index.html','campaign.html','portal.html','admin.html'];
    const modules=['offer-routes.js','delivery-routes.js','production-routes.js','intelligence-routes.js','export-routes.js','followup-routes.js','acquisition-routes.js','activation-routes.js'];
    const checks=[
      check('runtime','Running in production mode',process.env.NODE_ENV==='production',true,process.env.NODE_ENV||'unset'),
      check('render','Running on Render',process.env.RENDER==='true',false,process.env.RENDER==='true'?'Render runtime detected':'Runtime not identified as Render'),
      check('branch','Render branch is main',!process.env.RENDER_GIT_BRANCH||process.env.RENDER_GIT_BRANCH==='main',true,process.env.RENDER_GIT_BRANCH||'not supplied'),
      check('repo','Render source repo is the-chancellor',!process.env.RENDER_GIT_REPO_SLUG||/the-chancellor$/i.test(process.env.RENDER_GIT_REPO_SLUG),true,process.env.RENDER_GIT_REPO_SLUG||'not supplied'),
      check('app-url','Secure production APP_URL',/^https:\/\//i.test(appUrl),true,safeHost(appUrl)||'unset'),
      check('url-match','APP_URL matches Render public host',!renderUrl||safeHost(appUrl)===safeHost(renderUrl),true,renderUrl?safeHost(renderUrl):'Render URL not supplied'),
      check('session','Session secret configured',String(process.env.SESSION_SECRET||'').length>=32,true,process.env.SESSION_SECRET?'configured':'missing'),
      check('admin','Admin access configured',bool(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD)&&String(process.env.ADMIN_PASSWORD||'').length>=12,true,process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD?'configured':'missing'),
      check('storage','Persistent data directory is writable',storage.ok,true,storage.ok?storage.path:storage.error||'not writable'),
      check('pages','Public and private app pages present',pages.every(exists),true,pages.filter(x=>!exists(x)).join(', ')||'all present'),
      check('brand','Approved Chancellor brand assets present',exists('assets/the-chancellor-approved.svg')&&exists('assets/the-chancellor-crest.svg'),true,'portrait + crest'),
      check('modules','Commercial modules present',modules.every(exists),true,modules.filter(x=>!exists(x)).join(', ')||'all present'),
      check('payfast-creds','PayFast merchant credentials configured',bool(process.env.PAYFAST_MERCHANT_ID&&process.env.PAYFAST_MERCHANT_KEY),true,process.env.PAYFAST_MERCHANT_ID&&process.env.PAYFAST_MERCHANT_KEY?'configured':'missing'),
      check('payfast-live','PayFast mode is LIVE',payfastMode==='live',true,payfastMode.toUpperCase()),
      check('openai','OpenAI adviser / production AI configured',bool(process.env.OPENAI_API_KEY),false,process.env.OPENAI_API_KEY?'configured':'fallback/manual mode')
    ];
    const blockers=checks.filter(x=>x.critical&&!x.ok);
    const warnings=checks.filter(x=>!x.critical&&!x.ok);
    const commit=String(process.env.RENDER_GIT_COMMIT||'');
    res.setHeader('Cache-Control','no-store');
    res.json({
      ok:blockers.length===0,
      readyForPaidTraffic:blockers.length===0,
      service:"The Chancellor's Business Growth Desk",
      checkedAt:new Date().toISOString(),
      deployment:{provider:process.env.RENDER==='true'?'Render':'unknown',repo:process.env.RENDER_GIT_REPO_SLUG||'',branch:process.env.RENDER_GIT_BRANCH||'',commit:commit||'',commitShort:commit?commit.slice(0,8):''},
      payment:{mode:payfastMode,configured:bool(process.env.PAYFAST_MERCHANT_ID&&process.env.PAYFAST_MERCHANT_KEY)},
      ai:{configured:bool(process.env.OPENAI_API_KEY)},
      blockers:blockers.map(x=>x.id),warnings:warnings.map(x=>x.id),checks
    });
  });
};
