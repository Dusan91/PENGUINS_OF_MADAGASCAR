import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createEngine, MODEL, CAPS, chunks, contentReason, eligible } from './engine.mjs';

const scratch = '/tmp/penguins/embedding-index-mort-20261110-02';
const vector = () => [1, ...Array(1023).fill(0)];

async function fixture(t) {
  // Resolve macOS /tmp alias once; production roots never accept symlink ancestors.
  const base = await fs.realpath(scratch);
  const root = await fs.mkdtemp(path.join(base, 'test-'));
  await fs.chmod(root, 0o700);
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const memoryRoot = path.join(root, 'penguins');
  const codeRoot = path.join(root, 'code');
  const dataDir = path.join(root, '.local');
  const cloudConfig = path.join(root, 'server.json');
  await fs.mkdir(path.join(memoryRoot, 'memory'), { recursive: true });
  await fs.mkdir(path.join(codeRoot, 'apps/demo/src'), { recursive: true });
  await fs.mkdir(path.join(codeRoot, 'packages/demo/src'), { recursive: true });
  await fs.writeFile(cloudConfig, JSON.stringify({ disable_ollama_cloud: true }));
  const writeMemory = text => fs.writeFile(path.join(memoryRoot, 'memory/context.md'), text);
  const writeCode = text => fs.writeFile(path.join(codeRoot, 'apps/demo/src/example.ts'), text);
  await writeMemory('Local context and tournament policy.');
  await writeCode('export const tournament = 1;');
  const calls = [];
  let clock = 100000;
  let responseOverride;
  const transport = async (endpoint, body) => {
    calls.push({ endpoint, body });
    if (responseOverride) return responseOverride(endpoint, body);
    return endpoint === '/api/status' ? { cloud: { disabled: true } } : { model: MODEL, embeddings: body.input.map(vector) };
  };
  const options = { memoryRoot, codeRoot, dataDir, cloudConfig, transport, now: () => clock };
  const engine = createEngine(options);
  const both = async () => { await engine.index('memory'); await engine.index('code'); };
  return { root, memoryRoot, codeRoot, dataDir, cloudConfig, writeMemory, writeCode, calls, options, engine, both, override: fn => { responseOverride = fn; }, advance: amount => { clock += amount; } };
}

test('chunk offsets, overlap, line provenance and bounded empty input', () => {
  const text = 'line\n'.repeat(900);
  const parts = chunks(text);
  assert.deepEqual(parts.map(c => [c.start, c.end]), [[0, 2000], [1800, 3800], [3600, 4500]]);
  assert.equal(parts[1].line, 361);
  assert.deepEqual(chunks(''), []);
});

test('fixed scope, hidden paths, generated directories and sensitive names', () => {
  for (const name of ['.env.ts', 'secret.ts', 'credential.ts', 'password.ts', 'private.ts', 'key.ts', 'pem.ts', 'p12.ts', 'pfx.ts', 'crt.ts']) assert.equal(eligible('code', `apps/a/src/${name}`), false);
  for (const dir of ['node_modules', 'vendor', 'dist', 'build', 'coverage', 'generated', '__generated__', '.next', '.turbo']) assert.equal(eligible('code', `packages/a/src/${dir}/a.ts`), false);
  for (const file of ['../escape.ts', '/etc/file.ts', 'apps/a/config/a.ts', 'apps/a/src/a.json', 'apps/a/src/../a.ts', 'apps/a/src\\a.ts']) assert.equal(eligible('code', file), false);
  assert.equal(eligible('memory', 'memory/audit-log.md'), false);
  assert.equal(eligible('memory', 'memory/context.md'), true);
  assert.equal(eligible('code', 'README.md'), true);
});

test('case insensitive generated markers, credentials, bearer and keys', () => {
  for (const text of ['// AUTO-GENERATED', '// @generated', '// DO NOT EDIT']) assert.equal(contentReason(text), 'generated');
  for (const text of ['API_KEY = "example"', 'Password: abc', 'bEaReR abc.def', '-----BEGIN PRIVATE KEY-----', 'sk-abcdefghijklmnop']) assert.equal(contentReason(text), 'sensitive-content');
  assert.equal(contentReason('abc\0def'), 'binary');
  assert.equal(contentReason('ordinary documentation'), null);
});

