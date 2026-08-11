require('dotenv').config({ path: require('node:path').join(__dirname, '.env') });
const app = require('./server');
require('./offer-routes')(app);
require('./delivery-routes')(app);
require('./production-routes')(app);

const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => console.log(`Growth Desk revenue, delivery and production server ready at http://localhost:${port}`));

function close(signal){
  console.log(`${signal} received; closing cleanly.`);
  server.close(()=>process.exit(0));
  setTimeout(()=>process.exit(1),10000).unref();
}
process.on('SIGTERM',()=>close('SIGTERM'));
process.on('SIGINT',()=>close('SIGINT'));
