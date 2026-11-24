import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash, randomUUID } from 'node:crypto';

export const MODEL = 'qwen3-embedding:0.6b';
export const FORMAT = 'local-embedding-v1:chars2000:overlap200:dim1024';
export const CAPS = Object.freeze({ source: 1048576, response: 2097152, index: 536870912, packet: 16384, config: 16384, files: 20000, chunks: 25000 });
const MEMORY = ['context', 'assumptions', 'decisions', 'lessons-learned'].map(name => `memory/${name}.md`);
const EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.md', '.mdx']);
const EXCLUDED = new Set(['node_modules', 'vendor', 'dist', 'build', 'coverage', 'generated', '__generated__']);
const PRIVATE_NAME = /(?:\.env|secret|credential|password|private|key|pem|p12|pfx|crt)/i;
const HASH = /^[a-f0-9]{64}$/;
export const hash = value => createHash('sha256').update(value).digest('hex');
const fail = code => { throw new Error(code); };
const same = (a, b) => a.dev === b.dev && a.ino === b.ino;
const unchanged = (a, b) => same(a, b) && a.size === b.size && a.mtimeMs === b.mtimeMs && a.ctimeMs === b.ctimeMs;
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const keys = (value, expected) => plain(value) && Object.keys(value).sort().join(',') === [...expected].sort().join(',');
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const skip = (counts, reason) => { counts[reason] = (counts[reason] || 0) + 1; };

// Reject every symlink component, not merely escapes from the source root.
async function ancestors(target) {
  const result = [];
  for (let p = path.resolve(target); ; p = path.dirname(p)) {
    const stat = await fs.lstat(p);
    if (!stat.isDirectory() || stat.isSymbolicLink()) fail('unsafe-ancestor');
    result.push([p, stat]);
    if (path.dirname(p) === p) break;
  }
  return result;
}

async function verifyAncestors(snapshot) {
  for (const [p, stat] of snapshot) {
    const now = await fs.lstat(p);
    if (!now.isDirectory() || now.isSymbolicLink() || !same(stat, now)) fail('ancestor-changed');
  }
}

function ownerOnly(stat) {
  if (stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0 || stat.nlink !== 1) fail('unsafe-output-permissions');
}

async function readBounded(file, cap, privateFile = false) {
  const parents = await ancestors(path.dirname(file));
  const before = await fs.lstat(file);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1) fail('nonregular');
  if (before.size > cap) fail('size');
  if (privateFile) ownerOnly(before);
  const handle = await fs.open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = await handle.stat();
    if (!unchanged(before, opened)) fail('source-changed');
    const buffer = Buffer.alloc(before.size + 1);
    let used = 0;
    while (used < buffer.length) {
      const { bytesRead } = await handle.read(buffer, used, buffer.length - used, null);
      if (!bytesRead) break;
      used += bytesRead;
    }
    if (used !== before.size || !unchanged(opened, await handle.stat()) || !unchanged(opened, await fs.lstat(file))) fail('source-changed');
    await verifyAncestors(parents);
    return buffer.subarray(0, used);
  } finally { await handle.close(); }
}

