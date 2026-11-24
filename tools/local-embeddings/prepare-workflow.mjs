import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createEngine, contentReason, hash, CAPS, FORMAT, eligible } from './engine.mjs';

const RUN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const HASH = /^[a-f0-9]{64}$/;
const STATE_CAP = 1048576;
const SNAP_CAP = CAPS.packet + 2048;
const keys = (v, names) => v !== null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).sort().join() === [...names].sort().join();
const fail = reason => { throw new Error(reason); };
const same = (a, b) => a.dev === b.dev && a.ino === b.ino;
const stable = (a, b) => same(a, b) && a.size === b.size && a.mtimeMs === b.mtimeMs && a.ctimeMs === b.ctimeMs;
const identity = s => ({ dev: s.dev, ino: s.ino, size: s.size, mtimeMs: s.mtimeMs, ctimeMs: s.ctimeMs });
const privateMode = (s, mode) => { if (s.uid !== process.getuid() || (s.mode & 0o777) !== mode) fail('permissions'); };

async function ancestors(dir) {
  const checks = [];
  for (let p = path.resolve(dir); ; p = path.dirname(p)) {
    const s = await fs.lstat(p);
    if (!s.isDirectory() || s.isSymbolicLink()) fail('identity');
    checks.push([p, s]);
    if (p === path.dirname(p)) return checks;
  }
}
async function verify(checks) {
  for (const [p, s] of checks) {
    const current = await fs.lstat(p);
    if (!current.isDirectory() || current.isSymbolicLink() || !same(s, current)) fail('identity');
  }
}
async function directory(dir) {
  const parents = await ancestors(path.dirname(dir));
  try { await fs.mkdir(dir, { mode: 0o700 }); } catch (e) { if (e.code !== 'EEXIST') throw e; }
  await verify(parents);
  const s = await fs.lstat(dir);
  if (!s.isDirectory() || s.isSymbolicLink()) fail('identity');
  privateMode(s, 0o700);
}
async function read(file, cap) {
  const parents = await ancestors(path.dirname(file));
  const before = await fs.lstat(file);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1 || before.size > cap) fail('identity');
  privateMode(before, 0o600);
  const h = await fs.open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    if (!stable(before, await h.stat())) fail('identity');
    const buf = Buffer.alloc(before.size + 1);
    let used = 0;
    while (used < buf.length) {
      const { bytesRead } = await h.read(buf, used, buf.length - used, null);
      if (!bytesRead) break;
      used += bytesRead;
    }
    if (used !== before.size || !stable(before, await h.stat()) || !stable(before, await fs.lstat(file))) fail('identity');
    await verify(parents);
    return { value: JSON.parse(buf.subarray(0, used).toString('utf8')), stat: before };
  } finally { await h.close(); }
}
async function syncDir(dir) {
  const h = await fs.open(dir, constants.O_RDONLY | constants.O_NOFOLLOW);
  try { await h.sync(); } finally { await h.close(); }
}
async function exclusive(file, value, cap) {
  const text = JSON.stringify(value);
  if (Buffer.byteLength(text) > cap) fail('bounds');
  const parents = await ancestors(path.dirname(file));
  const h = await fs.open(file, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try {
    const initial = await h.stat();
    await h.writeFile(text);
    await h.sync();
    const final = await h.stat();
    if (!same(initial, final) || !stable(final, await fs.lstat(file))) fail('identity');
    privateMode(final, 0o600);
    await verify(parents);
    await syncDir(path.dirname(file));
    return final;
  } finally { await h.close(); }
}

export function failure(error) {
  const operational = new Set(['service-unavailable', 'service-timeout', 'service-status', 'service-response', 'expired', 'packet-replaced']);
  return operational.has(error?.message)
    ? { status: 'operational_unavailable', reason: error.message }
    : { status: 'security_block', reason: 'invalid-or-uncertain-state-investigate' };
}

// Injection is exclusively a library test seam. The executable accepts no overrides.
export function createWorkflow({ dataDir, engine, now = Date.now }) {
  dataDir = path.resolve(dataDir);
  const runs = path.join(dataDir, 'workflow-runs');
  const packets = path.join(dataDir, 'workflow-packets');
  const snapshotPath = (run, id) => path.join(packets, `${run}-${id}.json`);

  function packetSchema(p, query) {
    if (!keys(p, ['format', 'task', 'createdAt', 'expiresAt', 'trust', 'results']) || p.format !== FORMAT || p.task !== query || p.trust !== 'untrusted-source-data' || !Number.isSafeInteger(p.createdAt) || p.expiresAt !== p.createdAt + 60000 || p.createdAt > now() || !Array.isArray(p.results) || p.results.length > 5) fail('schema');
    for (const r of p.results) {
      if (!keys(r, ['kind', 'path', 'line', 'endLine', 'start', 'end', 'hash', 'chunkHash', 'score', 'snippet', 'trust']) || !eligible(r.kind, r.path) || !HASH.test(r.hash) || !HASH.test(r.chunkHash) || typeof r.snippet !== 'string' || r.snippet.length > 500 || contentReason(r.snippet) || r.trust !== 'untrusted-source-data' || !Number.isFinite(r.score) || r.score < 0 || r.score > 1 || ![r.line, r.endLine, r.start, r.end].every(Number.isSafeInteger) || r.line < 1 || r.endLine < r.line || r.endLine > CAPS.source + 1 || r.start < 0 || r.start % 1800 !== 0 || r.end <= r.start || r.end - r.start > 2000 || r.end > CAPS.source) fail('schema');
    }
    if (now() >= p.expiresAt) fail('expired');
  }
  function stateSchema(s, runId, queryHash) {
    if (!keys(s, ['version', 'runId', 'queryHash', 'indexed', 'requests']) || s.version !== 1 || s.runId !== runId || s.queryHash !== queryHash || !keys(s.indexed, ['memory', 'code']) || !Object.values(s.indexed).every(v => typeof v === 'boolean') || !Array.isArray(s.requests) || s.requests.length > 1000) fail('state');
    const seen = new Set();
    for (const r of s.requests) {
      if (!keys(r, ['requestId', 'snapshotId', 'identity', 'packetHash', 'expiresAt', 'consumed']) || !UUID.test(r.requestId) || !UUID.test(r.snapshotId) || seen.has(r.requestId) || !HASH.test(r.packetHash) || !Number.isSafeInteger(r.expiresAt) || typeof r.consumed !== 'boolean' || !keys(r.identity, ['dev', 'ino', 'size', 'mtimeMs', 'ctimeMs']) || !Object.values(r.identity).every(v => Number.isFinite(v) && v >= 0) || r.identity.size > SNAP_CAP) fail('state');
      seen.add(r.requestId);
    }
  }
  async function checkedPacket(query) {
    const file = path.join(dataDir, 'packet.json');
    const before = await read(file, CAPS.packet);
    const task = before.value?.task;
    if (typeof task !== 'string' || !task.trim() || task.length > 500 || contentReason(task)) fail('schema');
    packetSchema(before.value, task);
    let metadata;
    try { metadata = await engine.validatePacket(task); }
    catch (error) {
      if (['packet-expired', 'packet-schema-or-expired'].includes(error.message) && now() >= before.value.expiresAt) fail('expired');
      throw error;
    }
    const after = await read(file, CAPS.packet);
    packetSchema(after.value, task);
    if (!stable(before.stat, after.stat) || hash(JSON.stringify(before.value)) !== hash(JSON.stringify(after.value))) fail('packet-replaced');
    if (!keys(metadata, ['valid', 'packetHash', 'expiresAt', 'results']) || metadata.valid !== true || metadata.packetHash !== hash(JSON.stringify(after.value)) || metadata.expiresAt !== after.value.expiresAt || metadata.results !== after.value.results.length) fail('integrity');
    if (task !== query) fail('packet-replaced');
    return after.value;
  }

  return async function run(command, runId, requestId, input) {
    if (!['prepare', 'consume', 'refresh'].includes(command) || typeof runId !== 'string' || !RUN.test(runId) || typeof requestId !== 'string' || !UUID.test(requestId) || !keys(input, ['query']) || typeof input.query !== 'string' || !input.query.trim() || input.query.length > 500 || contentReason(input.query)) fail('input');
    const query = input.query;
    const queryHash = hash(query);
    await directory(dataDir);
    await directory(runs);
    await directory(packets);
    const runDir = path.join(runs, runId);
    await directory(runDir);
    const parents = await ancestors(runDir);
    const lock = path.join(runDir, 'write.lock');
    const lockStat = await exclusive(lock, { pid: process.pid }, 100);
    const stateFile = path.join(runDir, 'state.json');
    let stateStat = null;
    async function commit(state) {
      stateSchema(state, runId, queryHash);
      await verify(parents);
      const temp = path.join(runDir, `${randomUUID()}.tmp`);
      const tempStat = await exclusive(temp, state, STATE_CAP);
      if (!stable(tempStat, await fs.lstat(temp))) fail('identity');
      if (stateStat) {
        const current = await read(stateFile, STATE_CAP);
        if (!stable(stateStat, current.stat)) fail('identity');
      } else {
        try { await fs.lstat(stateFile); fail('identity'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
      }
      await verify(parents);
      await fs.rename(temp, stateFile);
      await syncDir(runDir);
      await verify(parents);
      const saved = await read(stateFile, STATE_CAP);
      stateStat = saved.stat;
      if (!same(tempStat, stateStat)) fail('identity');
      if (JSON.stringify(saved.value) !== JSON.stringify(state)) fail('integrity');
    }
    try {
      await verify(parents);
      if ((await fs.readdir(runDir)).some(n => n.endsWith('.tmp'))) fail('interrupted');
      let state;
      try { const loaded = await read(stateFile, STATE_CAP); state = loaded.value; stateStat = loaded.stat; }
      catch (e) {
        if (e.code !== 'ENOENT' || command !== 'prepare') throw e;
        state = { version: 1, runId, queryHash, indexed: { memory: false, code: false }, requests: [] };
        await commit(state);
      }
      stateSchema(state, runId, queryHash);
      const existing = state.requests.find(r => r.requestId === requestId);
      if (command === 'consume') {
        if (!existing || existing.consumed || !state.indexed.memory || !state.indexed.code) fail('replay-or-missing');
        const file = snapshotPath(runId, existing.snapshotId);
        const snapshot = await read(file, SNAP_CAP);
        const s = snapshot.value;
        if (!stable(existing.identity, snapshot.stat) || !keys(s, ['version', 'runId', 'requestId', 'queryHash', 'packetHash', 'expiresAt', 'packet']) || s.version !== 1 || s.runId !== runId || s.requestId !== requestId || s.queryHash !== queryHash || s.packetHash !== existing.packetHash || s.expiresAt !== existing.expiresAt || hash(JSON.stringify(s.packet)) !== s.packetHash) fail('integrity');
        packetSchema(s.packet, query);
        const current = await checkedPacket(query);
        if (hash(JSON.stringify(current)) !== s.packetHash) fail('packet-replaced');
        if (!stable(snapshot.stat, (await read(file, SNAP_CAP)).stat)) fail('identity');
        existing.consumed = true;
        await commit(state);
        if (now() >= s.expiresAt) fail('expired');
        return { status: 'ok', command, runId, requestId, queryHash, packetHash: s.packetHash, expiresAt: s.expiresAt, resultCount: s.packet.results.length, snapshotPath: file };
      }
      if (existing || state.requests.length >= 1000) fail('replay-or-bounds');
      const indexing = {};
      for (const kind of ['memory', 'code']) {
        if (state.indexed[kind]) indexing[kind] = 'already';
        else {
          if (command === 'refresh') fail('not-indexed');
          await engine.index(kind);
          state.indexed[kind] = true;
          await commit(state);
          indexing[kind] = 'indexed';
        }
      }
      await engine.packet(query);
      const packet = await checkedPacket(query);
      const packetHash = hash(JSON.stringify(packet));
      const snapshotId = randomUUID();
      const file = snapshotPath(runId, snapshotId);
      const snapshot = { version: 1, runId, requestId, queryHash, packetHash, expiresAt: packet.expiresAt, packet };
      const stat = await exclusive(file, snapshot, SNAP_CAP);
      state.requests.push({ requestId, snapshotId, identity: identity(stat), packetHash, expiresAt: packet.expiresAt, consumed: false });
      await commit(state);
      if (now() >= packet.expiresAt) fail('expired');
      return { status: 'ok', command, runId, requestId, queryHash, packetHash, expiresAt: packet.expiresAt, resultCount: packet.results.length, snapshotPath: file, indexing };
    } finally {
      await verify(parents);
      if (!stable(lockStat, await fs.lstat(lock))) fail('identity');
      await fs.unlink(lock);
      await syncDir(runDir);
    }
  };
}

const directoryPath = path.dirname(fileURLToPath(import.meta.url));
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 3) fail('usage');
    let text = '';
    for await (const chunk of process.stdin) {
      text += chunk.toString('utf8');
      if (Buffer.byteLength(text) > 8192) fail('input');
    }
    const dataDir = path.join(directoryPath, '.local');
    const engine = createEngine({ memoryRoot: path.resolve(directoryPath, '../..'), codeRoot: '/Users/dusanmilenkovic/Desktop/Hermes/whitelabel', dataDir, cloudConfig: path.join(os.homedir(), '.ollama/server.json') });
    console.log(JSON.stringify(await createWorkflow({ dataDir, engine })(...args, JSON.parse(text))));
  } catch (error) {
    console.error(JSON.stringify(failure(error)));
    process.exitCode = 1;
  }
}
