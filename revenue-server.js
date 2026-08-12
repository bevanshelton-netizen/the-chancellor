require('dotenv').config({ path: require('node:path').join(__dirname, '.env') });
const app = require('./server');

const featureState = {};
function loadFeature(name, file) {
  try {
    const register = require(file);
    if (typeof register === 'function') register(app);
    featureState[name] = { ok: true };
    console.log(`[feature] ${name}: ready`);
  } catch (error) {
    featureState[name] = { ok: false, error: String(error.message || error).slice(0, 240) };
    console.error(`[feature] ${name}: disabled — ${featureState[name].error}`);
  }
}

// Core website, audit, portal and R500 checkout are provided by ./server.
// Advanced commercial modules must never be allowed to crash the whole public site.
loadFeature('offers', './offer-routes');
loadFeature('delivery', './delivery-routes');
loadFeature('production', './production-routes');
loadFeature('document-intelligence', './intelligence-routes');
loadFeature('exports', './export-routes');
loadFeature('follow-ups', './followup-routes');
loadFeature('acquisition', './acquisition-routes');
loadFeature('activation', './activation-routes');
loadFeature('go-live', './go-live-routes');

app.get('/api/features', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, features: featureState });
});

let scanFollowups = () => {};
try {
  ({ scanFollowups } = require('./followup-engine'));
} catch (error) {
  console.error(`[feature] follow-up scanner: disabled — ${String(error.message || error).slice(0, 240)}`);
}

const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => {
  console.log(`The Chancellor Growth Desk core server ready at http://localhost:${port}`);
  try { scanFollowups(); } catch (error) { console.error('Initial follow-up scan failed:', error.message); }
});

const followupInterval = setInterval(() => {
  try { scanFollowups(); } catch (error) { console.error('Scheduled follow-up scan failed:', error.message); }
}, 15 * 60 * 1000);
followupInterval.unref();

function close(signal) {
  console.log(`${signal} received; closing cleanly.`);
  clearInterval(followupInterval);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => close('SIGTERM'));
process.on('SIGINT', () => close('SIGINT'));
