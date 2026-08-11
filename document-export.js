const fs=require('node:fs');
const path=require('node:path');
const PDFDocument=require('pdfkit');
const {Document,Packer,Paragraph,TextRun,HeadingLevel,AlignmentType,BorderStyle,Footer}=require('docx');

function safeName(value='document'){return String(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'document'}
function blocks(markdown=''){
  const out=[];
  for(const raw of String(markdown).split(/\r?\n/)){
    const line=raw.trimEnd();
    if(!line.trim()){out.push({type:'space',text:''});continue}
    if(/^###\s+/.test(line)){out.push({type:'h3',text:line.replace(/^###\s+/, '')});continue}
    if(/^##\s+/.test(line)){out.push({type:'h2',text:line.replace(/^##\s+/, '')});continue}
    if(/^#\s+/.test(line)){out.push({type:'h1',text:line.replace(/^#\s+/, '')});continue}
    if(/^[-*]\s+/.test(line)){out.push({type:'bullet',text:line.replace(/^[-*]\s+/, '')});continue}
    out.push({type:'p',text:line});
  }
  return out;
}
function stripMarks(text=''){return String(text).replace(/\*\*(.*?)\*\*/g,'$1').replace(/`([^`]+)`/g,'$1')}

async function writeDocx({file,service,businessName,clientName,markdown,dateText}){
  const children=[
    new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:320},children:[new TextRun({text:"THE CHANCELLOR'S BUSINESS GROWTH DESK",bold:true,color:'B99452',size:24,allCaps:true})]}),
    new Paragraph({alignment:AlignmentType.CENTER,heading:HeadingLevel.TITLE,spacing:{after:220},children:[new TextRun({text:service,bold:true,color:'111111',size:48})]}),
    new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:160},children:[new TextRun({text:businessName||clientName||'Client',size:30,color:'6F541F'})]}),
    new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:520},children:[new TextRun({text:`Prepared ${dateText} · Build. Position. Fund. Grow. · Powered by Izakhono Africa`,italics:true,color:'666666',size:18})]}),
    new Paragraph({spacing:{after:260},border:{bottom:{style:BorderStyle.SINGLE,size:8,color:'B99452'}},children:[new TextRun({text:'Human-reviewed Growth Desk document. Verify all facts, figures, registrations, compliance claims and financial assumptions against source material before external submission.',italics:true,color:'7A5D25',size:18})]})
  ];
  for(const b of blocks(markdown)){
    const text=stripMarks(b.text);
    if(b.type==='space'){children.push(new Paragraph({text:'',spacing:{after:80}}));continue}
    if(b.type==='h1'){children.push(new Paragraph({heading:HeadingLevel.HEADING_1,spacing:{before:320,after:140},children:[new TextRun({text,bold:true,color:'6F541F'})]}));continue}
    if(b.type==='h2'){children.push(new Paragraph({heading:HeadingLevel.HEADING_2,spacing:{before:260,after:120},children:[new TextRun({text,bold:true,color:'7A5D25'})]}));continue}
    if(b.type==='h3'){children.push(new Paragraph({heading:HeadingLevel.HEADING_3,spacing:{before:200,after:100},children:[new TextRun({text,bold:true,color:'8A6C33'})]}));continue}
    if(b.type==='bullet'){children.push(new Paragraph({bullet:{level:0},spacing:{after:80},children:[new TextRun({text,size:22})]}));continue}
    children.push(new Paragraph({spacing:{after:130,line:330},children:[new TextRun({text,size:22})]}));
  }
  const doc=new Document({creator:"The Chancellor's Business Growth Desk",title:`${service} · ${businessName||clientName||'Client'}`,description:'Human-reviewed business document prepared by The Chancellor Business Growth Desk.',sections:[{properties:{page:{margin:{top:1200,right:1200,bottom:1200,left:1200}}},children,footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:"The Chancellor's Business Growth Desk · Powered by Izakhono Africa",color:'777777',size:16})]})]})}}]});
  const buffer=await Packer.toBuffer(doc);fs.writeFileSync(file,buffer);return buffer.length;
}

function writePdf({file,service,businessName,clientName,markdown,dateText}){
  return new Promise((resolve,reject)=>{
    const doc=new PDFDocument({size:'A4',margin:58,info:{Title:`${service} · ${businessName||clientName||'Client'}`,Author:"The Chancellor's Business Growth Desk"}});
    const stream=fs.createWriteStream(file);doc.pipe(stream);stream.on('finish',()=>resolve(fs.statSync(file).size));stream.on('error',reject);
    doc.rect(0,0,doc.page.width,doc.page.height).fill('#090806');
    doc.fillColor('#D2B26F').font('Helvetica-Bold').fontSize(11).text("THE CHANCELLOR'S BUSINESS GROWTH DESK",58,170,{characterSpacing:2});
    doc.fillColor('#F4EBDD').font('Helvetica-Bold').fontSize(34).text(service,58,220,{width:480});
    doc.fillColor('#D8C7A5').font('Helvetica').fontSize(20).text(businessName||clientName||'Client',58,330,{width:480});
    doc.fillColor('#BDB4A5').fontSize(11).text(`Prepared ${dateText}\nBuild. Position. Fund. Grow.\nPowered by Izakhono Africa`,58,410,{lineGap:5});
    doc.addPage({size:'A4',margin:58});
    doc.fillColor('#7A5D25').font('Helvetica-Oblique').fontSize(9).text('Human-reviewed Growth Desk document. Verify all facts, figures, registrations, compliance claims and financial assumptions against source material before external submission.',{width:475});
    doc.moveDown(1.2);doc.strokeColor('#B99452').lineWidth(1).moveTo(58,doc.y).lineTo(537,doc.y).stroke();doc.moveDown(1.3);
    for(const b of blocks(markdown)){
      const text=stripMarks(b.text);if(b.type==='space'){doc.moveDown(.45);continue}
      if(b.type==='h1'){doc.moveDown(.5).fillColor('#6F541F').font('Helvetica-Bold').fontSize(22).text(text,{lineGap:3});doc.moveDown(.25);continue}
      if(b.type==='h2'){doc.moveDown(.4).fillColor('#7A5D25').font('Helvetica-Bold').fontSize(17).text(text,{lineGap:3});doc.moveDown(.2);continue}
      if(b.type==='h3'){doc.moveDown(.3).fillColor('#8A6C33').font('Helvetica-Bold').fontSize(13).text(text);doc.moveDown(.15);continue}
      if(b.type==='bullet'){doc.fillColor('#222222').font('Helvetica').fontSize(10.5).text(`•  ${text}`,{indent:12,lineGap:3});doc.moveDown(.15);continue}
      doc.fillColor('#222222').font('Helvetica').fontSize(10.5).text(text,{lineGap:4,align:'left'});doc.moveDown(.45);
    }
    doc.moveDown(1);doc.strokeColor('#C7BDA9').moveTo(58,doc.y).lineTo(537,doc.y).stroke();doc.moveDown(.6);doc.fillColor('#777777').font('Helvetica').fontSize(8).text("The Chancellor's Business Growth Desk · Powered by Izakhono Africa · No guarantee of funding, tenders, contracts or investment.");
    doc.end();
  });
}

async function exportReviewedVersion({dir,assignment,audit,version}){
  fs.mkdirSync(dir,{recursive:true});const stem=`${safeName(audit.businessName||audit.name)}-${safeName(assignment.service)}-v${version.number||1}`;const dateText=new Date().toLocaleDateString('en-ZA',{year:'numeric',month:'long',day:'numeric'});const pdf=`${stem}.pdf`,docx=`${stem}.docx`;const pdfPath=path.join(dir,pdf),docxPath=path.join(dir,docx);
  const args={service:assignment.service,businessName:audit.businessName,clientName:audit.name,markdown:version.text,dateText};
  const [pdfSize,docxSize]=await Promise.all([writePdf({file:pdfPath,...args}),writeDocx({file:docxPath,...args})]);
  return [{name:pdf,path:pdfPath,mime:'application/pdf',size:pdfSize},{name:docx,path:docxPath,mime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',size:docxSize}];
}

module.exports={exportReviewedVersion,blocks,safeName};
