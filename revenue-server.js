require('dotenv').config({ path: require('node:path').join(__dirname, '.env') });
const app = require('./server');

const featureState = {};
function loadFeature(name, file) {
  try {
    const register = require(file);
    const result = typeof register === 'function' ? register(app) : null;
    featureState[name] = { ok: true };
    console.log(`[feature] ${name}: ready`);
    return result || null;
  } catch (error) {
    featureState[name] = { ok: false, error: String(error.message || error).slice(0, 240) };
    console.error(`[feature] ${name}: disabled — ${featureState[name].error}`);
    return null;
  }
}

// Core website, audit, client auth, R500 checkout and Rescue core are provided by ./server.
// Every commercial module is isolated so one optional feature cannot take down the public service.
loadFeature('brand-fallbacks', './brand-fallback-routes');
loadFeature('offers', './offer-routes');
loadFeature('delivery', './delivery-routes');
loadFeature('production', './production-routes');
loadFeature('document-intelligence', './intelligence-routes');
loadFeature('exports', './export-routes');
loadFeature('follow-ups', './followup-routes');
loadFeature('acquisition', './acquisition-routes');
loadFeature('activation', './activation-routes');
loadFeature('go-live', './go-live-routes');
loadFeature('professional-membership', './membership-routes');
loadFeature('firms-practices', './firm-routes');
loadFeature('case-room', './case-room-routes');
loadFeature('case-billing', './case-billing-routes');
loadFeature('notifications', './notification-routes');
loadFeature('reputation', './reputation-routes');
loadFeature('outcomes', './outcome-routes');
loadFeature('public-proof', './public-proof-routes');
loadFeature('referrals', './referral-routes');
loadFeature('institutional-accounts', './institutional-routes');
const communications = loadFeature('communications', './communications-routes');

app.get('/api/features', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, entrypoint: 'revenue-server.js', features: featureState });
});

let scanFollowups = () => {};
try { ({ scanFollowups } = require('./followup-engine')); }
catch (error) { console.error(`[feature] follow-up scanner: disabled — ${String(error.message || error).slice(0, 240)}`); }

const runCommunications = () => communications?.scan ? communications.scan().catch(error => console.error('Communications scan failed:', error.message)) : Promise.resolve();
const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => {
  console.log(`The Chancellor complete v1 ready at http://localhost:${port}`);
  try { scanFollowups(); } catch (error) { console.error('Initial follow-up scan failed:', error.message); }
  setTimeout(runCommunications, 1000).unref();
});

const followupInterval = setInterval(() => { try { scanFollowups(); } catch (error) { console.error('Scheduled follow-up scan failed:', error.message); } }, 15 * 60 * 1000);
followupInterval.unref();
const communicationsIntervalMs=Math.max(15*60*1000,Number(process.env.COMMS_SCAN_INTERVAL_MINUTES||30)*60*1000);
const communicationsInterval=setInterval(runCommunications,communicationsIntervalMs);
communicationsInterval.unref();

function close(signal) {
  console.log(`${signal} received; closing cleanly.`);
  clearInterval(followupInterval);
  clearInterval(communicationsInterval);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => close('SIGTERM'));
process.on('SIGINT', () => close('SIGINT'));
