const app = require('./server');

function mount(modulePath,label=modulePath){
  try {
    const register=require(modulePath);
    const result=register(app);
    console.log(`Mounted ${label}`);
    return result||null;
  } catch(error) {
    console.error(`Optional module ${label} failed to mount:`,error.message);
    return null;
  }
}

mount('./brand-fallback-routes','brand fallbacks');
mount('./client-access-recovery-routes','client access recovery');
mount('./membership-routes','membership');
mount('./firm-routes','firms');
mount('./case-room-routes','case room');
mount('./case-billing-routes','case billing');
mount('./notification-routes','notifications');
mount('./reputation-routes','reputation');
mount('./outcome-routes','outcomes');
mount('./public-proof-routes','public proof');
mount('./referral-routes','referrals');
mount('./institutional-routes','institutional accounts');
const communications=mount('./communications-routes','communications');

const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => console.log(`The Chancellor ready at http://localhost:${port}`));

const reminderIntervalMs = Math.max(15 * 60_000, Number(process.env.COMMS_SCAN_INTERVAL_MINUTES || 30) * 60_000);
const runCommunications = () => communications?.scan ? communications.scan().catch(error => console.error('Communications scan failed:', error.message)) : Promise.resolve();
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
