const PDFDocument=require('pdfkit');
const fs=require('node:fs');
const path=require('node:path');
const store=require('./store');

const GOLD='#C9A653';
const BLACK='#11100E';
const CREAM='#F4EFE4';
const MUTED='#6F675A';
const GREEN='#2E7D32';
const AMBER='#B7791F';
const RED='#A33A3A';

const serviceMap={
  'Business Foundation':['Business Foundation Pack','Clarify structure, offer, target customer and 12-month priorities.'],
  'Finance & Cash Flow':['Cash-Flow Improvement','Strengthen records, cash-flow forecasting, costing and financial visibility.'],
  'Finance & Cash Flow':['Finance & Cash-Flow Improvement','Strengthen records, costing, cash-flow visibility and management reporting.'],
  'Sales':['Sales Growth System','Build a repeatable lead, quotation, follow-up and customer-retention process.'],
  'Sales & Revenue':['Sales Growth System','Build a repeatable lead, quotation, follow-up and conversion process.'],
  'Marketing':['Marketing & Lead Generation','Strengthen positioning, channels and measurable weekly marketing activity.'],
  'Marketing & Positioning':['Marketing & Lead Generation','Improve positioning, campaigns, lead generation and measurable marketing activity.'],
  'Digital Presence':['Digital Presence Upgrade','Strengthen website, digital credibility, lead capture and conversion paths.'],
  'Compliance':['Compliance Readiness Pack','Organise statutory, contractual and operating compliance requirements.'],
  'Compliance & Governance':['Compliance Readiness Pack','Organise statutory, contractual and operating compliance requirements.'],
  'Funding Readiness':['Funding Readiness / Investor Pack','Prepare the evidence, business case and supporting documents funders expect.'],
  'Tender & Contract Readiness':['Tender Readiness Package','Build supplier, company-profile, compliance and bid-response readiness.'],
  'Operations':['Operations Improvement Programme','Document procedures, capacity, supplier controls and service standards.'],
  'Operations & Systems':['Operations Improvement Programme','Improve procedures, capacity, controls and service delivery systems.'],
  'People & Leadership':['People & Leadership Improvement','Clarify roles, performance expectations, skills gaps and management rhythm.'],
  'Customer & Reputation':['Customer Growth & Reputation Pack','Improve retention, service consistency, proof and repeat business.'],
  'Growth Potential':['90-Day Growth Strategy','Turn growth opportunities into a practical capacity and execution plan.']
};