test('memory and code index, aggregate dry-run, real provenance search and packet', async t => {
  const f = await fixture(t);
  const dry = await f.engine.index('memory', true);
  assert.equal(dry.eligibleFiles, 1);
  assert.equal(f.calls.length, 0);
  await assert.rejects(fs.stat(f.dataDir), { code: 'ENOENT' });
  await f.both();
  const results = await f.engine.search('tournament');
  assert.equal(results.length, 2);
  assert.deepEqual(new Set(results.map(r => r.kind)), new Set(['memory', 'code']));
  assert.ok(results.every(r => r.snippet.length <= 500 && r.trust === 'untrusted-source-data'));
  assert.ok(f.calls.filter(c => c.endpoint === '/api/embed').every(c => c.body.model === MODEL && c.body.dimensions === 1024 && c.body.truncate === false));
  assert.equal((await f.engine.packet('tournament')).valid, true);
  assert.equal((await f.engine.validatePacket('tournament')).valid, true);
  assert.equal((await fs.stat(f.dataDir)).mode & 0o777, 0o700);
  for (const name of ['memory.json', 'code.json', 'packet.json']) assert.equal((await fs.stat(path.join(f.dataDir, name))).mode & 0o777, 0o600);
});

test('incremental chunk reuse and successful deletion', async t => {
  const f = await fixture(t);
  await f.writeMemory('a'.repeat(4000));
  const first = await f.engine.index('memory');
  assert.equal(first.embedded, 3);
  assert.equal((await f.engine.index('memory')).reused, 3);
  await f.writeMemory('a'.repeat(3999) + 'b');
  const changed = await f.engine.index('memory');
  assert.equal(changed.reused, 2);
  assert.equal(changed.embedded, 1);
  await fs.unlink(path.join(f.memoryRoot, 'memory/context.md'));
  const deleted = await f.engine.index('memory');
  assert.equal(deleted.deleted, 1);
  assert.equal(deleted.eligibleFiles, 0);
});

test('exclusions never reach transport, aggregate skip reasons only', async t => {
  const f = await fixture(t);
  const src = path.join(f.codeRoot, 'apps/demo/src');
  await fs.writeFile(path.join(src, 'secret.ts'), 'excluded');
  await fs.writeFile(path.join(src, 'autogen.ts'), '// @generated');
  await fs.writeFile(path.join(src, 'config.ts'), 'API_TOKEN = abc');
  await fs.writeFile(path.join(src, 'large.ts'), 'x'.repeat(CAPS.source + 1));
  await fs.symlink(path.join(f.memoryRoot, 'memory/context.md'), path.join(src, 'linked.ts'));
  await fs.mkdir(path.join(src, 'node_modules'));
  await fs.writeFile(path.join(src, 'node_modules/a.ts'), 'excluded');
  const result = await f.engine.index('code');
  assert.equal(result.eligibleFiles, 1);
  assert.equal(result.skipped.symlink, 1);
  assert.equal(result.skipped.generated, 1);
  assert.equal(result.skipped.size, 1);
  assert.equal(result.skipped['sensitive-content'], 1);
  assert.ok(!JSON.stringify(result).includes('config.ts'));
});

for (const [label, override] of [
  ['cloud status missing', () => ({})],
  ['cloud enabled', () => ({ cloud: { disabled: false } })],
  ['model mismatch', (endpoint, body) => endpoint === '/api/status' ? { cloud: { disabled: true } } : { model: 'other', embeddings: body.input.map(vector) }],
  ['dimension mismatch', endpoint => endpoint === '/api/status' ? { cloud: { disabled: true } } : { model: MODEL, embeddings: [[1]] }],
  ['count mismatch', endpoint => endpoint === '/api/status' ? { cloud: { disabled: true } } : { model: MODEL, embeddings: [] }],
  ['nonfinite vector', endpoint => endpoint === '/api/status' ? { cloud: { disabled: true } } : { model: MODEL, embeddings: [[NaN, ...Array(1023).fill(0)]] }],
  ['zero vector', endpoint => endpoint === '/api/status' ? { cloud: { disabled: true } } : { model: MODEL, embeddings: [Array(1024).fill(0)] }],
  ['unavailable service', () => { throw new Error('service-unavailable'); }],
]) test(`${label} fails closed and preserves committed index`, async t => {
  const f = await fixture(t);
  await f.engine.index('memory');
  const file = path.join(f.dataDir, 'memory.json');
  const old = await fs.readFile(file);
  await f.writeMemory('changed document');
  f.override(override);
  await assert.rejects(f.engine.index('memory'));
  assert.deepEqual(await fs.readFile(file), old);
  assert.equal((await fs.readdir(f.dataDir)).some(n => n.endsWith('.tmp') || n === 'write.lock'), false);
});

