const crypto=require('node:crypto');
const PDFDocument=require('pdfkit');
const store=require('./store');

const clean=(v,max=500)=>String(v??'').trim().replace(/[\u0000-\u001F\u007F]/g,'').slice(0,max);
const money=v=>{const n=Number(v||0);return Number.isFinite(n)&&n>=0?Math.round(n*100)/100:0};
const requireAdmin=(req,res,next)=>req.session?.admin?next():res.status(401).json({error:'Administrator sign-in required.'});
const baseUrl=req=>clean(process.env.APP_URL||`${req.protocol}://${req.get('host')}`,500).replace(/\/$/,'');
function getQuote(id){return (store.read().crmQuotes||[]).find(q=>q.id===id)||null}
function paidAmount(db,q){return (db.crmQuotePayments||[]).filter(p=>p.quoteId===q.id&&String(p.status||'').toUpperCase()!=='INITIATED').reduce((s,p)=>s+money(p.amount),0)}
function publicUrl(req,q){return q.publicToken?`${baseUrl(req)}/q/${q.publicToken}`:''}
function acceptanceRef(q){if(!q.acceptedAt)return'';return crypto.createHash('sha256').update([q.id,q.quoteNumber,q.acceptedAt,q.acceptanceIpHash||'',q.acceptanceUserAgent||''].join('|')).digest('hex').slice(0,20).toUpperCase()}
function ensureToken(q){if(q.publicToken)return q;const token=crypto.randomBytes(24).toString('hex');return store.update('crmQuotes',q.id,{publicToken:token})}
function buildPdf(q,db){
  const doc=new PDFDocument({size:'A4',margin:48,info:{Title:`${q.quoteNumber} - The Chancellor`,Author:"The Chancellor's Business Growth Desk",Subject:'Professional quotation'}});
  const gold='#C9A44B',ink='#111827',muted='#6B7280',line='#D1D5DB';
  doc.fillColor(gold).fontSize(10).font('Helvetica-Bold').text("THE CHANCELLOR'S BUSINESS GROWTH DESK",{characterSpacing:1.1});
  doc.moveDown(.4).fillColor(ink).font('Times-Bold').fontSize(26).text('PROFESSIONAL QUOTATION');
  doc.moveDown(.2).font('Helvetica').fontSize(10).fillColor(muted).text(`${q.quoteNumber}  |  Issued ${new Date(q.createdAt).toLocaleDateString('en-ZA')}`);
  doc.moveDown(1.2);doc.strokeColor(line).moveTo(48,doc.y).lineTo(547,doc.y).stroke();doc.moveDown(1);
  const left=48,right=310,y=doc.y;
  doc.fillColor(muted).fontSize(9).font('Helvetica-Bold').text('PREPARED FOR',left,y);doc.fillColor(ink).fontSize(12).text(clean(q.businessName||q.contactName||'Client',160),left,y+16,{width:220});
  if(q.contactName)doc.font('Helvetica').fontSize(10).fillColor(muted).text(clean(q.contactName,120),left,y+34,{width:220});
  doc.fillColor(muted).font('Helvetica-Bold').fontSize(9).text('SERVICE',right,y);doc.fillColor(ink).fontSize(12).text(clean(q.service||'Professional service',180),right,y+16,{width:235});
  doc.y=y+72;doc.moveDown(.5);
  doc.fillColor(muted).font('Helvetica-Bold').fontSize(9).text('SCOPE / DESCRIPTION');doc.moveDown(.35);doc.fillColor(ink).font('Helvetica').fontSize(10.5).text(clean(q.description||'Professional services as discussed and agreed.',1200),{lineGap:3});
  doc.moveDown(1);
  const paid=paidAmount(db,q),out=Math.max(0,money(q.amount)-paid);
  const amountY=doc.y;doc.roundedRect(48,amountY,499,88,10).fillAndStroke('#F9FAFB',line);
  doc.fillColor(muted).font('Helvetica-Bold').fontSize(9).text('QUOTATION TOTAL',64,amountY+16);doc.fillColor(ink).font('Helvetica-Bold').fontSize(18).text(`R${money(q.amount).toFixed(2)}`,64,amountY+31);
  doc.fillColor(muted).fontSize(9).text('PAID',240,amountY+16);doc.fillColor('#166534').fontSize(14).text(`R${paid.toFixed(2)}`,240,amountY+31);
  doc.fillColor(muted).fontSize(9).text('OUTSTANDING',375,amountY+16);doc.fillColor(out>0?'#991B1B':'#166534').fontSize(14).text(`R${out.toFixed(2)}`,375,amountY+31);
  if(q.depositRequired)doc.fillColor(muted).font('Helvetica').fontSize(9).text(`Deposit required: R${money(q.depositRequired).toFixed(2)}`,64,amountY+61);
  doc.y=amountY+110;
  doc.fillColor(muted).fontSize(9).text(`Valid until: ${q.expiresAt?new Date(q.expiresAt).toLocaleDateString('en-ZA'):'Not specified'}`);
  doc.moveDown(.6).text(`Status: ${clean(q.status||'SENT',80)}`);
  if(q.acceptedAt){doc.moveDown(1);doc.fillColor(gold).font('Helvetica-Bold').fontSize(10).text('ACCEPTANCE RECORD');doc.moveDown(.35);doc.fillColor(ink).font('Helvetica').fontSize(9.5).text(`Accepted electronically: ${new Date(q.acceptedAt).toLocaleString('en-ZA')}`);doc.text(`Acceptance reference: ${acceptanceRef(q)}`);}
  doc.moveDown(1.4);doc.strokeColor(line).moveTo(48,doc.y).lineTo(547,doc.y).stroke();doc.moveDown(.7);
  doc.fillColor(muted).fontSize(8.5).text('Acceptance confirms approval of the quoted scope and value. Payment is subject to the configured payment gateway and the agreed commercial terms. Never send banking PINs, passwords or card details by message.');
  doc.moveDown(.8).fillColor(ink).font('Helvetica-Bold').fontSize(9).text("The Chancellor's Business Growth Desk");
  return doc;
}
async function sendEmail(to,subject,html){
  if(!process.env.RESEND_API_KEY||!process.env.COMMS_FROM_EMAIL)return{status:'Unavailable',detail:'Email delivery is not configured'};
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.COMMS_FROM_EMAIL,to:[to],subject,html})});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.message||`Resend ${r.status}`);return{status:'Sent',provider:'Resend',id:j.id||''};
}
function whatsappUrl(phone,text){let d=clean(phone,50).replace(/\D/g,'');if(d.startsWith('0'))d=`27${d.slice(1)}`;if(!d)return'';return`https://wa.me/${d}?text=${encodeURIComponent(text)}`}

