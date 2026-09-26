const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

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

function establishPersistenceProof() {
  const dir = process.env.DATA_DIR;
  const file = path.join(dir, '.runtime-persistence-proof.json');
  let proof = null;
  try {
    if (fs.existsSync(file)) proof = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {}

  const now = new Date().toISOString();
  if (!proof || typeof proof !== 'object' || !proof.id) {
    proof = { id: crypto.randomUUID(), firstBootAt: now, bootCount: 0 };
  }
  proof.bootCount = Math.max(0, Number(proof.bootCount || 0)) + 1;
  proof.lastBootAt = now;
  fs.writeFileSync(file, JSON.stringify(proof, null, 2));

  process.env.IZAKHONO_STORAGE_PROOF_ID = String(proof.id);
  process.env.IZAKHONO_STORAGE_BOOT_COUNT = String(proof.bootCount);
  process.env.IZAKHONO_PERSISTENT_STORAGE_PROVEN =
    process.env.DATA_DIR_FALLBACK_ACTIVE === 'true' ? 'false' : String(proof.bootCount >= 2);

  console.log(`[boot] persistence proof boot count: ${proof.bootCount}`);
  return proof;
}

try {
  ensureWritableDataDir();
  establishPersistenceProof();
  require('./revenue-server');
} catch (error) {
  console.error('[boot] fatal startup error:', error && error.stack ? error.stack : error);
  process.exit(1);
}
