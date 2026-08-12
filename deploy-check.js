const fs=require('node:fs');
const path=require('node:path');

const root=__dirname;
const exists=name=>fs.existsSync(path.join(root,name));
const env=(key)=>String(process.env[key]||'').trim();
const checks=[];
const add=(id,label,ok,detail='')=>checks.push({id,label,ok:Boolean(ok),detail});

add('entrypoint','Production entrypoint present',exists('revenue-server.js'),'revenue-server.js');
add('render-blueprint','Render blueprint present',exists('render.yaml'),'render.yaml');
add('dockerfile','Dockerfile present',exists('Dockerfile'),'Dockerfile');
add('homepage','Launch homepage present',exists('index.html'),'index.html');
add('rescue','Financial Rescue page present',exists('rescue.html'),'rescue.html');
add('proof','Results & Trust page present',exists('proof.html'),'proof.html');
add('privacy','Privacy Notice present',exists('privacy.html'),'privacy.html');
add('terms','Terms & Disclaimer present',exists('terms.html'),'terms.html');
add('robots','robots.txt present',exists('robots.txt'),'robots.txt');
add('sitemap','sitemap.xml present',exists('sitemap.xml'),'sitemap.xml');

if(process.env.NODE_ENV==='production'||process.env.RENDER==='true'){
  add('node-env','NODE_ENV=production',env('NODE_ENV')==='production',env('NODE_ENV')||'unset');
  add('app-url','APP_URL is HTTPS',/^https:\/\//i.test(env('APP_URL')),env('APP_URL')||'unset');
  add('session-secret','SESSION_SECRET is strong',env('SESSION_SECRET').length>=32,env('SESSION_SECRET')?'configured':'missing');
  add('admin-email','ADMIN_EMAIL configured',Boolean(env('ADMIN_EMAIL')),env('ADMIN_EMAIL')?'configured':'missing');
  add('admin-password','ADMIN_PASSWORD length >= 12',env('ADMIN_PASSWORD').length>=12,env('ADMIN_PASSWORD')?'configured':'missing');
  add('payfast-id','PAYFAST_MERCHANT_ID configured',Boolean(env('PAYFAST_MERCHANT_ID')),env('PAYFAST_MERCHANT_ID')?'configured':'missing');
  add('payfast-key','PAYFAST_MERCHANT_KEY configured',Boolean(env('PAYFAST_MERCHANT_KEY')),env('PAYFAST_MERCHANT_KEY')?'configured':'missing');
  add('payfast-passphrase','PAYFAST_PASSPHRASE configured',Boolean(env('PAYFAST_PASSPHRASE')),env('PAYFAST_PASSPHRASE')?'configured':'missing');
}

const failed=checks.filter(c=>!c.ok);
console.log('\nThe Chancellor — Deployment Readiness\n');
for(const c of checks) console.log(`${c.ok?'PASS':'FAIL'}  ${c.label}${c.detail?` — ${c.detail}`:''}`);
console.log(`\n${checks.length-failed.length}/${checks.length} checks passed.`);
if(failed.length){
  console.error(`Deployment readiness failed: ${failed.map(c=>c.id).join(', ')}`);
  process.exit(1);
}
console.log('Deployment readiness passed.');