export function contentReason(text) {
  if (/\u0000|\ufffd/.test(text)) return 'binary';
  if (/@generated|auto[- ]?generated|generated file|do not edit/i.test(text)) return 'generated';
  if (/-----BEGIN [^-]*(?:PRIVATE KEY|CERTIFICATE)-----|\bBearer\s+[A-Za-z0-9._~+\/-]+=*|\b(?:sk-[A-Za-z0-9_-]{12,}|AKIA[A-Z0-9]{16}|gh[pousr]_[A-Za-z0-9]{16,})|(?:api[_-]?(?:key|token)|access[_-]?token|auth[_-]?token|refresh[_-]?token|client[_-]?secret|password|passwd|credential|private[_-]?key|secret)\s*["']?\s*[:=]\s*[^\s,;}]+/i.test(text)) return 'sensitive-content';
  return null;
}

export function eligible(kind, relative) {
  if (typeof relative !== 'string' || relative.length > 1024 || relative.includes('\\') || path.posix.normalize(relative) !== relative || path.isAbsolute(relative)) return false;
  const parts = relative.split('/');
  if (parts.some(p => !p || p === '..' || p.startsWith('.') || EXCLUDED.has(p.toLowerCase()) || PRIVATE_NAME.test(p))) return false;
  if (kind === 'memory') return MEMORY.includes(relative);
  return kind === 'code' && (['README.md', 'ARCHITECTURE.md'].includes(relative) || (parts.length >= 4 && ['apps', 'packages'].includes(parts[0]) && parts[2] === 'src' && EXT.has(path.extname(relative))));
}

export function chunks(text) {
  const result = [];
  for (let start = 0; start < text.length; start += 1800) {
    const end = Math.min(start + 2000, text.length);
    const piece = text.slice(start, end);
    result.push({ start, end, line: text.slice(0, start).split('\n').length, endLine: text.slice(0, end).split('\n').length, hash: hash(piece) });
    if (end === text.length) break;
  }
  return result;
}

// Built-in HTTP deliberately ignores proxy/host environment and never follows redirects.
export function localRequest(endpoint, body) {
  if (!['/api/status', '/api/embed'].includes(endpoint)) fail('endpoint');
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    let finished = false;
    const done = (error, value) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (error) reject(new Error(error)); else resolve(value);
    };
    const request = http.request({ hostname: '127.0.0.1', port: 11434, path: endpoint, method: payload ? 'POST' : 'GET', agent: false, headers: payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {} }, response => {
      if (response.statusCode !== 200) { done('service-status'); response.destroy(); return; }
      let size = 0;
      const buffers = [];
      response.on('data', buffer => {
        size += buffer.length;
        if (size > CAPS.response) { done('response-size'); response.destroy(); return; }
        buffers.push(buffer);
      });
      response.on('error', () => done('service-response'));
      response.on('end', () => {
        try { done(null, JSON.parse(Buffer.concat(buffers).toString('utf8'))); }
        catch { done('response-json'); }
      });
    });
    const timer = setTimeout(() => { done('service-timeout'); request.destroy(); }, 30000);
    request.on('error', () => done('service-unavailable'));
    request.end(payload);
  });
}

function vectorOK(vector) {
  return Array.isArray(vector) && vector.length === 1024 && vector.every(n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1) && vector.some(n => n !== 0);
}

