const fs = require('node:fs');
const path = require('node:path');
const app = require('./server');

const port = Number(process.env.PORT || 3000);

function embeddedImage(svgFile) {
  const svg = fs.readFileSync(path.join(__dirname, 'assets', svgFile), 'utf8');
  const match = svg.match(/data:image\/(webp|jpeg|jpg|png);base64,([^"']+)/i);
  if (!match) throw new Error(`No embedded image found in ${svgFile}`);
  const type = match[1].toLowerCase() === 'jpg' ? 'jpeg' : match[1].toLowerCase();
  return { mime: `image/${type}`, buffer: Buffer.from(match[2], 'base64') };
}

const portrait = embeddedImage('the-chancellor-approved.svg');
const crest = embeddedImage('the-chancellor-crest.svg');

function sendBrandImage(image) {
  return (_req, res) => {
    res.setHeader('Content-Type', image.mime);
    res.setHeader('Cache-Control', 'public, max-age=3600, immutable');
    res.setHeader('Content-Length', String(image.buffer.length));
    res.send(image.buffer);
  };
}

app.get('/brand/chancellor.webp', sendBrandImage(portrait));
app.get('/brand/crest.jpg', sendBrandImage(crest));

const server = app.listen(port, () => {
  console.log(`Growth Desk ready at http://localhost:${port}`);
  console.log(`Brand portrait: ${portrait.buffer.length} bytes; crest: ${crest.buffer.length} bytes`);
});

function close(signal) {
  console.log(`${signal} received; closing cleanly.`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => close('SIGTERM'));
process.on('SIGINT', () => close('SIGINT'));
