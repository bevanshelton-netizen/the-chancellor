const app = require('./server');
require('./membership-routes')(app);
require('./firm-routes')(app);
require('./case-room-routes')(app);

const port = Number(process.env.PORT || 3000);

const server = app.listen(port, () => {
  console.log(`The Chancellor ready at http://localhost:${port}`);
});

function close(signal) {
  console.log(`${signal} received; closing cleanly.`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => close('SIGTERM'));
process.on('SIGINT', () => close('SIGINT'));
