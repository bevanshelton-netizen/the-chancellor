const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');
const approvedPrefixes = [
  'chancellor-approved-portrait.',
  'chancellor-crest.'
];

const files = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : [];

const hasApprovedPortrait = files.some((name) => name.startsWith(approvedPrefixes[0]));
const hasApprovedCrest = files.some((name) => name.startsWith(approvedPrefixes[1]));

if (!hasApprovedPortrait) {
  console.warn('[identity-gate] No approved Chancellor portrait is present. Human-face promotional creative must not be published. Use crest/logo-led creative only.');
}

if (!hasApprovedCrest) {
  console.warn('[identity-gate] No approved Chancellor crest is present in /assets. Confirm the production crest source before publishing new campaign artwork.');
}

console.log('[identity-gate] Identity guardrail checked.');
