const store = require('./store');

const STAGES = ['NEW','CONTACTED','REPLIED','CONVERSATION','AUDIT OFFERED','PAID','PROPOSAL SENT','WON','FOLLOW-UP','LOST'];
const SOURCES = ['Warm network','Edu-Build','Izakhono Africa','UFCE-SA','Radio / media','Referral','WhatsApp','LinkedIn','Facebook','Website','Cold outreach','Other'];
const ACTIVITY_TYPES = ['approach','followup','conversation','proposal','close','payment','note'];

function clean(value, max = 500) {
  return String(value ?? '').trim().replace(/[\u0000-\u001F\u007F]/g, '').slice(0, max);
}
function money(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : 0;
}
function requireAdmin(req, res, next) {
  if (!req.session?.admin) return res.status(401).json({ error: 'Administrator sign-in required.' });
  next();
}
function todayKey(value = new Date()) {
  return new Date(value).toISOString().slice(0, 10);
}
function summarise(db) {
  const day = todayKey();
  const activities = Array.isArray(db.crmActivities) ? db.crmActivities : [];
  const todays = activities.filter(item => todayKey(item.createdAt) === day);
  const count = type => todays.filter(item => item.type === type).length;
  const cash = todays.filter(item => item.type === 'payment').reduce((sum, item) => sum + money(item.amount), 0);
  const leads = Array.isArray(db.crmLeads) ? db.crmLeads : [];
  const stageCounts = Object.fromEntries(STAGES.map(stage => [stage, leads.filter(lead => lead.stage === stage).length]));
  const pipelineValue = leads.filter(lead => !['WON','LOST'].includes(lead.stage)).reduce((sum, lead) => sum + money(lead.value), 0);
  const wonValue = leads.filter(lead => lead.stage === 'WON').reduce((sum, lead) => sum + money(lead.value), 0);
  return {
    date: day,
    targets: { approaches: 30, followups: 10, conversations: 5, proposals: 2, closes: 1 },
    actual: {
      approaches: count('approach'),
      followups: count('followup'),
      conversations: count('conversation'),
      proposals: count('proposal'),
      closes: count('close'),
      payments: count('payment'),
      cash
    },
    stageCounts,
    pipelineValue,
    wonValue,
    leadCount: leads.length
  };
}

module.exports = function registerCrmRoutes(app) {
  app.get('/crm', (_req, res) => res.sendFile(require('node:path').join(__dirname, 'crm.html')));

  app.get('/api/crm', requireAdmin, (_req, res) => {
    const db = store.read();
    const leads = Array.isArray(db.crmLeads) ? db.crmLeads : [];
    const activities = Array.isArray(db.crmActivities) ? db.crmActivities : [];
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, stages: STAGES, sources: SOURCES, metrics: summarise(db), leads: [...leads].reverse(), activities: [...activities].reverse().slice(0, 200) });
  });

  app.post('/api/crm/leads', requireAdmin, (req, res) => {
    const name = clean(req.body.name, 120);
    const businessName = clean(req.body.businessName, 160);
    if (!name && !businessName) return res.status(400).json({ error: 'Add a person or business name.' });
    const stage = STAGES.includes(req.body.stage) ? req.body.stage : 'NEW';
    const source = SOURCES.includes(req.body.source) ? req.body.source : 'Warm network';
    const lead = store.insert('crmLeads', {
      name,
      businessName,
      phone: clean(req.body.phone, 50),
      email: clean(req.body.email, 160).toLowerCase(),
      source,
      category: clean(req.body.category, 100),
      need: clean(req.body.need, 600),
      stage,
      value: money(req.body.value),
      nextAction: clean(req.body.nextAction, 300),
      followUpDate: clean(req.body.followUpDate, 20),
      notes: clean(req.body.notes, 1200)
    });
    res.status(201).json({ lead, metrics: summarise(store.read()) });
  });

  app.patch('/api/crm/leads/:id', requireAdmin, (req, res) => {
    const patch = {};
    const fields = ['name','businessName','phone','email','category','need','nextAction','followUpDate','notes'];
    for (const field of fields) if (field in req.body) patch[field] = clean(req.body[field], field === 'notes' ? 1200 : field === 'need' ? 600 : 300);
    if ('stage' in req.body && STAGES.includes(req.body.stage)) patch.stage = req.body.stage;
    if ('source' in req.body && SOURCES.includes(req.body.source)) patch.source = req.body.source;
    if ('value' in req.body) patch.value = money(req.body.value);
    const lead = store.update('crmLeads', req.params.id, patch);
    if (!lead) return res.status(404).json({ error: 'Lead not found.' });
    res.json({ lead, metrics: summarise(store.read()) });
  });

  app.post('/api/crm/leads/:id/activity', requireAdmin, (req, res) => {
    const db = store.read();
    const lead = (db.crmLeads || []).find(item => item.id === req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found.' });
    const type = ACTIVITY_TYPES.includes(req.body.type) ? req.body.type : 'note';
    const activity = store.insert('crmActivities', {
      leadId: lead.id,
      type,
      note: clean(req.body.note, 700),
      amount: type === 'payment' ? money(req.body.amount) : 0
    });
    const stageMap = { approach: 'CONTACTED', conversation: 'CONVERSATION', proposal: 'PROPOSAL SENT', payment: 'PAID' };
    if (stageMap[type]) store.update('crmLeads', lead.id, { stage: stageMap[type] });
    res.status(201).json({ activity, lead: (store.read().crmLeads || []).find(item => item.id === lead.id), metrics: summarise(store.read()) });
  });
};