test('local cloud configuration gate prevents every request', async t => {
  const f = await fixture(t);
  await fs.writeFile(f.cloudConfig, '{}');
  await assert.rejects(f.engine.index('memory'), /cloud-config/);
  assert.equal(f.calls.length, 0);
});

test('exclusive lock is never auto-broken; stale temp is never consumed', async t => {
  const f = await fixture(t);
  await f.engine.index('memory');
  await fs.writeFile(path.join(f.dataDir, 'write.lock'), 'old lock', { mode: 0o600 });
  await assert.rejects(f.engine.index('memory'), /locked-manual/);
  assert.equal(await fs.readFile(path.join(f.dataDir, 'write.lock'), 'utf8'), 'old lock');
  await fs.unlink(path.join(f.dataDir, 'write.lock'));
  await fs.writeFile(path.join(f.dataDir, 'interrupted.tmp'), 'incomplete', { mode: 0o600 });
  assert.equal((await f.engine.index('memory')).reused, 1);
});

test('symlink index, data directory and source ancestors fail closed', async t => {
  const f = await fixture(t);
  await f.engine.index('memory');
  const output = path.join(f.dataDir, 'memory.json');
  await fs.unlink(output);
  await fs.symlink(f.cloudConfig, output);
  await assert.rejects(f.engine.index('memory'));
  const alias = path.join(f.root, 'alias');
  await fs.symlink(f.memoryRoot, alias);
  await assert.rejects(createEngine({ ...f.options, memoryRoot: alias }).index('memory', true), /unsafe-ancestor/);
  const outputAlias = path.join(f.root, 'output-alias');
  await fs.symlink(f.dataDir, outputAlias);
  await assert.rejects(createEngine({ ...f.options, dataDir: outputAlias }).index('code'), /unsafe-data-directory/);
});

test('source mutation during embed leaves old index untouched', async t => {
  const f = await fixture(t);
  await f.engine.index('memory');
  const file = path.join(f.dataDir, 'memory.json');
  const old = await fs.readFile(file);
  await f.writeMemory('new source');
  f.override(async (endpoint, body) => {
    if (endpoint === '/api/status') return { cloud: { disabled: true } };
    await f.writeMemory('concurrent mutation');
    return { model: MODEL, embeddings: body.input.map(vector) };
  });
  await assert.rejects(f.engine.index('memory'), /source-changed/);
  assert.deepEqual(await fs.readFile(file), old);
});

test('changed, deleted and newly sensitive sources cannot be emitted', async t => {
  const f = await fixture(t);
  await f.both();
  await f.writeMemory('changed');
  assert.equal((await f.engine.search('tournament')).length, 1);
  await f.writeCode('password = abc');
  assert.equal((await f.engine.search('tournament')).length, 0);
  await fs.unlink(path.join(f.codeRoot, 'apps/demo/src/example.ts'));
  assert.equal((await f.engine.search('tournament')).length, 0);
});

