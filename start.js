const app = require('./server');
require('./membership-routes')(app);
require('./firm-routes')(app);
require('./case-room-routes')(app);
require('./case-billing-routes')(app);
require('./notification-routes')(app);
require('./reputation-routes')(app);
const communications = require('./communications-routes')(app);

const port = Number(process.env.PORT || 3000);

const server = app.listen(port, () => {
  console.log(`The Chancellor ready at http://localhost:${port}`);
});

const reminderIntervalMs = Math.max(15 * 60_000, Number(process.env.COMMS_SCAN_INTERVAL_MINUTES || 30) * 60_000);
const runCommunications = () => communications.scan().catch(error => console.error('Communications scan failed:', error.message));
const communicationsTimer = setInterval(runCommunications, reminderIntervalMs);
communicationsTimer.unref();
setTimeout(runCommunications, 45_000).unref();

function close(signal) {
  console.log(`${signal} received; closing cleanly.`);
  clearInterval(communicationsTimer);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => close('SIGTERM'));
process.on('SIGINT', () => close('SIGINT'));