function bandColour(band='',tone=''){
  const value=`${band} ${tone}`.toLowerCase();
  if(value.includes('green')||value.includes('growth ready'))return GREEN;
  if(value.includes('amber')||value.includes('nearly')||value.includes('high growth potential'))return AMBER;
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
function pageFooter(doc){
  const y=doc.page.height-48;
  doc.strokeColor('#D8CBAF').lineWidth(.5).moveTo(54,y-10).lineTo(doc.page.width-54,y-10).stroke();
  doc.fontSize(8).fillColor(MUTED).text('The Chancellor’s Business Growth Desk · Powered by Izakhono Africa',54,y,{align:'left'});
  doc.text('Business Readiness Audit',54,y,{align:'right'});
}
function addHeader(doc,audit,crest){
  if(crest)doc.image(crest,54,44,{fit:[54,54]});
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(16).text('THE CHANCELLOR’S',122,48);
  doc.fillColor(GOLD).fontSize(10).text('BUSINESS GROWTH DESK',122,70);
  doc.fillColor(MUTED).font('Helvetica').fontSize(9).text('Business Readiness Report',122,87);
  doc.strokeColor(GOLD).lineWidth(2).moveTo(54,112).lineTo(doc.page.width-54,112).stroke();
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(24).text(audit.businessName||'Business Readiness Report',54,136,{width:doc.page.width-108});
  doc.fillColor(MUTED).font('Helvetica').fontSize(10).text(`Prepared for ${audit.name||'Client'} · ${new Date().toLocaleDateString('en-ZA')}`,54,170);
}
function ensureSpace(doc,height=80){
  if(doc.y+height>doc.page.height-70){pageFooter(doc);doc.addPage();doc.y=54;}
}
function sectionMeta(audit,section,scoreRaw){
  const detailed=audit.sections?.[section];
  const score=Number(detailed?.score ?? scoreRaw ?? 0);
  const maxScore=Number(detailed?.maxScore ?? 10) || 10;
  const pct=Number.isFinite(Number(detailed?.percent))?Number(detailed.percent):Math.round((score/maxScore)*100);
  return {score,maxScore,pct:Math.max(0,Math.min(100,pct))};
}

module.exports=function registerReadinessReportRoutes(app){
  app.get('/api/client/readiness-report.pdf',(req,res)=>{
    if(!req.session?.clientId)return res.status(401).json({error:'Please sign in to continue.'});
    const db=store.read();
    const audit=(db.audits||[]).find(a=>a.id===req.session.clientId);
    if(!audit)return res.status(404).json({error:'Audit not found.'});
    if(!paidForAudit(db,audit.id))return res.status(402).json({error:'Complete the R500 audit payment before downloading your report.'});

    const filename=`${safeName(audit.businessName)}-Business-Readiness-Report.pdf`;
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition',`attachment; filename="${filename}"`);
    res.setHeader('Cache-Control','private, no-store');

    const doc=new PDFDocument({size:'A4',margin:54,info:{Title:`${audit.businessName||'Business'} Business Readiness Report`,Author:"The Chancellor's Business Growth Desk"}});
    doc.pipe(res);
    const crest=embeddedImage(path.join(__dirname,'assets','the-chancellor-crest.svg'));
    addHeader(doc,audit,crest);

    const overallMax=Number(audit.maxScore||90);
    const colour=bandColour(audit.band,audit.bandTone);
    doc.roundedRect(54,204,doc.page.width-108,110,8).fill(CREAM);
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(11).text('OVERALL READINESS',72,222);
    doc.fillColor(colour).fontSize(36).text(`${Number(audit.score||0)}/${overallMax}`,72,242);
    doc.fillColor(BLACK).fontSize(11).text(`${Number(audit.readinessPercent||0)}% ready`,205,250);
    doc.fillColor(colour).fontSize(12).text(String(audit.band||'Readiness pending'),205,271,{width:260});
    doc.y=342;

    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(15).text('What this result means');
    doc.moveDown(.35).fillColor(MUTED).font('Helvetica').fontSize(10.5).text(
      audit.bandMeaning || (String(audit.band||'').toLowerCase().includes('green')
        ? 'Your business shows a strong readiness foundation. The next focus is targeted optimisation and growth execution.'
        : String(audit.band||'').toLowerCase().includes('amber')
        ? 'Your business is viable, but several areas should be strengthened before pursuing bigger opportunities aggressively.'
        : 'Your business has important readiness gaps that should be addressed before taking on greater financial, contractual or operational risk.'),
      {lineGap:3}
    );

    ensureSpace(doc,130);
    doc.moveDown(1).fillColor(BLACK).font('Helvetica-Bold').fontSize(15).text('Readiness by category');
    doc.moveDown(.5);
    for(const [section,scoreRaw] of Object.entries(audit.sectionScores||{})){
      ensureSpace(doc,48);
      const {score,maxScore,pct}=sectionMeta(audit,section,scoreRaw);
      const c=pct>=70?GREEN:pct>=40?AMBER:RED;
      const y=doc.y;
      doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(10).text(section,54,y,{width:280});
      doc.fillColor(MUTED).font('Helvetica').text(`${score}/${maxScore}`,doc.page.width-118,y,{width:64,align:'right'});
      doc.roundedRect(54,y+18,doc.page.width-108,8,4).fill('#E7E0D2');
      if(pct>0)doc.roundedRect(54,y+18,(doc.page.width-108)*(pct/100),8,4).fill(c);
      doc.y=y+38;
    }

    ensureSpace(doc,150);
    doc.moveDown(.7).fillColor(BLACK).font('Helvetica-Bold').fontSize(15).text('Top 3 priorities');
    doc.moveDown(.5);
    (audit.priorities||[]).slice(0,3).forEach((p,i)=>{
      ensureSpace(doc,60);
      const y=doc.y;
      const max=Number(p.maxScore||10);
      const pct=Number.isFinite(Number(p.percent))?Number(p.percent):Math.round((Number(p.score||0)/max)*100);
      doc.circle(68,y+12,12).fill(GOLD);
      doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(9).text(String(i+1),64,y+7,{width:8,align:'center'});
      doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(11).text(p.section,90,y,{width:350});
      doc.fillColor(MUTED).font('Helvetica').fontSize(9.5).text(`${pct}% ready · Priority for strengthening`,90,y+17,{width:350});
      doc.y=y+44;
    });

    ensureSpace(doc,180);
    doc.moveDown(.7).fillColor(BLACK).font('Helvetica-Bold').fontSize(15).text('Recommended next services');
    doc.moveDown(.5);
    const seen=new Set();
    for(const p of (audit.priorities||[]).slice(0,3)){
      const mapped=serviceMap[p.section];
      const service=p.service||mapped?.[0];
      const summary=p.summary||mapped?.[1];
      if(!service||seen.has(service))continue;
      seen.add(service);
      ensureSpace(doc,70);
      const y=doc.y;
      doc.roundedRect(54,y,doc.page.width-108,58,6).strokeColor('#D8CBAF').lineWidth(.7).stroke();
      doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(8.5).text(String(p.section).toUpperCase(),68,y+10,{width:420});
      doc.fillColor(BLACK).fontSize(11).text(service,68,y+24,{width:420});
      doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(summary||'',68,y+39,{width:430});
      doc.y=y+70;
    }

    ensureSpace(doc,120);
    doc.moveDown(.5).fillColor(BLACK).font('Helvetica-Bold').fontSize(15).text('Your immediate next step');
    doc.moveDown(.35).fillColor(MUTED).font('Helvetica').fontSize(10.5).text(audit.recommendation||'Use this report to focus on the highest-priority gaps, then discuss the most appropriate next intervention with The Chancellor’s Business Growth Desk.',{lineGap:3});
    doc.moveDown(1.3).fillColor(BLACK).font('Helvetica-Bold').fontSize(10).text('Important notice');
    doc.moveDown(.2).fillColor(MUTED).font('Helvetica').fontSize(8.5).text('This report is a business-readiness assessment and planning aid. It does not guarantee funding, tenders, contracts, tax outcomes, debt relief, legal outcomes or investment returns. Regulated matters should be handled by appropriately qualified professionals.',{lineGap:2});
    pageFooter(doc);
    doc.end();
  });
};
