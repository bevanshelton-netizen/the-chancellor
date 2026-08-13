const crypto = require('node:crypto');

function normalise(value = '') { return String(value).trim(); }
function hashSecret(secret, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(secret), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifySecret(secret, stored = '') {
  const [salt, expected] = stored.split(':');
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(String(secret), salt, 64);
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
}
function accessCode() { return crypto.randomBytes(4).toString('hex').toUpperCase(); }
function pfEncode(value) { return encodeURIComponent(String(value).trim()).replace(/%20/g, '+'); }
function payfastSignature(fields, passphrase = '') {
  const body = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${pfEncode(value)}`).join('&');
  const signed = passphrase ? `${body}&passphrase=${pfEncode(passphrase)}` : body;
  return crypto.createHash('md5').update(signed).digest('hex');
}

const readinessSections = [
  ['Business Foundation', ['q01','q02','q03','q04','q05']],
  ['Finance & Cash Flow', ['q06','q07','q08','q09','q10']],
  ['Sales', ['q11','q12','q13','q14','q15']],
  ['Marketing', ['q16','q17','q18','q19','q20']],
  ['Compliance', ['q21','q22','q23','q24','q25']],
  ['Funding Readiness', ['q26','q27','q28','q29','q30']],
  ['Tender & Contract Readiness', ['q31','q32','q33','q34','q35']],
  ['Operations', ['q36','q37','q38','q39','q40']],
  ['Growth Potential', ['q41','q42','q43','q44','q45']],
];

function readinessValue(value) {
  const v = String(value ?? '').trim().toLowerCase();
  if (v === '2' || v === 'yes' || v === 'clearly in place') return 2;
  if (v === '1' || v === 'partial' || v === 'partially' || v === 'inconsistent') return 1;
  return 0;
}

function scoreAudit(a = {}) {
  const source = a.answers && typeof a.answers === 'object' ? a.answers : a;
  const sectionScores = {};
  for (const [section, keys] of readinessSections) {
    sectionScores[section] = keys.reduce((sum, key) => sum + readinessValue(source[key]), 0);
  }
  const score = Object.values(sectionScores).reduce((sum, value) => sum + value, 0);
  const maxScore = 90;
  const readinessPercent = Math.round((score / maxScore) * 100);
  const band = score <= 35 ? 'RED - Urgent intervention' : score <= 65 ? 'AMBER - Needs strengthening' : 'GREEN - Growth ready';
  const priorities = Object.entries(sectionScores)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([section, sectionScore]) => ({ section, score: sectionScore, maxScore: 10 }));
  return { score, maxScore, readinessPercent, band, sectionScores, priorities };
}
function cleanPublicAudit(a) {
  const { accessHash, ...safe } = a;
  return safe;
}
module.exports = { normalise, hashSecret, verifySecret, accessCode, payfastSignature, scoreAudit, cleanPublicAudit, readinessSections };