test('packet task, expiry, future time, content and hash tampering rejected', async t => {
  const f = await fixture(t);
  await f.both();
  await f.engine.packet('tournament');
  await assert.rejects(f.engine.validatePacket('other'), /packet/);
  f.advance(-1);
  await assert.rejects(f.engine.validatePacket('tournament'), /packet/);
  f.advance(60001);
  await assert.rejects(f.engine.validatePacket('tournament'), /packet/);
  await f.engine.packet('tournament');
  const file = path.join(f.dataDir, 'packet.json');
  const original = JSON.parse(await fs.readFile(file, 'utf8'));
  original.results[0].snippet = 'injected';
  await fs.writeFile(file, JSON.stringify(original));
  await assert.rejects(f.engine.validatePacket('tournament'), /stale-result/);
  await f.engine.packet('tournament');
  await f.writeMemory('changed after handoff');
  await assert.rejects(f.engine.validatePacket('tournament'), /stale-result/);
});

test('packet size and index schema/version caps fail closed', async t => {
  const f = await fixture(t);
  await f.both();
  await fs.writeFile(path.join(f.dataDir, 'packet.json'), 'x'.repeat(CAPS.packet + 1), { mode: 0o600 });
  await assert.rejects(f.engine.validatePacket('tournament'), /size/);
  const file = path.join(f.dataDir, 'memory.json');
  const index = JSON.parse(await fs.readFile(file, 'utf8'));
  index.format = 'old';
  await fs.writeFile(file, JSON.stringify(index));
  await assert.rejects(f.engine.search('tournament'), /index-schema/);
});

test('query bounds and sensitive content block before transport', async t => {
  const f = await fixture(t);
  for (const query of ['', 'x'.repeat(501), 'password=abc']) await assert.rejects(f.engine.search(query), /query/);
  assert.equal(f.calls.length, 0);
});

test('top five, 500 character snippets and deterministic path/line ties', async t => {
  const f = await fixture(t);
  await f.writeMemory('tournament '.repeat(900));
  await f.both();
  const one = await f.engine.search('tournament');
  const two = await f.engine.search('tournament');
  assert.deepEqual(one, two);
  assert.equal(one.length, 5);
  assert.ok(one.every(r => r.snippet.length <= 500));
  assert.equal(one[0].path, 'apps/demo/src/example.ts');
});

test('batch size is at most sixteen', async t => {
  const f = await fixture(t);
  await f.writeMemory('ordinary text '.repeat(3000));
  await f.engine.index('memory');
  const batches = f.calls.filter(c => c.endpoint === '/api/embed');
  assert.ok(batches.length > 1);
  assert.ok(batches.every(c => c.body.input.length <= 16));
});

test('completed first source survives second-source failure; retry reuses first', async t => {
  const f = await fixture(t);
  const second = path.join(f.codeRoot, 'apps/demo/src/zebra.ts');
  await fs.writeFile(second, 'second original');
  await f.engine.index('code');
  const file = path.join(f.dataDir, 'code.json');
  const previous = JSON.parse(await fs.readFile(file, 'utf8'));
  await f.writeCode('first updated');
  await fs.writeFile(second, 'second updated');
  f.override((endpoint, body) => {
    if (endpoint === '/api/status') return { cloud: { disabled: true } };
    if (body.input.includes('second updated')) throw new Error('service-unavailable');
    return { model: MODEL, embeddings: body.input.map(vector) };
  });
  await assert.rejects(f.engine.index('code'), /service-unavailable/);
  const partial = JSON.parse(await fs.readFile(file, 'utf8'));
  const firstPath = 'apps/demo/src/example.ts';
  const secondPath = 'apps/demo/src/zebra.ts';
  assert.notEqual(partial.files.find(r => r.path === firstPath).hash, previous.files.find(r => r.path === firstPath).hash);
  assert.deepEqual(partial.files.find(r => r.path === secondPath), previous.files.find(r => r.path === secondPath));
  f.override(null);
  f.calls.length = 0;
  const retry = await f.engine.index('code');
  assert.equal(retry.reused, 1);
  assert.equal(retry.embedded, 1);
  assert.deepEqual(f.calls.filter(c => c.endpoint === '/api/embed').flatMap(c => c.body.input), ['second updated']);
});

