const PDFDocument=require('pdfkit');
const fs=require('node:fs');
const path=require('node:path');
const store=require('./store');
const {SECTION_ACTIONS,priorityList,ensureGrowthOffers}=require('./growth-offer-engine');

const GOLD='#C9A653';
const BLACK='#11100E';
const CREAM='#F4EFE4';
const MUTED='#6F675A';
const GREEN='#2E7D32';
const AMBER='#B7791F';
const RED='#A33A3A';

function bandColour(band='',tone=''){
  const value=`${band} ${tone}`.toLowerCase();
  if(value.includes('scale ready')||value.includes('growth opportunities')||value.includes('green'))return GREEN;
  if(value.includes('vulnerable')||value.includes('amber'))return AMBER;
  return RED;
}
function safeName(value='business'){
  return String(value).replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,60)||'business';
}
function paidForAudit(db,auditId){
  return (db.payments||[]).some(p=>p.auditId===auditId&&String(p.status||'').toUpperCase()==='COMPLETE');
}
function embeddedImage(svgPath){
  try{
    const source=fs.readFileSync(svgPath,'utf8');
    const match=source.match(/data:image\/(webp|png|jpeg|jpg);base64,([^"']+)/i);
    return match?Buffer.from(match[2],'base64'):null;
  }catch{return null}
}
function pageFooter(doc,label='Business Growth Audit'){
  const y=doc.page.height-48;
  doc.strokeColor('#D8CBAF').lineWidth(.5).moveTo(54,y-10).lineTo(doc.page.width-54,y-10).stroke();
  doc.fontSize(8).fillColor(MUTED).text('The Chancellor’s Business Growth Desk · Powered by Izakhono Africa',54,y,{align:'left'});
  doc.text(label,54,y,{align:'right'});
}
function addHeader(doc,audit,crest,subtitle='Business Growth Audit Report'){
  if(crest)doc.image(crest,54,44,{fit:[54,54]});
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(16).text('THE CHANCELLOR’S',122,48);
  doc.fillColor(GOLD).fontSize(10).text('BUSINESS GROWTH DESK',122,70);
  doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(subtitle,122,87);
  doc.strokeColor(GOLD).lineWidth(2).moveTo(54,112).lineTo(doc.page.width-54,112).stroke();
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(24).text(audit.businessName||subtitle,54,136,{width:doc.page.width-108});
  doc.fillColor(MUTED).font('Helvetica').fontSize(10).text(`Prepared for ${audit.name||'Client'} · ${new Date().toLocaleDateString('en-ZA')}`,54,170);
}
function ensureSpace(doc,height=80,label='Business Growth Audit'){
  if(doc.y+height>doc.page.height-70){pageFooter(doc,label);doc.addPage();doc.y=54;}
}
function sectionMeta(audit,section,scoreRaw){
  const detailed=audit.sections?.[section];
  const score=Number(detailed?.score ?? scoreRaw ?? 0);
  const maxScore=Number(detailed?.maxScore ?? 20)||20;
  const pct=Number.isFinite(Number(detailed?.percent))?Number(detailed.percent):Math.round((score/maxScore)*100);
  return {score,maxScore,pct:Math.max(0,Math.min(100,pct))};
}
function requirePaidAudit(req,res){
  if(!req.session?.clientId){res.status(401).json({error:'Please sign in to continue.'});return null}
  const db=store.read();
  const audit=(db.audits||[]).find(a=>a.id===req.session.clientId);
  if(!audit){res.status(404).json({error:'Audit not found.'});return null}
  if(!paidForAudit(db,audit.id)){res.status(402).json({error:'Complete the R500 Business Growth Audit payment before downloading this document.'});return null}
  return {db,audit};
}

function writePriorityBlock(doc,audit){
  const priorities=priorityList(audit,3);
  priorities.forEach((p,i)=>{
    ensureSpace(doc,74);
    const y=doc.y;
    doc.circle(68,y+13,12).fill(GOLD);
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(9).text(String(i+1),64,y+8,{width:8,align:'center'});
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(11).text(p.section,90,y,{width:350});
    doc.fillColor(MUTED).font('Helvetica').fontSize(9.5).text(`${p.percent}% ready · ${p.action}`,90,y+17,{width:390});
    doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(p.summary,90,y+32,{width:390});
    doc.y=y+58;
  });
}

module.exports=function registerReadinessReportRoutes(app){
  app.get('/api/client/readiness-report.pdf',(req,res)=>{
    const ctx=requirePaidAudit(req,res);if(!ctx)return;
    const {audit}=ctx;
    const filename=`${safeName(audit.businessName)}-Business-Growth-Audit-Report.pdf`;
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition',`attachment; filename="${filename}"`);
    res.setHeader('Cache-Control','private, no-store');

    const doc=new PDFDocument({size:'A4',margin:54,info:{Title:`${audit.businessName||'Business'} Business Growth Audit Report`,Author:"The Chancellor's Business Growth Desk"}});
    doc.pipe(res);
    const crest=embeddedImage(path.join(__dirname,'assets','the-chancellor-crest.svg'));
    addHeader(doc,audit,crest,'140-Point Business Growth Audit Report');

    const overallMax=Number(audit.maxScore||140);
    const readinessPercent=Number.isFinite(Number(audit.readinessPercent))?Number(audit.readinessPercent):Math.round((Number(audit.score||0)/overallMax)*100);
    const colour=bandColour(audit.band,audit.bandTone);
    doc.roundedRect(54,204,doc.page.width-108,110,8).fill(CREAM);
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(11).text('OVERALL BUSINESS GROWTH SCORE',72,222);
    doc.fillColor(colour).fontSize(36).text(`${Number(audit.score||0)}/${overallMax}`,72,242);
    doc.fillColor(BLACK).fontSize(11).text(`${readinessPercent}% readiness`,225,250);
    doc.fillColor(colour).fontSize(11).text(String(audit.band||'Growth diagnosis pending'),225,271,{width:245});
    doc.y=342;

    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(15).text('Executive diagnosis');
    doc.moveDown(.35).fillColor(MUTED).font('Helvetica').fontSize(10.5).text(audit.bandMeaning||audit.recommendation||'Your audit identifies the business areas that should receive attention first.',{lineGap:3});
    if(audit.biggestRisk){doc.moveDown(.7).fillColor(BLACK).font('Helvetica-Bold').fontSize(10).text('Biggest risk');doc.fillColor(MUTED).font('Helvetica').fontSize(10).text(audit.biggestRisk,{lineGap:2})}
    if(audit.biggestOpportunity){doc.moveDown(.5).fillColor(BLACK).font('Helvetica-Bold').fontSize(10).text('Biggest opportunity');doc.fillColor(MUTED).font('Helvetica').fontSize(10).text(audit.biggestOpportunity,{lineGap:2})}

    ensureSpace(doc,130);
    doc.moveDown(1).fillColor(BLACK).font('Helvetica-Bold').fontSize(15).text('Score by business area');
    doc.moveDown(.5);
    for(const [section,scoreRaw] of Object.entries(audit.sectionScores||{})){
      ensureSpace(doc,48);
      const {score,maxScore,pct}=sectionMeta(audit,section,scoreRaw);
      const c=pct>=70?GREEN:pct>=40?AMBER:RED;
      const y=doc.y;
      doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(10).text(section,54,y,{width:300});
      doc.fillColor(MUTED).font('Helvetica').text(`${score}/${maxScore}`,doc.page.width-118,y,{width:64,align:'right'});
      doc.roundedRect(54,y+18,doc.page.width-108,8,4).fill('#E7E0D2');
      if(pct>0)doc.roundedRect(54,y+18,(doc.page.width-108)*(pct/100),8,4).fill(c);
      doc.y=y+38;
    }

    ensureSpace(doc,170);
    doc.moveDown(.7).fillColor(BLACK).font('Helvetica-Bold').fontSize(15).text('Top 3 commercial priorities');
    doc.moveDown(.5);
    writePriorityBlock(doc,audit);

    ensureSpace(doc,150);
    doc.moveDown(.7).fillColor(BLACK).font('Helvetica-Bold').fontSize(15).text('The Chancellor’s prescribed first move');
    doc.moveDown(.35).fillColor(MUTED).font('Helvetica').fontSize(10.5).text(audit.recommendation||'Address the highest-priority constraint first, measure the result and then move to the next gap.',{lineGap:3});
    doc.moveDown(.7).fillColor(BLACK).font('Helvetica-Bold').fontSize(10.5).text('Implementation options');
    doc.fillColor(MUTED).font('Helvetica').fontSize(9.5).text('Your client portal now contains three optional implementation levels: a R3,500 Focused Fix, a R7,500 90-Day Business Growth Sprint and a R10,000 Business Growth Implementation Programme. Larger or specialist work is scoped separately before commitment.',{lineGap:2});

    ensureSpace(doc,100);
    doc.moveDown(1.1).fillColor(BLACK).font('Helvetica-Bold').fontSize(10).text('Important notice');
    doc.moveDown(.2).fillColor(MUTED).font('Helvetica').fontSize(8.5).text('This report is a business-growth assessment and planning aid. It does not guarantee funding, tenders, contracts, tax outcomes, debt relief, legal outcomes or investment returns. Regulated matters should be handled by appropriately qualified professionals.',{lineGap:2});
    pageFooter(doc,'Business Growth Audit');
    doc.end();
  });

  app.get('/api/client/implementation-proposal.pdf',(req,res)=>{
    const ctx=requirePaidAudit(req,res);if(!ctx)return;
    const {audit}=ctx;
    const offers=ensureGrowthOffers(audit);
    const priorities=priorityList(audit,3);
    const filename=`${safeName(audit.businessName)}-Growth-Implementation-Proposal.pdf`;
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition',`attachment; filename="${filename}"`);
    res.setHeader('Cache-Control','private, no-store');

    const doc=new PDFDocument({size:'A4',margin:54,info:{Title:`${audit.businessName||'Business'} Growth Implementation Proposal`,Author:"The Chancellor's Business Growth Desk"}});
    doc.pipe(res);
    const crest=embeddedImage(path.join(__dirname,'assets','the-chancellor-crest.svg'));
    addHeader(doc,audit,crest,'Business Growth Implementation Proposal');
    doc.y=214;
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(18).text('From diagnosis to implementation');
    doc.moveDown(.45).fillColor(MUTED).font('Helvetica').fontSize(10.5).text(`Your paid 140-point audit scored ${Number(audit.score||0)}/${Number(audit.maxScore||140)}. This proposal converts the audit findings into three optional implementation levels so you can choose the depth that matches the business, urgency and available budget.`,{lineGap:3});

    doc.moveDown(1).fillColor(BLACK).font('Helvetica-Bold').fontSize(14).text('Priority areas identified');
    doc.moveDown(.4);
    writePriorityBlock(doc,audit);

    ensureSpace(doc,220,'Implementation Proposal');
    doc.moveDown(.8).fillColor(BLACK).font('Helvetica-Bold').fontSize(14).text('Choose your implementation level');
    doc.moveDown(.5);
    offers.sort((a,b)=>Number(a.amount)-Number(b.amount)).forEach((offer,index)=>{
      ensureSpace(doc,145,'Implementation Proposal');
      const y=doc.y;
      doc.roundedRect(54,y,doc.page.width-108,124,8).strokeColor(index===1?GOLD:'#D8CBAF').lineWidth(index===1?1.3:.7).stroke();
      doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(8.5).text(index===0?'OPTION 1 · FOCUSED':index===1?'OPTION 2 · GROWTH SPRINT':'OPTION 3 · IMPLEMENTATION',68,y+12,{width:280});
      doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(13).text(offer.service,68,y+28,{width:340});
      doc.fillColor(BLACK).fontSize(18).text(`R${Number(offer.amount||0).toLocaleString('en-ZA')}`,doc.page.width-175,y+25,{width:105,align:'right'});
      doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(offer.description||'',68,y+51,{width:430,lineGap:2});
      doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(8.5).text('SCOPE',68,y+77);
      doc.fillColor(MUTED).font('Helvetica').fontSize(8.5).text(offer.deliverables||'',68,y+90,{width:430,lineGap:1.5});
      doc.y=y+136;
    });

    ensureSpace(doc,115,'Implementation Proposal');
    doc.moveDown(.5).fillColor(BLACK).font('Helvetica-Bold').fontSize(13).text('How to proceed');
    doc.moveDown(.3).fillColor(MUTED).font('Helvetica').fontSize(10).text('Return to your private Growth Desk portal, review the same three options, accept the option that makes commercial sense and pay securely through PayFast. No implementation option is mandatory.',{lineGap:3});
    doc.moveDown(1).fillColor(BLACK).font('Helvetica-Bold').fontSize(9).text('Scope note');
    doc.fillColor(MUTED).font('Helvetica').fontSize(8.5).text('The R10,000 implementation programme is the starting scope for broader hands-on work. Materially larger projects, specialist professional services or regulated work require a separate written scope and quotation before additional commitment.',{lineGap:2});
    pageFooter(doc,'Implementation Proposal');
    doc.end();
  });
};
