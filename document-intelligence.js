const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const mammoth=require('mammoth');
const XLSX=require('xlsx');
const {PDFParse}=require('pdf-parse');
const store=require('./store');

const uploadsDir=path.join(process.env.DATA_DIR||path.join(__dirname,'data'),'uploads');
const MAX_PER_FILE=60000;
const MAX_ASSIGNMENT_TEXT=180000;

function cleanText(value=''){
  return String(value).replace(/\u0000/g,'').replace(/[\t ]+\n/g,'\n').replace(/\n{4,}/g,'\n\n\n').trim();
}
function checksum(buffer){return crypto.createHash('sha256').update(buffer).digest('hex');}
function filePath(file){return path.join(uploadsDir,path.basename(file.storedName||''));}
function extension(file){return path.extname(file.originalName||file.storedName||'').toLowerCase();}

async function extractPdf(buffer){
  const parser=new PDFParse({data:buffer});
  try{const result=await parser.getText();return {text:cleanText(result.text),meta:{pages:result.total||result.pages?.length||null}}}
  finally{await parser.destroy().catch(()=>{})}
}
async function extractDocx(full){
  const result=await mammoth.extractRawText({path:full});
  return {text:cleanText(result.value),meta:{warnings:(result.messages||[]).map(x=>x.message).slice(0,20)}};
}
function extractXlsx(buffer){
  const wb=XLSX.read(buffer,{type:'buffer',cellDates:true});
  const parts=[];let rows=0;
  for(const name of wb.SheetNames.slice(0,20)){
    const ws=wb.Sheets[name];
    const data=XLSX.utils.sheet_to_json(ws,{header:1,raw:false,defval:'',blankrows:false});
    parts.push(`\n### SHEET: ${name}`);
    for(const row of data.slice(0,300)){
      const line=row.map(v=>String(v??'').trim()).filter(Boolean).join(' | ');
      if(line){parts.push(line);rows++}
      if(parts.join('\n').length>=MAX_PER_FILE)break;
    }
    if(parts.join('\n').length>=MAX_PER_FILE)break;
  }
  return {text:cleanText(parts.join('\n')),meta:{sheets:wb.SheetNames.slice(0,20),rowsCaptured:rows}};
}
async function extractFile(file){
  const full=filePath(file);
  if(!file.storedName||!fs.existsSync(full))return {status:'missing',text:'',warning:'Source file is not available on the server.'};
  const buffer=fs.readFileSync(full),hash=checksum(buffer),ext=extension(file),mime=String(file.mime||'').toLowerCase();
  const db=store.read();
  const existing=(db.sourceExtractions||[]).find(x=>x.fileId===file.id&&x.checksum===hash);
  if(existing)return existing;
  let result={text:'',meta:{}};let status='extracted',warning='';
  try{
    if(ext==='.pdf'||mime==='application/pdf')result=await extractPdf(buffer);
    else if(ext==='.docx'||mime==='application/vnd.openxmlformats-officedocument.wordprocessingml.document')result=await extractDocx(full);
    else if(ext==='.xlsx'||mime==='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')result=extractXlsx(buffer);
    else if(ext==='.txt'||mime.startsWith('text/'))result={text:cleanText(buffer.toString('utf8')),meta:{}};
    else if(mime.startsWith('image/')){status='manual-review';warning='Image content is not automatically OCR-processed. Review the image manually.'}
    else{status='unsupported';warning='This file type is not supported for automatic text extraction.'}
  }catch(error){status='failed';warning=String(error.message||'Extraction failed').slice(0,500)}
  let text=cleanText(result.text||'');
  if(text.length>MAX_PER_FILE){text=text.slice(0,MAX_PER_FILE);warning=[warning,'Extraction was truncated for safe processing.'].filter(Boolean).join(' ')}
  if(status==='extracted'&&!text){status='manual-review';warning=[warning,'No machine-readable text was found. The file may be scanned or image-based.'].filter(Boolean).join(' ')}
  const record={fileId:file.id,auditId:file.auditId,originalName:file.originalName,mime:file.mime,checksum:hash,status,text,characters:text.length,words:text?text.split(/\s+/).filter(Boolean).length:0,meta:result.meta||{},warning,extractedAt:new Date().toISOString()};
  const stale=(db.sourceExtractions||[]).find(x=>x.fileId===file.id);
  return stale?store.update('sourceExtractions',stale.id,record):store.insert('sourceExtractions',record);
}

async function extractAssignmentSources(assignment){
  const db=store.read();
  const files=(db.files||[]).filter(f=>f.auditId===assignment.auditId);
  const extractions=[];
  for(const file of files)extractions.push(await extractFile(file));
  let used=0;const sourceBlocks=[];
  for(const x of extractions){
    if(x.status!=='extracted'||!x.text)continue;
    const remaining=MAX_ASSIGNMENT_TEXT-used;if(remaining<=0)break;
    const text=x.text.slice(0,remaining);used+=text.length;
    sourceBlocks.push(`SOURCE FILE: ${x.originalName}\n${text}`);
  }
  return {files,extractions,sourceText:sourceBlocks.join('\n\n--- END SOURCE ---\n\n'),charactersUsed:used};
}

function publicExtraction(x){return {id:x.id,fileId:x.fileId,originalName:x.originalName,mime:x.mime,status:x.status,characters:x.characters,words:x.words,meta:x.meta,warning:x.warning,extractedAt:x.extractedAt,preview:String(x.text||'').slice(0,2500)};}

module.exports={extractFile,extractAssignmentSources,publicExtraction,MAX_ASSIGNMENT_TEXT};
