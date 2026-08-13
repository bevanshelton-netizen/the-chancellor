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
function scoreAudit(a = {}) {
  const fields = ['registered','taxCompliant','bankAccount','financials','profile','plan','market','revenue','team','opportunity'];
  const score = fields.reduce((sum, key) => sum + (['yes','current','clear'].includes(String(a[key]).toLowerCase()) ? 10 : 0), 0);
  const band = score >= 80 ? 'Opportunity ready' : score >= 60 ? 'Strong foundation' : score >= 40 ? 'Build key foundations' : 'Foundation stage';
  return { score, band };
}
function cleanPublicAudit(a) {
  const { accessHash, ...safe } = a;
  return safe;
}
module.exports = { normalise, hashSecret, verifySecret, accessCode, payfastSignature, scoreAudit, cleanPublicAudit };