export function createEngine({ memoryRoot, codeRoot, dataDir, cloudConfig, transport = localRequest, now = Date.now }) {
  const roots = { memory: path.resolve(memoryRoot), code: path.resolve(codeRoot) };
  dataDir = path.resolve(dataDir);
  const sourcePath = (kind, relative) => {
    if (!eligible(kind, relative)) fail('ineligible-path');
    return path.join(roots[kind], relative);
  };
  const indexPath = kind => {
    if (!Object.hasOwn(roots, kind)) fail('kind');
    return path.join(dataDir, `${kind}.json`);
  };

  async function source(kind, relative) {
    const file = sourcePath(kind, relative);
    const identity = await fs.lstat(file);
    const buffer = await readBounded(file, CAPS.source);
    if (!unchanged(identity, await fs.lstat(file))) fail('source-changed');
    const text = buffer.toString('utf8');
    const reason = contentReason(text);
    if (reason) fail(reason);
    return { text, hash: hash(buffer), identity };
  }

  async function walk(kind) {
    indexPath(kind);
    await ancestors(roots[kind]);
    const files = [];
    const skipped = {};
    async function visit(relative) {
      const parts = relative.split('/');
      if (parts.some(p => p.startsWith('.') || EXCLUDED.has(p.toLowerCase()) || PRIVATE_NAME.test(p))) { skip(skipped, 'excluded-name'); return; }
      const file = path.join(roots[kind], relative);
      let stat;
      try { stat = await fs.lstat(file); }
      catch (error) { if (error.code === 'ENOENT') { skip(skipped, 'missing'); return; } throw error; }
      if (stat.isSymbolicLink()) { skip(skipped, 'symlink'); return; }
      if (stat.isDirectory()) {
        const parents = await ancestors(file);
        const names = (await fs.readdir(file)).sort(compare);
        await verifyAncestors(parents);
        for (const name of names) await visit(`${relative}/${name}`);
        await verifyAncestors(parents);
      } else if (!stat.isFile() || stat.nlink !== 1) skip(skipped, 'nonregular');
      else if (!eligible(kind, relative)) skip(skipped, 'extension-or-scope');
      else {
        try { await source(kind, relative); files.push(relative); }
        catch (error) {
          if (['size', 'binary', 'generated', 'sensitive-content'].includes(error.message)) skip(skipped, error.message);
          else throw error;
        }
        if (files.length > CAPS.files) fail('file-count');
      }
    }
    if (kind === 'memory') { for (const file of MEMORY) await visit(file); }
    else {
      for (const file of ['README.md', 'ARCHITECTURE.md']) await visit(file);
      for (const base of ['apps', 'packages']) {
        const directory = path.join(roots.code, base);
        const parents = await ancestors(directory);
        for (const name of (await fs.readdir(directory)).sort(compare)) {
          if (name.startsWith('.') || EXCLUDED.has(name.toLowerCase()) || PRIVATE_NAME.test(name)) { skip(skipped, 'excluded-name'); continue; }
          const stat = await fs.lstat(path.join(directory, name));
          if (stat.isSymbolicLink() || !stat.isDirectory()) { skip(skipped, 'nonregular'); continue; }
          await visit(`${base}/${name}/src`);
        }
        await verifyAncestors(parents);
      }
    }
    return { files: files.sort(compare), skipped };
  }

  async function embed(input) {
    if (!Array.isArray(input) || !input.length || input.length > 16 || input.some(t => typeof t !== 'string' || !t.length || t.length > 2000 || contentReason(t))) fail('embed-input');
    const config = JSON.parse((await readBounded(cloudConfig, CAPS.config)).toString('utf8'));
    if (!plain(config) || config.disable_ollama_cloud !== true) fail('cloud-config');
    const status = await transport('/api/status');
    if (!plain(status) || !plain(status.cloud) || status.cloud.disabled !== true) fail('cloud-status');
    const response = await transport('/api/embed', { model: MODEL, input, dimensions: 1024, truncate: false });
    if (!plain(response) || response.model !== MODEL || !Array.isArray(response.embeddings) || response.embeddings.length !== input.length || !response.embeddings.every(vectorOK)) fail('embedding-schema');
    return response.embeddings;
  }

  async function dataDirectory() {
    const parents = await ancestors(path.dirname(dataDir));
    try { await fs.mkdir(dataDir, { mode: 0o700 }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
    await verifyAncestors(parents);
    const stat = await fs.lstat(dataDir);
    if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o077)) fail('unsafe-data-directory');
    return ancestors(dataDir);
  }

  async function checkTarget(file) {
    try {
      const stat = await fs.lstat(file);
      if (!stat.isFile() || stat.isSymbolicLink()) fail('unsafe-output-target');
      ownerOnly(stat);
      return stat;
    } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }

  async function atomic(file, value, cap) {
    const parents = await dataDirectory();
    const target = await checkTarget(file);
    const serialized = JSON.stringify(value);
    if (Buffer.byteLength(serialized) > cap) fail('output-size');
    const temp = path.join(dataDir, `${randomUUID()}.tmp`);
    const handle = await fs.open(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    const identity = await handle.stat();
    let renamed = false;
    try {
      await handle.writeFile(serialized);
      await handle.sync();
      await verifyAncestors(parents);
      if (!same(identity, await fs.lstat(temp))) fail('temp-changed');
      const current = await checkTarget(file);
      if (Boolean(current) !== Boolean(target) || (current && !unchanged(target, current))) fail('target-changed');
      await fs.rename(temp, file);
      renamed = true;
      await verifyAncestors(parents);
      const directory = await fs.open(dataDir, constants.O_RDONLY | constants.O_NOFOLLOW);
      try { await directory.sync(); } finally { await directory.close(); }
    } finally {
      await handle.close();
      if (!renamed) {
        await verifyAncestors(parents);
        if (same(identity, await fs.lstat(temp))) await fs.unlink(temp);
      }
    }
  }

  async function locked(action) {
    const parents = await dataDirectory();
    const file = path.join(dataDir, 'write.lock');
    let handle;
    try { handle = await fs.open(file, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600); }
    catch (error) { if (error.code === 'EEXIST') fail('locked-manual-recovery-required'); throw error; }
    const identity = await handle.stat();
    try {
      await handle.writeFile(JSON.stringify({ pid: process.pid, createdAt: now() }));
      await handle.sync();
      await verifyAncestors(parents);
      return await action();
    } finally {
      await handle.close();
      await verifyAncestors(parents);
      if (!same(identity, await fs.lstat(file))) fail('lock-changed');
      await fs.unlink(file);
    }
  }

  function validateIndex(value, kind) {
    if (!keys(value, ['format', 'model', 'kind', 'files']) || value.format !== FORMAT || value.model !== MODEL || value.kind !== kind || !Array.isArray(value.files) || value.files.length > CAPS.files) fail('index-schema');
    let count = 0;
    const paths = new Set();
    for (const file of value.files) {
      if (!keys(file, ['path', 'hash', 'chunks']) || !eligible(kind, file.path) || paths.has(file.path) || !HASH.test(file.hash) || !Array.isArray(file.chunks)) fail('index-schema');
      paths.add(file.path);
      let previous = -1800;
      for (const chunk of file.chunks) {
        if (++count > CAPS.chunks || !keys(chunk, ['start', 'end', 'line', 'endLine', 'hash', 'vector']) || !HASH.test(chunk.hash) || !vectorOK(chunk.vector) || ![chunk.start, chunk.end, chunk.line, chunk.endLine].every(Number.isSafeInteger) || chunk.start !== previous + 1800 || chunk.end <= chunk.start || chunk.end - chunk.start > 2000 || chunk.end > CAPS.source || chunk.line < 1 || chunk.endLine < chunk.line || chunk.endLine > CAPS.source + 1) fail('index-schema');
        previous = chunk.start;
      }
    }
    return value;
  }

  async function load(kind, missingOK = false) {
    try { return validateIndex(JSON.parse((await readBounded(indexPath(kind), CAPS.index, true)).toString('utf8')), kind); }
    catch (error) {
      if (missingOK && error.code === 'ENOENT') return { format: FORMAT, model: MODEL, kind, files: [] };
      throw error;
    }
  }

  async function index(kind, dryRun = false) {
    async function run() {
      const { files, skipped } = await walk(kind);
      if (dryRun) {
        let count = 0;
        for (const relative of files) count += chunks((await source(kind, relative)).text).length;
        if (count > CAPS.chunks) fail('chunk-count');
        return { kind, eligibleFiles: files.length, chunks: count, skipped, dryRun: true };
      }
      const previous = await load(kind, true);
      const old = new Map(previous.files.map(f => [f.path, f]));
      const retained = new Map(old);
      const identities = new Map();
      const next = { format: FORMAT, model: MODEL, kind, files: [] };
      let reused = 0;
      let embedded = 0;
      let count = 0;
      for (const relative of files) {
        const current = await source(kind, relative);
        const prior = old.get(relative);
        const cache = new Map(prior?.chunks.map(c => [c.hash, c.vector]) || []);
        const parts = chunks(current.text);
        count += parts.length;
        if (count > CAPS.chunks) fail('chunk-count');
        const pending = [];
        for (const chunk of parts) {
          if (cache.has(chunk.hash)) { chunk.vector = cache.get(chunk.hash); reused++; }
          else pending.push(chunk);
        }
        for (let offset = 0; offset < pending.length; offset += 16) {
          const batch = pending.slice(offset, offset + 16);
          const vectors = await embed(batch.map(c => current.text.slice(c.start, c.end)));
          batch.forEach((chunk, i) => { chunk.vector = vectors[i]; });
          embedded += batch.length;
        }
        const replacement = { path: relative, hash: current.hash, chunks: parts };
        const checkpoint = { ...next, files: [...retained.values()].filter(f => f.path !== relative).concat(replacement) };
        validateIndex(checkpoint, kind);
        const verified = await source(kind, relative);
        if (verified.hash !== current.hash || !unchanged(current.identity, verified.identity)) fail('source-changed');
        // Unchanged records are already committed; changed sources commit independently.
        // Keep old unprocessed/deleted records until final successful revalidation.
        if (JSON.stringify(prior) !== JSON.stringify(replacement)) await atomic(indexPath(kind), checkpoint, CAPS.index);
        retained.set(relative, replacement);
        identities.set(relative, verified.identity);
        next.files.push(replacement);
      }
      // Only final successful traversal/revalidation may purge retained old records.
      const final = await walk(kind);
      if (JSON.stringify(final.files) !== JSON.stringify(files)) fail('source-set-changed');
      for (const file of next.files) {
        const verified = await source(kind, file.path);
        if (verified.hash !== file.hash || !unchanged(identities.get(file.path), verified.identity)) fail('source-changed');
      }
      validateIndex(next, kind);
      await atomic(indexPath(kind), next, CAPS.index);
      return { kind, eligibleFiles: files.length, chunks: count, embedded, reused, deleted: previous.files.filter(f => !files.includes(f.path)).length, skipped, dryRun: false };
    }
    return dryRun ? run() : locked(run);
  }

  function queryOK(query) {
    if (typeof query !== 'string' || !query.trim() || query.length > 500 || contentReason(query)) fail('query');
  }

  async function search(query) {
    queryOK(query);
    const indexes = await Promise.all(['memory', 'code'].map(kind => load(kind)));
    const [queryVector] = await embed([query]);
    const terms = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}_-]+/gu) || [])];
    const queryNorm = Math.sqrt(queryVector.reduce((sum, n) => sum + n * n, 0));
    const results = [];
    for (const index of indexes) for (const file of index.files) {
      let current;
      try { current = await source(index.kind, file.path); } catch { continue; }
      if (current.hash !== file.hash) continue;
      const actual = chunks(current.text);
      for (let i = 0; i < file.chunks.length; i++) {
        const chunk = file.chunks[i];
        const live = actual[i];
        if (!live || ['hash', 'start', 'end', 'line', 'endLine'].some(key => chunk[key] !== live[key])) continue;
        const text = current.text.slice(chunk.start, chunk.end);
        const lexical = terms.length ? terms.filter(term => `${file.path}\n${text}`.toLowerCase().includes(term)).length / terms.length : 0;
        const norm = Math.sqrt(chunk.vector.reduce((sum, n) => sum + n * n, 0));
        const cosine = queryVector.reduce((sum, n, j) => sum + n * chunk.vector[j], 0) / (queryNorm * norm);
        const score = 0.5 * lexical + 0.5 * Math.max(0, Math.min(1, cosine));
        results.push({ kind: index.kind, path: file.path, line: chunk.line, endLine: chunk.endLine, start: chunk.start, end: chunk.end, hash: file.hash, chunkHash: chunk.hash, score, snippet: text.slice(0, 500), trust: 'untrusted-source-data' });
      }
    }
    results.sort((a, b) => b.score - a.score || compare(a.path, b.path) || a.line - b.line || a.start - b.start || compare(a.kind, b.kind));
    const selected = results.slice(0, 5);
    for (const result of selected) await validateResult(result);
    return selected;
  }

  async function validateResult(result) {
    if (!keys(result, ['kind', 'path', 'line', 'endLine', 'start', 'end', 'hash', 'chunkHash', 'score', 'snippet', 'trust']) || !eligible(result.kind, result.path) || !HASH.test(result.hash) || !HASH.test(result.chunkHash) || typeof result.snippet !== 'string' || result.snippet.length > 500 || contentReason(result.snippet) || result.trust !== 'untrusted-source-data' || !Number.isFinite(result.score) || result.score < 0 || result.score > 1) fail('packet-result');
    const current = await source(result.kind, result.path);
    const chunk = chunks(current.text).find(c => c.start === result.start);
    if (current.hash !== result.hash || !chunk || chunk.hash !== result.chunkHash || ['line', 'endLine', 'end'].some(key => chunk[key] !== result[key]) || current.text.slice(chunk.start, chunk.end).slice(0, 500) !== result.snippet) fail('stale-result');
  }

  async function validatePacket(task) {
    queryOK(task);
    const packet = JSON.parse((await readBounded(path.join(dataDir, 'packet.json'), CAPS.packet, true)).toString('utf8'));
    if (!keys(packet, ['format', 'task', 'createdAt', 'expiresAt', 'trust', 'results']) || packet.format !== FORMAT || packet.task !== task || packet.trust !== 'untrusted-source-data' || !Number.isSafeInteger(packet.createdAt) || packet.expiresAt !== packet.createdAt + 60000 || packet.createdAt > now() || now() >= packet.expiresAt || !Array.isArray(packet.results) || packet.results.length > 5) fail('packet-schema-or-expired');
    for (const result of packet.results) await validateResult(result);
    if (now() >= packet.expiresAt) fail('packet-expired');
    return { valid: true, packetHash: hash(JSON.stringify(packet)), expiresAt: packet.expiresAt, results: packet.results.length };
  }

  async function packet(task) {
    queryOK(task);
    return locked(async () => {
      const results = await search(task);
      const createdAt = now();
      await atomic(path.join(dataDir, 'packet.json'), { format: FORMAT, task, createdAt, expiresAt: createdAt + 60000, trust: 'untrusted-source-data', results }, CAPS.packet);
      return validatePacket(task);
    });
  }

  return { index, search, packet, validatePacket };
}