module.exports=function registerCommercialDocuments(app){
  app.get('/api/crm/quotes/:id/pdf',requireAdmin,(req,res)=>{let q=getQuote(req.params.id);if(!q)return res.status(404).json({error:'Quotation not found.'});q=ensureToken(q);const db=store.read();res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename="${q.quoteNumber}.pdf"`);res.setHeader('Cache-Control','no-store');buildPdf(q,db).pipe(res);buildPdf;});
  app.get('/q/:token/pdf',(req,res)=>{const db=store.read(),q=(db.crmQuotes||[]).find(x=>x.publicToken===req.params.token);if(!q)return res.status(404).send('Quotation not found');res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`inline; filename="${q.quoteNumber}.pdf"`);res.setHeader('Cache-Control','no-store');const doc=buildPdf(q,db);doc.pipe(res);doc.end();});
  app.post('/api/crm/quotes/:id/email',requireAdmin,async(req,res)=>{try{let q=getQuote(req.params.id);if(!q)return res.status(404).json({error:'Quotation not found.'});q=ensureToken(q);if(!q.email)return res.status(400).json({error:'This quotation has no client email address.'});const url=publicUrl(req,q),subject=`Quotation ${q.quoteNumber} - The Chancellor`,html=`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto"><h2>${subject}</h2><p>Good day ${clean(q.contactName||'',80)},</p><p>Your quotation for <strong>${clean(q.service,180)}</strong> is ready.</p><p><strong>Total: R${money(q.amount).toFixed(2)}</strong></p><p><a href="${url}">Review, accept and pay securely</a></p><p><a href="${url}/pdf">View quotation PDF</a></p><p>Regards,<br>The Chancellor's Business Growth Desk</p></div>`;const sent=await sendEmail(q.email,subject,html);store.insert('crmActivities',{leadId:q.leadId,type:'proposal',note:`Quotation ${q.quoteNumber} delivery: ${sent.status} by email`,amount:0});res.json({ok:true,delivery:sent,publicUrl:url,pdfUrl:`${url}/pdf`})}catch(err){res.status(502).json({error:String(err.message||err)})}});
  app.post('/api/crm/quotes/:id/delivery',requireAdmin,(req,res)=>{let q=getQuote(req.params.id);if(!q)return res.status(404).json({error:'Quotation not found.'});q=ensureToken(q);const url=publicUrl(req,q),pdf=`${url}/pdf`,message=`Good day ${clean(q.contactName||'',80)}. Your quotation ${q.quoteNumber} from The Chancellor's Business Growth Desk is ready. Review and accept: ${url} PDF: ${pdf}`;res.json({publicUrl:url,pdfUrl:pdf,whatsappUrl:whatsappUrl(q.phone,message),emailConfigured:Boolean(process.env.RESEND_API_KEY&&process.env.COMMS_FROM_EMAIL),acceptedAt:q.acceptedAt||null,acceptanceReference:acceptanceRef(q)})});
};
