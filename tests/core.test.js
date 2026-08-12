const assert=require('node:assert/strict');
const {hashSecret,verifySecret,payfastSignature,scoreAudit}=require('../core');
const {scoreRescueTriage}=require('../rescue-triage');

function test(name,fn){try{fn();console.log(`✓ ${name}`)}catch(error){console.error(`✗ ${name}`);throw error}}

test('access secrets verify and reject wrong values',()=>{const stored=hashSecret('ABCD1234');assert.equal(verifySecret('ABCD1234',stored),true);assert.equal(verifySecret('WRONG',stored),false)});
test('PayFast signatures are deterministic and sensitive to amount',()=>{const a=payfastSignature({merchant_id:'10000100',amount:'199.00',item_name:'Membership'},'secret');const b=payfastSignature({merchant_id:'10000100',amount:'199.00',item_name:'Membership'},'secret');const c=payfastSignature({merchant_id:'10000100',amount:'999.00',item_name:'Membership'},'secret');assert.equal(a,b);assert.notEqual(a,c)});
test('business readiness score caps at 100',()=>{const yes={registered:'yes',taxCompliant:'yes',bankAccount:'yes',financials:'yes',profile:'yes',plan:'yes',market:'yes',revenue:'yes',team:'yes',opportunity:'yes'};assert.equal(scoreAudit(yes).score,100)});
test('Rescue triage ignores browser supplied score',()=>{const t=scoreRescueTriage({type:'debt',amount:10000,income:5000,expenses:3000,days:60,flags:[],triage:{score:100}});assert.notEqual(t.score,100);assert.equal(t.band,'Low')});
test('critical enforcement flags raise Rescue urgency',()=>{const t=scoreRescueTriage({type:'legal',amount:100000,income:10000,expenses:11000,days:2,flags:['summons','repossession']});assert.equal(t.band,'Critical');assert.ok(t.score>=80)});
test('unknown Rescue flags are discarded',()=>{const t=scoreRescueTriage({type:'tax',flags:['tax_debt','invented_flag']});assert.deepEqual(t.flags,['tax_debt'])});
test('negative financial inputs are clamped',()=>{const t=scoreRescueTriage({type:'debt',amount:-5,income:-10,expenses:-20,days:-1});assert.equal(t.amount,0);assert.equal(t.income,0);assert.equal(t.expenses,0);assert.equal(t.days,0)});
console.log('All Chancellor core integrity tests passed.');