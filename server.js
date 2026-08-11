require('dotenv').config({ path: require('node:path').join(__dirname, '.env') });
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const store = require('./store');
const { normalise, hashSecret, verifySecret, accessCode, payfastSignature, scoreAudit, cleanPublicAudit } = require('./core');

const app = express();
const port = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  const required = ['SESSION_SECRET','ADMIN_EMAIL','ADMIN_PASSWORD','APP_URL','PAYFAST_MERCHANT_ID','PAYFAST_MERCHANT_KEY'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length) throw new Error(`Missing required production settings: ${missing.join(', ')}`);
  if (String(process.env.SESSION_SECRET).length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters in production.');
  if (String(process.env.ADMIN_PASSWORD).length < 12) throw new Error('ADMIN_PASSWORD must contain at least 12 characters in production.');
}
if (isProd) app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: { directives: { "img-src": ["'self'", 'data:'], "script-src": ["'self'"], "style-src": ["'self'", "'unsafe-inline'"], "form-action": ["'self'", 'https://sandbox.payfast.co.za', 'https://www.payfast.co.za'] } } }));
app.use(express.json({ limit: '250kb' }));
app.use(express.urlencoded({ extended: false }));
const FileStore = require('session-file-store')(session);
const sessionDir = path.join(process.env.DATA_DIR || path.join(__dirname, 'data'), 'sessions');
fs.mkdirSync(sessionDir, { recursive: true });
app.use(session({ store: new FileStore({ path: sessionDir, retries: 1, ttl: 8 * 60 * 60 }), name: 'growthdesk.sid', secret: process.env.SESSION_SECRET || 'development-only-change-this-secret', resave: false, saveUninitialized: false, cookie: { httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 } }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 80, standardHeaders: true, legacyHeaders: false }));
app.use('/assets', express.static(__dirname, { dotfiles: 'deny' }));
app.use(express.static(__dirname, { extensions: ['html'], dotfiles: 'deny' }));

