const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function ensureWritableDataDir() {
  const configured = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'data');
  const fallback = path.join(os.tmpdir(), 'chancellor-data');

  const probe = dir => {
    fs.mkdirSync(dir, { recursive: true });
    const marker = path.join(dir, `.write-probe-${process.pid}`);
    fs.writeFileSync(marker, 'ok');
    fs.unlinkSync(marker);
    return dir;
  };

  try {
    process.env.DATA_DIR = probe(configured);
    console.log(`[boot] data directory ready: ${process.env.DATA_DIR}`);
  } catch (error) {
    console.error(`[boot] configured DATA_DIR unavailable (${configured}): ${error.code || error.message}`);
    process.env.DATA_DIR = probe(fallback);
    process.env.DATA_DIR_FALLBACK_ACTIVE = 'true';
    console.warn(`[boot] using temporary writable fallback: ${process.env.DATA_DIR}`);
  }
}

try {
  ensureWritableDataDir();
  require('./revenue-server');
} catch (error) {
  console.error('[boot] fatal startup error:', error && error.stack ? error.stack : error);
  process.exit(1);
}
