/**
 * lib/database/db.js
 * Safe JSON persistence layer — drop-in replaceable with MongoDB.
 * All operations are atomic: write to .tmp → rename → done.
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { config } from '../../config.js';
import { logger } from '../utils/logger.js';

const DB_DIR = path.resolve(config.db.path);
const _writeLocks = new Map();   // in-process write locks

// ── Ensure DB directory exists ──────────────────────────────────────────────
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

/**
 * Resolve the absolute path for a collection file.
 * @param {string} collection - e.g. 'players', 'economy', 'world'
 */
function filePath(collection) {
  return path.join(DB_DIR, `${collection}.json`);
}

/**
 * Read an entire collection. Returns {} if file missing or corrupt.
 * @param {string} collection
 * @returns {Object}
 */
export function readCollection(collection) {
  const fp = filePath(collection);
  try {
    if (!fs.existsSync(fp)) return {};
    const raw = fs.readFileSync(fp, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    logger.error({ collection, err }, 'DB read error — returning empty');
    return {};
  }
}

/**
 * Write an entire collection atomically.
 * Uses tmp-file + rename to prevent corruption on crash.
 * @param {string} collection
 * @param {Object} data
 */
export async function writeCollection(collection, data) {
  // Serialize writes to the same collection
  while (_writeLocks.get(collection)) {
    await new Promise(r => setTimeout(r, 10));
  }
  _writeLocks.set(collection, true);

  const fp  = filePath(collection);
  const tmp = fp + '.tmp';

  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, fp);
  } catch (err) {
    logger.error({ collection, err }, 'DB write error');
    try { fs.unlinkSync(tmp); } catch {}
    throw err;
  } finally {
    _writeLocks.delete(collection);
  }
}

/**
 * Get a single record by id from a collection.
 */
export function getRecord(collection, id) {
  const col = readCollection(collection);
  return col[id] ?? null;
}

/**
 * Upsert a single record into a collection.
 */
export async function setRecord(collection, id, data) {
  const col = readCollection(collection);
  col[id] = { ...data, _updatedAt: Date.now() };
  await writeCollection(collection, col);
  return col[id];
}

/**
 * Delete a single record.
 */
export async function deleteRecord(collection, id) {
  const col = readCollection(collection);
  delete col[id];
  await writeCollection(collection, col);
}

/**
 * Check if a record exists.
 */
export function hasRecord(collection, id) {
  const col = readCollection(collection);
  return Object.prototype.hasOwnProperty.call(col, id);
}

/**
 * Get all records from a collection as an array.
 */
export function getAllRecords(collection) {
  const col = readCollection(collection);
  return Object.entries(col).map(([id, data]) => ({ id, ...data }));
}

/**
 * Patch (partial update) a record without overwriting the whole document.
 */
export async function patchRecord(collection, id, patch) {
  const col = readCollection(collection);
  if (!col[id]) throw new Error(`Record ${id} not found in ${collection}`);
  col[id] = { ...col[id], ...patch, _updatedAt: Date.now() };
  await writeCollection(collection, col);
  return col[id];
}

export default {
  readCollection,
  writeCollection,
  getRecord,
  setRecord,
  deleteRecord,
  hasRecord,
  getAllRecords,
  patchRecord,
};
