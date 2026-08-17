require('dotenv').config({ path: require('node:path').join(__dirname, '.env') });
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const coreApp = require('./server');

const featureState = {};
function loadFeature(name, file) {
  try {
    const register = require(file);
    const result = typeof register === 'function' ? register(coreApp) : null;
    featureState[name] = { ok: true };
    console.log(`[feature] ${name}: ready`);
    return result || null;
  } catch (error) {
    featureState[name] = { ok: false, error: String(error.message || error).slice(0, 240) };
    console.error(`[feature] ${name}: disabled — ${featureState[name].error}`);
    return null;
  }
}

loadFeature('brand-fallbacks', './brand-fallback-routes');
loadFeature('one-stop-shop', './one-stop-shop-routes');
loadFeature('concierge', './concierge-routes');
loadFeature('post-audit-concierge', './post-audit-concierge-routes');
loadFeature('client-memory', './client-memory-routes');
const relationshipManager = loadFeature('relationship-manager', './relationship-manager-routes');
loadFeature('offers', './offer-routes');
loadFeature('audit-quotations', './quote-routes');
loadFeature('quote-followups', './quote-followup-routes');
loadFeature('delivery', './delivery-routes');
loadFeature('production', './production-routes');
loadFeature('document-intelligence', './intelligence-routes');
loadFeature('exports', './export-routes');
loadFeature('readiness-report', './readiness-report-routes');
loadFeature('follow-ups', './followup-routes');
loadFeature('acquisition', './acquisition-routes');
loadFeature('activation', './activation-routes');
loadFeature('go-live', './go-live-routes');
loadFeature('professional-membership', './membership-routes');
loadFeature('firms-practices', './firm-routes');
loadFeature('case-room', './case-room-routes');
loadFeature('case-billing', './case-billing-routes');
loadFeature('notifications', './notification-routes');
loadFeature('reputation', './reputation-routes');
loadFeature('outcomes', './outcome-routes');
loadFeature('public-proof', './public-proof-routes');
loadFeature('referrals', './referral-routes');
loadFeature('institutional-accounts', './institutional-routes');
loadFeature('crm', './crm-routes');
loadFeature('crm-forecasting', './crm-forecast-routes');
loadFeature('crm-public-quotes', './crm-public-quote-routes');
loadFeature('crm-commercial-documents', './crm-commercial-doc-routes');
const crmQuoteFollowups = loadFeature('crm-quote-followups', './crm-quote-followup-routes');
loadFeature('admin-recovery', './admin-recovery-routes');
const communications = loadFeature('communications', './communications-routes');

coreApp.get('/api/features', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, entrypoint: 'revenue-server.js', features: featureState });
});

function readText(name){
  try{return fs.readFileSync(path.join(__dirname,name),'utf8')}catch{return ''}
}
function dataAsset(source,name){
  const re=new RegExp(`const ${name}='(data:image\\/webp;base64,[^']+)'`,'i');
  return source.match(re)?.[1]||'';
}
function buildHomepage(){
  let html=readText('index.html');
  if(!html)return '';
  const css=[readText('styles.css'),readText('portrait.css'),readText('homepage-tweaks.css'),readText('launch-polish.css')].filter(Boolean).join('\n');
  const brands=readText('brand-assets.js');
  const portrait=dataAsset(brands,'portrait');
  const crest=dataAsset(brands,'crest');
  if(css)html=html.replace('</head>',`<style data-critical-home>${css}</style></head>`);
  if(portrait){
    html=html.replace(/src="\/brand\/chancellor\.webp[^\"]*"/g,`src="${portrait}"`);
    html=html.replace(/src="assets\/the-chancellor-approved\.svg[^\"]*"/g,`src="${portrait}"`);
  }
  if(crest){
    html=html.replace(/src="\/brand\/crest\.jpg[^\"]*"/g,`src="${crest}"`);
    html=html.replace(/src="assets\/the-chancellor-crest\.svg[^\"]*"/g,`src="${crest}"`);
  }
  if(!html.includes('concierge-client.js'))html=html.replace('</body>','<script src="/concierge-client.js?v=20260817-1"></script></body>');
  return html;
}