test('deleted records survive partial progress and are purged only after successful retry', async t => {
  const f = await fixture(t);
  const second = path.join(f.codeRoot, 'apps/demo/src/zebra.ts');
  const deleted = path.join(f.codeRoot, 'apps/demo/src/removed.ts');
  await fs.writeFile(second, 'second original');
  await fs.writeFile(deleted, 'record to retain until successful traversal');
  await f.engine.index('code');
  await fs.unlink(deleted);
  await f.writeCode('first updated');
  await fs.writeFile(second, 'second updated');
  f.override((endpoint, body) => {
    if (endpoint === '/api/status') return { cloud: { disabled: true } };
    if (body.input.includes('second updated')) throw new Error('service-unavailable');
    return { model: MODEL, embeddings: body.input.map(vector) };
  });
  await assert.rejects(f.engine.index('code'), /service-unavailable/);
  const file = path.join(f.dataDir, 'code.json');
  assert.ok(JSON.parse(await fs.readFile(file, 'utf8')).files.some(r => r.path.endsWith('/removed.ts')));
  f.override(null);
  const retry = await f.engine.index('code');
  assert.equal(retry.deleted, 1);
  assert.equal(retry.reused, 1);
  assert.equal(retry.embedded, 1);
  assert.equal(JSON.parse(await fs.readFile(file, 'utf8')).files.some(r => r.path.endsWith('/removed.ts')), false);
});

test('partial batches never replace an incomplete source record', async t => {
  const f = await fixture(t);
  await f.engine.index('memory');
  const file = path.join(f.dataDir, 'memory.json');
  const previous = await fs.readFile(file);
  await f.writeMemory('changed source content '.repeat(2000));
  let batches = 0;
  f.override((endpoint, body) => {
    if (endpoint === '/api/status') return { cloud: { disabled: true } };
    if (++batches === 2) return { model: MODEL, embeddings: [] };
    return { model: MODEL, embeddings: body.input.map(vector) };
  });
  await assert.rejects(f.engine.index('memory'), /embedding-schema/);
  assert.equal(batches, 2);
  assert.deepEqual(await fs.readFile(file), previous);
});

test('same-content source replacement during embedding fails identity revalidation', async t => {
  const f = await fixture(t);
  await f.engine.index('memory');
  const file = path.join(f.dataDir, 'memory.json');
  const previous = await fs.readFile(file);
  const source = path.join(f.memoryRoot, 'memory/context.md');
  await f.writeMemory('updated content');
  f.override(async (endpoint, body) => {
    if (endpoint === '/api/status') return { cloud: { disabled: true } };
    const replacement = path.join(f.root, 'replacement');
    await fs.writeFile(replacement, 'updated content');
    await fs.rename(replacement, source);
    return { model: MODEL, embeddings: body.input.map(vector) };
  });
  await assert.rejects(f.engine.index('memory'), /source-changed/);
  assert.deepEqual(await fs.readFile(file), previous);
});

test('failed final source revalidation retains completed checkpoints and deleted records', async t => {
  const f = await fixture(t);
  const second = path.join(f.codeRoot, 'apps/demo/src/zebra.ts');
  const deleted = path.join(f.codeRoot, 'apps/demo/src/removed.ts');
  await fs.writeFile(second, 'second original');
  await fs.writeFile(deleted, 'deleted original');
  await f.engine.index('code');
  await fs.unlink(deleted);
  await f.writeCode('first updated');
  await fs.writeFile(second, 'second updated');
  f.override(async (endpoint, body) => {
    if (endpoint === '/api/status') return { cloud: { disabled: true } };
    if (body.input.includes('second updated')) await f.writeCode('concurrent later change');
    return { model: MODEL, embeddings: body.input.map(vector) };
  });
  await assert.rejects(f.engine.index('code'), /source-changed/);
  const saved = JSON.parse(await fs.readFile(path.join(f.dataDir, 'code.json'), 'utf8'));
  assert.equal(saved.files.length, 3);
  assert.ok(saved.files.some(r => r.path.endsWith('/removed.ts')));
  // Both completed source records persisted; the concurrently stale first is screened by search.
  f.override(null);
  f.calls.length = 0;
  const retry = await f.engine.index('code');
  assert.equal(retry.reused, 1);
  assert.equal(retry.embedded, 1);
  assert.equal(retry.deleted, 1);
  assert.deepEqual(f.calls.filter(c => c.endpoint === '/api/embed').flatMap(c => c.body.input), ['concurrent later change']);
});
