require('dotenv').config({ path: require('node:path').join(__dirname, '.env') });
const app = require('./server');
require('./offer-routes')(app);
require('./delivery-routes')(app);
require('./production-routes')(app);
require('./intelligence-routes')(app);
require('./export-routes')(app);
require('./followup-routes')(app);
require('./acquisition-routes')(app);
const {scanFollowups}=require('./followup-engine');

const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => {
  console.log(`Growth Desk revenue, delivery, production, document intelligence, follow-up and acquisition server ready at http://localhost:${port}`);
  try{scanFollowups()}catch(error){console.error('Initial follow-up scan failed:',error.message)}
});

const followupInterval=setInterval(()=>{
  try{scanFollowups()}catch(error){console.error('Scheduled follow-up scan failed:',error.message)}
},15*60*1000);
followupInterval.unref();

function close(signal){
  console.log(`${signal} received; closing cleanly.`);
  clearInterval(followupInterval);
  server.close(()=>process.exit(0));
  setTimeout(()=>process.exit(1),10000).unref();
}
process.on('SIGTERM',()=>close('SIGTERM'));
process.on('SIGINT',()=>close('SIGINT'));