const app=express();
app.get('/',(_req,res)=>{
  const html=buildHomepage();
  if(!html)return res.status(500).type('text/plain').send('Homepage unavailable.');
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.type('html').send(html);
});

const criticalAssets={
  '/styles.css':['styles.css','text/css; charset=utf-8'],
  '/portrait.css':['portrait.css','text/css; charset=utf-8'],
  '/homepage-tweaks.css':['homepage-tweaks.css','text/css; charset=utf-8'],
  '/launch-polish.css':['launch-polish.css','text/css; charset=utf-8'],
  '/brand-assets.js':['brand-assets.js','application/javascript; charset=utf-8'],
  '/brand-repair.js':['brand-repair.js','application/javascript; charset=utf-8'],
  '/acquisition-client.js':['acquisition-client.js','application/javascript; charset=utf-8'],
  '/concierge-client.js':['concierge-client.js','application/javascript; charset=utf-8'],
  '/client-memory-client.js':['client-memory-client.js','application/javascript; charset=utf-8'],
  '/app.js':['app.js','application/javascript; charset=utf-8']
};
for(const [route,[file,type]] of Object.entries(criticalAssets)){
  app.get(route,(_req,res)=>{
    const body=readText(file);
    if(!body)return res.status(404).end();
    res.setHeader('Content-Type',type);
    res.setHeader('Cache-Control','no-store, max-age=0');
    res.send(body);
  });
}
app.use(coreApp);

let scanFollowups = () => {};
try { ({ scanFollowups } = require('./followup-engine')); }
catch (error) { console.error(`[feature] follow-up scanner: disabled — ${String(error.message || error).slice(0, 240)}`); }

const runCommunications = () => communications?.scan ? communications.scan().catch(error => console.error('Communications scan failed:', error.message)) : Promise.resolve();
const runCrmQuoteFollowups = () => crmQuoteFollowups?.scan ? crmQuoteFollowups.scan().catch(error => console.error('CRM quotation follow-up scan failed:', error.message)) : Promise.resolve();
const runRelationshipManager = () => { try { return relationshipManager?.scan ? relationshipManager.scan() : null; } catch(error) { console.error('Relationship Manager scan failed:', error.message); return null; } };
const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => {
  console.log(`The Chancellor complete v1 ready at http://localhost:${port}`);
  try { scanFollowups(); } catch (error) { console.error('Initial follow-up scan failed:', error.message); }
  setTimeout(runCommunications, 1000).unref();
  setTimeout(runCrmQuoteFollowups, 1500).unref();
  setTimeout(runRelationshipManager, 2000).unref();
});

const followupInterval = setInterval(() => { try { scanFollowups(); } catch (error) { console.error('Scheduled follow-up scan failed:', error.message); } }, 15 * 60 * 1000);
followupInterval.unref();
const crmQuoteFollowupInterval=setInterval(runCrmQuoteFollowups,15*60*1000);
crmQuoteFollowupInterval.unref();
const communicationsIntervalMs=Math.max(15*60*1000,Number(process.env.COMMS_SCAN_INTERVAL_MINUTES||30)*60*1000);
const communicationsInterval=setInterval(runCommunications,communicationsIntervalMs);
communicationsInterval.unref();
const relationshipInterval=setInterval(runRelationshipManager,6*60*60*1000);
relationshipInterval.unref();

function close(signal) {
  console.log(`${signal} received; closing cleanly.`);
  clearInterval(followupInterval);
  clearInterval(crmQuoteFollowupInterval);
  clearInterval(communicationsInterval);
  clearInterval(relationshipInterval);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => close('SIGTERM'));
process.on('SIGINT', () => close('SIGINT'));
