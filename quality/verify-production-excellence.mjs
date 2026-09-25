import {readFile,access} from "node:fs/promises";
import {resolve,dirname,extname} from "node:path";
const ROOT=resolve(process.cwd());
const read=async p=>readFile(resolve(ROOT,p),"utf8");
const exists=async p=>{try{await access(resolve(ROOT,p));return true}catch{return false}};
const cfg=JSON.parse(await read("quality/production-excellence.json"));
const fail=m=>{console.error("PRODUCTION_EXCELLENCE_FAIL:",m);process.exitCode=2};

function staticMarkup(html){return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,"")}
function duplicateIds(html){const seen=new Set(),dup=new Set();for(const m of html.matchAll(/\bid=["']([^"']+)["']/gi)){if(seen.has(m[1]))dup.add(m[1]);else seen.add(m[1])}return [...dup]}
function missingAlt(html){const out=[];for(const m of html.matchAll(/<img\b[^>]*>/gi))if(!/\balt\s*=\s*["'][^"']*["']/i.test(m[0]))out.push(m[0].slice(0,120));return out}
function refs(html){const out=[];for(const m of html.matchAll(/<(?:link|script|img|source)\b[^>]*?(?:href|src)=["']([^"']+)["'][^>]*>/gi)){const raw=String(m[1]).split("#")[0].split("?")[0];if(!raw||/^(?:https?:|data:|mailto:|tel:|javascript:|#)/i.test(raw))continue;if(![".css",".js",".mjs",".json",".svg",".png",".jpg",".jpeg",".webp",".ico"].includes(extname(raw).toLowerCase()))continue;out.push(raw)}return out}

for(const marker of cfg.profileMarkers||[]){
  if(!(await exists(marker.file))){fail("missing profile marker file "+marker.file);continue}
  if(!(await read(marker.file)).includes(marker.contains)) fail(marker.file+" missing "+marker.contains);
}
let premium="";
for(const p of cfg.premiumCssFiles||[]){
  if(!(await exists(p))){fail("missing premium CSS "+p);continue}
  premium+=await read(p)+"\n";
}
for(const needle of ["focus-visible","prefers-reduced-motion","pointer:coarse","--iz-premium-touch:44px"]) if(!premium.includes(needle)) fail("premium CSS missing "+needle);

let responsive="";
for(const p of cfg.responsiveFiles||[]){
  if(!(await exists(p))){fail("missing responsive file "+p);continue}
  responsive+=await read(p)+"\n";
}
if(!responsive.includes("@media")) fail("responsive media contract missing");

for(const path of cfg.htmlFiles||[]){
  if(!(await exists(path))){fail("missing HTML "+path);continue}
  const html=await read(path);
  if(Buffer.byteLength(html)>Number(cfg.budgets?.htmlBytes||393216)) fail(path+" exceeds HTML budget");
  if(!/<html\b[^>]*\blang=["'][^"']+["']/i.test(html)) fail(path+" missing html lang");
  if(!/<meta\b[^>]*name=["']viewport["']/i.test(html)) fail(path+" missing viewport");
  if(!/<meta\b[^>]*name=["']description["']/i.test(html)) fail(path+" missing description");
  if(!/<title>[^<]+<\/title>/i.test(html)) fail(path+" missing title");
  const markup=staticMarkup(html);
  const dup=duplicateIds(markup);if(dup.length)fail(path+" duplicate ids: "+dup.join(","));
  if(missingAlt(markup).length)fail(path+" image missing alt");
  const base=dirname(path);
  for(const ref of refs(html)){
    const target=ref.startsWith("/")?resolve(ROOT,ref.slice(1)):resolve(ROOT,base,ref);
    try{await access(target)}catch{fail(path+" broken local asset "+ref)}
  }
}
for(const assertion of cfg.securityAssertions||[]){
  if(!(await exists(assertion.file))){fail("missing security file "+assertion.file);continue}
  const src=(await read(assertion.file)).toLowerCase();
  for(const needle of assertion.needles||[]) if(!src.includes(String(needle).toLowerCase())) fail(assertion.file+" missing security control "+needle);
}
for(const assertion of cfg.sourceAssertions||[]){
  if(!(await exists(assertion.file))){fail("missing source assertion file "+assertion.file);continue}
  const src=await read(assertion.file);
  for(const needle of assertion.needles||[]) if(!src.includes(needle)) fail(assertion.file+" missing source contract "+needle);
}
if(!process.exitCode) console.log("IZAKHONO_PRODUCTION_EXCELLENCE=PASS product="+cfg.product);