const requireClient = (req, res, next) => req.session.clientId ? next() : res.status(401).json({ error: 'Please sign in to continue.' });
const requireAdmin = (req, res, next) => req.session.admin ? next() : res.status(401).json({ error: 'Administrator sign-in required.' });
const allowed = (process.env.ALLOWED_UPLOAD_TYPES || 'application/pdf,image/jpeg,image/png').split(',');
const uploadsDir = path.join(process.env.DATA_DIR || path.join(__dirname, 'data'), 'uploads'); fs.mkdirSync(uploadsDir, { recursive: true });
const upload = multer({ storage: multer.diskStorage({ destination: uploadsDir, filename: (_, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname).toLowerCase()}`) }), limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 10) * 1024 * 1024, files: 5 }, fileFilter: (_, file, cb) => cb(null, allowed.includes(file.mimetype)) });

app.get('/api/health', (_, res) => res.json({ ok: true, service: "The Chancellor's Business Growth Desk" }));
app.get('/api/status', (_, res) => res.json({ liveAI: Boolean(process.env.OPENAI_API_KEY), voice: Boolean(process.env.OPENAI_API_KEY) }));
app.post('/api/speech', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'Natural voice is not configured yet.' });
  const text = normalise(req.body.text).replace(/<[^>]+>/g, '').slice(0, 3500);
  if (!text) return res.status(400).json({ error: 'Text is required.' });
  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts', voice: process.env.OPENAI_VOICE || 'cedar', input: text, instructions: 'Speak as a mature, calm and warm business mentor with measured confidence and natural pacing.' }) });
    if (!response.ok) throw new Error('Voice service unavailable');
    res.setHeader('Content-Type', 'audio/mpeg'); res.setHeader('Cache-Control', 'no-store'); res.send(Buffer.from(await response.arrayBuffer()));
  } catch { res.status(502).json({ error: 'Voice generation is temporarily unavailable.' }); }
});
app.post('/api/chat', async (req, res) => {
  const message = normalise(req.body.message).slice(0, 1500); const history = Array.isArray(req.body.history) ? req.body.history.slice(-8) : [];
  if (!message) return res.status(400).json({ error: 'Please enter a message.' });
  let reply;
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', instructions: "You are The Chancellor, an AI Business Adviser for South African SMEs. Be warm, calm and concise. Ask one focused question at a time. Never promise funding, tenders or contracts. Diagnose before recommending. When appropriate, recommend the R500 Business Readiness Audit as the smallest sensible next step. Do not request passwords, bank PINs, identity numbers or card information.", input: [...history, { role: 'user', content: message }] }) });
      if (!response.ok) throw new Error('AI service unavailable'); const result = await response.json(); reply = result.output_text;
    } catch { reply = null; }
  }
  if (!reply) {
    const text = message.toLowerCase();
    reply = text.includes('fund') ? 'Funding readiness starts with evidence. Do you already have current financial statements, management accounts and a clear use-of-funds amount?' : text.includes('tender') || text.includes('contract') ? 'Let us make the opportunity concrete. Do you have the tender or contract requirements, a deadline and a current capability profile?' : history.length < 2 ? 'Thank you. What is the name of your business, what does it sell, and which opportunity matters most right now?' : 'I have enough to recommend a structured next step. The R500 Business Readiness Audit will score ten essentials, identify gaps and give you a practical priority plan. Shall we start your audit?';
  }
  store.insert('messages', { session: req.session.id, role: 'user', content: message }); store.insert('messages', { session: req.session.id, role: 'assistant', content: reply });
  res.json({ reply, ai: Boolean(process.env.OPENAI_API_KEY) });
});

app.post('/api/audits', (req, res) => {
  const required = ['name','email','phone','businessName','industry','goal'];
  if (required.some(k => !normalise(req.body[k]))) return res.status(400).json({ error: 'Please complete every required field.' });
  const code = accessCode(); const scoring = scoreAudit(req.body);
  const audit = store.insert('audits', { name: normalise(req.body.name), email: normalise(req.body.email).toLowerCase(), phone: normalise(req.body.phone), businessName: normalise(req.body.businessName), registrationNumber: normalise(req.body.registrationNumber), industry: normalise(req.body.industry), goal: normalise(req.body.goal), answers: req.body.answers || req.body, ...scoring, status: 'Awaiting payment', accessHash: hashSecret(code), notes: [], recommendation: 'Complete payment and upload supporting documents for human review.' });
  req.session.clientId = audit.id;
  res.status(201).json({ audit: cleanPublicAudit(audit), accessCode: code, message: 'Save this access code. It is shown only once.' });
});

app.post('/api/auth/client', (req, res) => { const db = store.read(); const email = normalise(req.body.email).toLowerCase(); const audit = [...db.audits].reverse().find(a => a.email === email && verifySecret(req.body.code, a.accessHash)); if (!audit) return res.status(401).json({ error: 'Email or access code is incorrect.' }); req.session.clientId = audit.id; res.json({ ok: true }); });
app.post('/api/auth/admin', (req, res) => { const suppliedEmail = Buffer.from(normalise(req.body.email)); const expectedEmail = Buffer.from(normalise(process.env.ADMIN_EMAIL || 'admin@example.co.za')); const emailOk = suppliedEmail.length === expectedEmail.length && crypto.timingSafeEqual(suppliedEmail, expectedEmail); const suppliedPassword = Buffer.from(normalise(req.body.password)); const expectedPassword = Buffer.from(String(process.env.ADMIN_PASSWORD || 'change-me')); const passwordOk = suppliedPassword.length === expectedPassword.length && crypto.timingSafeEqual(suppliedPassword, expectedPassword); if (!emailOk || !passwordOk) return res.status(401).json({ error: 'Sign-in details are incorrect.' }); req.session.admin = true; res.json({ ok: true }); });
app.post('/api/auth/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));

app.get('/api/portal', requireClient, (req, res) => { const db = store.read(); const audit = db.audits.find(a => a.id === req.session.clientId); if (!audit) return res.status(404).json({ error: 'Audit not found.' }); res.json({ audit: cleanPublicAudit(audit), files: db.files.filter(f => f.auditId === audit.id).map(({ storedName, ...f }) => f), payments: db.payments.filter(p => p.auditId === audit.id) }); });
app.post('/api/uploads', requireClient, upload.array('documents', 5), (req, res) => { if (!req.files?.length) return res.status(400).json({ error: 'Choose at least one approved document.' }); const records = req.files.map(file => store.insert('files', { auditId: req.session.clientId, originalName: file.originalname, storedName: file.filename, mime: file.mimetype, size: file.size, status: 'Received' })); store.update('audits', req.session.clientId, { status: 'Documents received' }); res.status(201).json({ files: records.map(({ storedName, ...f }) => f) }); });

app.post('/api/payfast/checkout', requireClient, (req, res) => { const db = store.read(); const audit = db.audits.find(a => a.id === req.session.clientId); const base = normalise(process.env.APP_URL || `http://localhost:${port}`).replace(/\/$/, ''); const fields = { merchant_id: process.env.PAYFAST_MERCHANT_ID, merchant_key: process.env.PAYFAST_MERCHANT_KEY, return_url: `${base}/portal.html?payment=returned`, cancel_url: `${base}/portal.html?payment=cancelled`, notify_url: `${base}/api/payfast/notify`, name_first: audit.name.split(' ')[0], email_address: audit.email, m_payment_id: audit.id, amount: '500.00', item_name: 'Business Readiness Audit' }; fields.signature = payfastSignature(fields, process.env.PAYFAST_PASSPHRASE); const url = process.env.PAYFAST_MODE === 'live' ? 'https://www.payfast.co.za/eng/process' : 'https://sandbox.payfast.co.za/eng/process'; store.insert('payments', { auditId: audit.id, amount: 500, status: 'Initiated', mode: process.env.PAYFAST_MODE || 'sandbox' }); res.json({ url, fields }); });
app.post('/api/payfast/notify', (req, res) => { const received = req.body.signature; const fields = { ...req.body }; delete fields.signature; if (!received || payfastSignature(fields, process.env.PAYFAST_PASSPHRASE) !== received) return res.status(400).send('Invalid signature'); const auditId = req.body.m_payment_id; const db = store.read(); const payment = [...db.payments].reverse().find(p => p.auditId === auditId); if (payment) store.update('payments', payment.id, { status: req.body.payment_status || 'COMPLETE', pfPaymentId: req.body.pf_payment_id }); if (req.body.payment_status === 'COMPLETE') store.update('audits', auditId, { status: 'Paid — awaiting review' }); res.sendStatus(200); });

app.get('/api/admin', requireAdmin, (_, res) => { const db = store.read(); res.json({ metrics: { leads: db.audits.length, paid: db.payments.filter(p => p.status === 'COMPLETE').length, revenue: db.payments.filter(p => p.status === 'COMPLETE').reduce((s,p) => s+p.amount,0), documents: db.files.length }, audits: db.audits.map(cleanPublicAudit), payments: db.payments, files: db.files.map(({ storedName, ...f }) => f) }); });
app.patch('/api/admin/audits/:id', requireAdmin, (req, res) => { const allowedPatch = {}; ['status','recommendation','score','band'].forEach(k => { if (req.body[k] !== undefined) allowedPatch[k] = req.body[k]; }); const audit = store.update('audits', req.params.id, allowedPatch); if (!audit) return res.status(404).json({ error: 'Audit not found.' }); res.json({ audit: cleanPublicAudit(audit) }); });
app.use((err, req, res, next) => { if (err instanceof multer.MulterError) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'A file exceeds the upload limit.' : err.message }); if (err) return res.status(400).json({ error: err.message || 'Request could not be completed.' }); next(); });
if (require.main === module) { const server = app.listen(port, () => console.log(`Growth Desk ready at http://localhost:${port}`)); const close = signal => { console.log(`${signal} received; closing cleanly.`); server.close(() => process.exit(0)); setTimeout(() => process.exit(1), 10_000).unref(); }; process.on('SIGTERM', () => close('SIGTERM')); process.on('SIGINT', () => close('SIGINT')); }
module.exports = app;
