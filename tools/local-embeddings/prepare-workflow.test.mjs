import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createWorkflow, failure } from './prepare-workflow.mjs';
import { createEngine, MODEL, hash } from './engine.mjs';

const scratch = '/tmp/penguins/embedding-workflow-wire-20261110-01';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const query = { query: 'tournament configuration' };
async function fixture(t) {
  await fs.mkdir(scratch, { recursive: true });
  const dir = await fs.mkdtemp(path.join(await fs.realpath(scratch), 'helper-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const memoryRoot = path.join(dir, 'memory-root');
  const codeRoot = path.join(dir, 'code-root');
  const dataDir = path.join(dir, '.local');
  const cloudConfig = path.join(dir, 'server.json');
  await fs.mkdir(path.join(memoryRoot, 'memory'), { recursive: true });
  await fs.mkdir(path.join(codeRoot, 'apps/a/src'), { recursive: true });
  await fs.mkdir(path.join(codeRoot, 'packages/a/src'), { recursive: true });
  await fs.writeFile(path.join(memoryRoot, 'memory/context.md'), 'Tournament configuration context.');
  const source = path.join(codeRoot, 'apps/a/src/example.ts');
  await fs.writeFile(source, 'export const tournament = 1;');
  await fs.writeFile(cloudConfig, JSON.stringify({ disable_ollama_cloud: true }));
  let time = 100000;
  let failKind;
  let serviceDown = false;
  const engine = createEngine({ memoryRoot, codeRoot, dataDir, cloudConfig, now: () => time, transport: async (endpoint, body) => {
    if (serviceDown) throw new Error('service-unavailable');
    return endpoint === '/api/status' ? { cloud: { disabled: true } } : { model: MODEL, embeddings: body.input.map(() => [1, ...Array(1023).fill(0)]) };
  } });
  const indexes = [];
  const wrapped = { ...engine, index: async kind => { indexes.push(kind); if (kind === failKind) throw new Error('service-unavailable'); return engine.index(kind); } };
  const run = createWorkflow({ dataDir, engine: wrapped, now: () => time });
  const runId = 'test-run';
  const requestId = randomUUID();
  const statePath = path.join(dataDir, 'workflow-runs', runId, 'state.json');
  const state = async () => JSON.parse(await fs.readFile(statePath, 'utf8'));
  const prepare = () => run('prepare', runId, requestId, query);
  const consume = () => run('consume', runId, requestId, query);
  return { dir, dataDir, engine, wrapped, run, runId, requestId, statePath, state, prepare, consume, indexes, source, now: () => time, advance: n => { time += n; }, failKind: k => { failKind = k; }, serviceDown: () => { serviceDown = true; } };
}

test('prepare/consume metadata, exact privacy and owner-only state/snapshot', async t => {
  const f = await fixture(t);
  const p = await f.prepare();
  assert.equal(p.status, 'ok');
  assert.deepEqual(p.indexing, { memory: 'indexed', code: 'indexed' });
  assert.equal(p.queryHash, hash(query.query));
  const text = await fs.readFile(f.statePath, 'utf8');
  assert.ok(!text.includes(query.query) && !text.includes('snippet'));
  for (const file of [f.statePath, p.snapshotPath]) assert.equal((await fs.stat(file)).mode & 0o777, 0o600);
  for (const dir of [f.dataDir, path.dirname(f.statePath), path.dirname(p.snapshotPath)]) assert.equal((await fs.stat(dir)).mode & 0o777, 0o700);
  const result = await f.consume();
  assert.equal(result.packetHash, p.packetHash);
  assert.equal((await f.state()).requests[0].consumed, true);
  assert.ok(!JSON.stringify(result).includes('snippet'));
  assert.equal((await fs.readdir(path.dirname(f.statePath))).join(), 'state.json');
});
test('replay blocked; refresh uses independent snapshot and no reindex', async t => {
  const f = await fixture(t);
  const first = await f.prepare(); await f.consume();
  await assert.rejects(f.consume()); await assert.rejects(f.prepare());
  f.advance(1);
  const id = randomUUID();
  const next = await f.run('refresh', f.runId, id, query);
  assert.notEqual(first.snapshotPath, next.snapshotPath);
  assert.equal(JSON.parse(await fs.readFile(first.snapshotPath, 'utf8')).expiresAt, first.expiresAt);
  assert.deepEqual(f.indexes, ['memory', 'code']);
  assert.deepEqual(next.indexing, { memory: 'already', code: 'already' });
  await f.run('consume', f.runId, id, query);
});
test('partial index failure retains memory success and retries code only', async t => {
  const f = await fixture(t); f.failKind('code');
  await assert.rejects(f.prepare());
  assert.deepEqual((await f.state()).indexed, { memory: true, code: false });
  f.failKind(undefined); await f.prepare();
  assert.deepEqual(f.indexes, ['memory', 'code', 'code']);
});
test('refresh cannot create state or index incomplete state', async t => {
  const f = await fixture(t);
  await assert.rejects(f.run('refresh', f.runId, randomUUID(), query));
  assert.deepEqual(f.indexes, []);
  f.failKind('code'); await assert.rejects(f.prepare());
  const before = [...f.indexes];
  await assert.rejects(f.run('refresh', f.runId, randomUUID(), query));
  assert.deepEqual(f.indexes, before);
});
test('query binding rejects changed query without index or state change', async t => {
  const f = await fixture(t); await f.prepare();
  const before = await fs.readFile(f.statePath);
  for (const command of ['prepare', 'refresh', 'consume']) await assert.rejects(f.run(command, f.runId, randomUUID(), { query: 'changed query' }));
  assert.deepEqual(await fs.readFile(f.statePath), before);
  assert.deepEqual(f.indexes, ['memory', 'code']);
});
test('strict CLI/input schemas, unsafe query, bounded run and UUID', async t => {
  const f = await fixture(t);
  for (const input of [null, [], {}, { query: '' }, { query: ' ' }, { query: 'x'.repeat(501) }, { query: 'password=example' }, { query: 'a', extra: true }]) await assert.rejects(f.run('prepare', f.runId, f.requestId, input));
  for (const run of ['', '../escape', '_run', 'a'.repeat(81)]) await assert.rejects(f.run('prepare', run, f.requestId, query));
  for (const id of ['bad', f.requestId.toUpperCase(), '00000000-0000-1000-8000-000000000000']) await assert.rejects(f.run('prepare', f.runId, id, query));
  await assert.rejects(f.run('index', f.runId, f.requestId, query));
  assert.deepEqual(f.indexes, []);
});
test('state schema rejects unknown fields', async t => {
  const f = await fixture(t); await f.prepare();
  const s = await f.state(); s.extra = true;
  await fs.writeFile(f.statePath, JSON.stringify(s));
  await assert.rejects(f.consume());
});
test('snapshot unknown fields/hash/identity tampering fails closed', async t => {
  const f = await fixture(t); const p = await f.prepare();
  const s = JSON.parse(await fs.readFile(p.snapshotPath, 'utf8')); s.extra = true;
  await fs.writeFile(p.snapshotPath, JSON.stringify(s));
  await assert.rejects(f.consume());
  assert.equal((await f.state()).requests[0].consumed, false);
});
test('source changes reject stale snapshot through unchanged engine', async t => {
  const f = await fixture(t); await f.prepare();
  await fs.writeFile(f.source, 'export const changed = 2;');
  await assert.rejects(f.consume(), /stale-result/);
});
test('expiry operational, refresh gives fresh TTL without reindex', async t => {
  const f = await fixture(t); await f.prepare(); f.advance(60000);
  await assert.rejects(f.consume(), e => failure(e).status === 'operational_unavailable');
  const id = randomUUID(); await f.run('refresh', f.runId, id, query);
  await f.run('consume', f.runId, id, query);
  assert.deepEqual(f.indexes, ['memory', 'code']);
});
test('confirmed shared packet replacement operational, old snapshot not consumed', async t => {
  const f = await fixture(t); await f.prepare(); f.advance(1);
  await f.engine.packet(query.query);
  await assert.rejects(f.consume(), e => failure(e).reason === 'packet-replaced');
  assert.equal((await f.state()).requests[0].consumed, false);
});
test('service unavailable classified without leaking native messages', async t => {
  const f = await fixture(t); f.serviceDown();
  await assert.rejects(f.prepare(), e => failure(e).status === 'operational_unavailable');
  assert.deepEqual(failure(new Error('secret native body')), { status: 'security_block', reason: 'invalid-or-uncertain-state-investigate' });
  for (const reason of ['cloud-config', 'cloud-status', 'embedding-schema', 'EACCES', 'packet-schema-or-expired', 'identity']) assert.equal(failure(new Error(reason)).status, 'security_block');
});
test('confirmed different-task shared packet is operational replacement', async t => {
  const f = await fixture(t); await f.prepare();
  await f.engine.packet('another safe query');
  await assert.rejects(f.consume(), e => failure(e).reason === 'packet-replaced');
});
test('expiry occurring during engine validation is operational', async t => {
  const f = await fixture(t); await f.prepare();
  const engine = { ...f.wrapped, validatePacket: async q => { f.advance(60000); return f.engine.validatePacket(q); } };
  const run = createWorkflow({ dataDir: f.dataDir, engine, now: f.now });
  await assert.rejects(run('consume', f.runId, f.requestId, query), e => failure(e).reason === 'expired');
});
test('run lock is exclusive and never auto-broken', async t => {
  const f = await fixture(t); await f.prepare();
  const lock = path.join(path.dirname(f.statePath), 'write.lock');
  await fs.writeFile(lock, 'existing', { mode: 0o600 });
  await assert.rejects(f.consume());
  assert.equal(await fs.readFile(lock, 'utf8'), 'existing');
});
test('interrupted temporary state blocks rather than auto-recovers', async t => {
  const f = await fixture(t); await f.prepare();
  const temp = path.join(path.dirname(f.statePath), `${randomUUID()}.tmp`);
  await fs.writeFile(temp, 'interrupted', { mode: 0o600 });
  await assert.rejects(f.consume());
  assert.equal(await fs.readFile(temp, 'utf8'), 'interrupted');
});
for (const target of ['state', 'snapshot', 'directory']) test(`unsafe ${target} permissions reject without repair`, async t => {
  const f = await fixture(t); const p = await f.prepare();
  const file = target === 'state' ? f.statePath : target === 'snapshot' ? p.snapshotPath : path.dirname(f.statePath);
  const mode = target === 'directory' ? 0o755 : 0o644;
  await fs.chmod(file, mode); await assert.rejects(f.consume());
  assert.equal((await fs.stat(file)).mode & 0o777, mode);
});
for (const target of ['state', 'snapshot']) test(`${target} symlink and hardlink rejected`, async t => {
  const f = await fixture(t); const p = await f.prepare();
  const file = target === 'state' ? f.statePath : p.snapshotPath;
  const original = path.join(f.dir, 'original');
  await fs.rename(file, original); await fs.symlink(original, file);
  await assert.rejects(f.consume());
  await fs.unlink(file); await fs.link(original, file);
  await assert.rejects(f.consume());
});
test('symlink ancestor is rejected', async t => {
  const f = await fixture(t);
  const link = path.join(f.dir, 'linked'); await fs.symlink(f.dir, link);
  const run = createWorkflow({ dataDir: path.join(link, '.local'), engine: f.engine });
  await assert.rejects(run('prepare', f.runId, f.requestId, query));
});
test('validation metadata mismatch blocks snapshot release', async t => {
  const f = await fixture(t);
  const engine = { ...f.wrapped, validatePacket: async q => ({ ...await f.engine.validatePacket(q), packetHash: '0'.repeat(64) }) };
  const run = createWorkflow({ dataDir: f.dataDir, engine, now: f.now });
  await assert.rejects(run('prepare', f.runId, f.requestId, query));
  assert.equal((await f.state()).requests.length, 0);
});
test('concurrent replacement during validation blocks release', async t => {
  const f = await fixture(t);
  const engine = { ...f.wrapped, validatePacket: async q => {
    const meta = await f.engine.validatePacket(q); f.advance(1); await f.engine.packet(q); return meta;
  } };
  const run = createWorkflow({ dataDir: f.dataDir, engine, now: f.now });
  await assert.rejects(run('prepare', f.runId, f.requestId, query), /packet-replaced/);
});
test('executable rejects extra args and secrets with sanitized nonzero output', () => {
  const cli = path.join(root, 'tools/local-embeddings/prepare-workflow.mjs');
  for (const args of [['prepare', 'test', randomUUID(), '--root=/tmp'], ['prepare', 'test', randomUUID()]]) {
    const r = spawnSync(process.execPath, [cli, ...args], { input: '{"query":"password=example"}', encoding: 'utf8' });
    assert.equal(r.status, 1); assert.equal(r.stdout, '');
    assert.equal(JSON.parse(r.stderr).status, 'security_block');
    assert.ok(!r.stderr.includes('password') && !r.stderr.includes('/tmp'));
  }
});
test('parsed route owners and ordered retrieval dependencies preserve ordinary gates', async () => {
  const require = createRequire(import.meta.url);
  const yaml = require(require.resolve('yaml', { paths: ['/Users/dusanmilenkovic/Desktop/Hermes/whitelabel'] }));
  for (const file of ['tiered', 'refactor_v2', 'jira_figma_to_code_v2']) {
    const doc = yaml.parse(await fs.readFile(path.join(root, `workflows/${file}.yaml`), 'utf8'));
    const steps = doc.steps || doc.tiers.small.steps;
    const byId = new Map(steps.map(s => [s.id, s]));
    const chain = ['skipper_preflight', 'mort_context', 'nana_retrieval_pre', 'skipper_retrieval_approval', 'private_retrieval', 'mort_enriched'];
    for (let i = 1; i < chain.length; i++) assert.ok(byId.get(chain[i]).depends_on.includes(chain[i - 1]));
    for (const id of ['nana_preapproval', 'nana_postdiff', 'julien_performance']) assert.ok(byId.has(id));
    assert.ok(byId.get(file === 'tiered' ? 'skipper_small_plan' : 'rico_discovery').depends_on.includes('mort_enriched'));
    if (file === 'tiered') for (const tier of ['medium', 'large']) { assert.equal(doc.tiers[tier].steps, undefined); assert.ok(doc.tiers[tier].next_workflow); }
  }
  const review = await fs.readFile(path.join(root, 'start_review.md'), 'utf8');
  assert.match(review, /Bootstrap Mort READY.*retrieval-only PRE.*Private executes prepare then consume.*Mort enriched refresh/);
  for (const gate of ['Nana PREAPPROVAL', 'Nana POSTDIFF', 'Julien', 'Maurice']) assert.ok(review.includes(gate));
});
