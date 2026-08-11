const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, '..', 'data');
const file = path.join(dataDir, 'desk.json');
const empty = { audits: [], messages: [], files: [], payments: [], offers: [], offerPayments: [], rescueCases: [], professionals: [], credentialFiles: [], firms: [] };
function ensure() { fs.mkdirSync(dataDir, { recursive: true }); if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(empty, null, 2)); }
function read() { ensure(); try { return { ...empty, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch { return structuredClone(empty); } }
function write(data) { ensure(); const tmp = `${file}.tmp`; fs.writeFileSync(tmp, JSON.stringify(data, null, 2)); fs.renameSync(tmp, file); return data; }
function id(prefix) { return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`; }
function insert(collection, record) { const db = read(); if (!Array.isArray(db[collection])) db[collection] = []; const item = { id: id(collection.slice(0,3)), createdAt: new Date().toISOString(), ...record }; db[collection].push(item); write(db); return item; }
function update(collection, recordId, patch) { const db = read(); if (!Array.isArray(db[collection])) return null; const index = db[collection].findIndex(x => x.id === recordId); if (index < 0) return null; db[collection][index] = { ...db[collection][index], ...patch, updatedAt: new Date().toISOString() }; write(db); return db[collection][index]; }
module.exports = { read, write, insert, update, id };
