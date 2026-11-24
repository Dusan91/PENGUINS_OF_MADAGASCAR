import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const launcher = fileURLToPath(new URL('./run-auto-workflow.mjs', import.meta.url));

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'penguins-launcher-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const mock = join(directory, 'mock-opencode');
  writeFileSync(mock, `#!${process.execPath}
console.log(JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd() }));
console.log(process.env.MOCK_OUTPUT || '');
if (process.env.MOCK_SIGNAL) process.kill(process.pid, 'SIGTERM');
else if (process.env.MOCK_WAIT) setInterval(() => {}, 1000);
else process.exit(Number(process.env.MOCK_EXIT || 0));
`, { mode: 0o700 });
  return {
    directory,
    run(overrides = {}) {
      const env = {
        ...process.env,
        PENGUINS_WORKSPACE: directory,
        OPENCODE_BIN: mock,
        PENGUINS_OPENCODE_AGENT: '',
        PENGUINS_OPENCODE_AUTO: 'false',
        PENGUINS_OPENCODE_TIMEOUT_MS: '5000',
        MOCK_OUTPUT: '',
        MOCK_EXIT: '0',
        MOCK_SIGNAL: '',
        MOCK_WAIT: '',
        ...overrides,
      };
      for (const key of Object.keys(env)) if (env[key] === undefined) delete env[key];
      return spawnSync(process.execPath, [launcher], {
        env, encoding: 'utf8', timeout: 10000,
      });
    },
  };
}

test('missing, blank, relative, nonexistent and file workspaces stop before spawning', (t) => {
  const { directory, run } = fixture(t);
  for (const workspace of [undefined, '', '  ', '.', join(directory, 'missing'), launcher]) {
    const result = run({ PENGUINS_WORKSPACE: workspace });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /PENGUINS_WORKSPACE/);
  }
});

test('explicit workspace and Skipper default reach CLI with fail-closed instructions', (t) => {
  const { directory, run } = fixture(t);
  const result = run();
  assert.equal(result.error, undefined);
  assert.equal(result.status, 2);
  const call = JSON.parse(result.stdout.split('\n')[0]);
  assert.equal(call.cwd, realpathSync(directory));
  assert.deepEqual(call.args.slice(0, 3), ['run', '--agent', 'skipper']);
  assert.equal(call.args.includes('--auto'), false);
  const prompt = call.args.at(-1);
  assert.match(prompt, /Successful tool completion or CLI exit is not an accepted agent verdict/);
  assert.match(prompt, /BLOCK, BLOCKED, FAIL, REJECTED, missing required evidence, or an unknown verdict, STOP dispatch/);
  assert.match(prompt, /Do not launch dependent implementation, review, validation, delivery, or finalization/);
  assert.match(result.stderr, /workflow result UNKNOWN/);
});

test('explicit agent override and existing auto opt-out behavior are preserved', (t) => {
  const { run } = fixture(t);
  const result = run({ PENGUINS_OPENCODE_AGENT: 'other-agent', PENGUINS_OPENCODE_AUTO: undefined });
  const call = JSON.parse(result.stdout.split('\n')[0]);
  assert.deepEqual(call.args.slice(0, 4), ['run', '--agent', 'other-agent', '--auto']);
});

test('exit zero never certifies success, regardless of prose or JSON-looking output', (t) => {
  const { run } = fixture(t);
  for (const output of [
    '', 'BLOCK', 'BLOCKED', 'FAIL', 'REJECTED',
    'Tool completed successfully', 'workflow_complete',
    '{"status":"SUCCESS","tests":"PASS"}',
    'Smile and wave boys, smile and wave 🐧🐧🐧🐧🦒🐒',
  ]) {
    const result = run({ MOCK_OUTPUT: output });
    assert.equal(result.status, 2, output);
    assert.match(result.stderr, /workflow result UNKNOWN/);
  }
});

test('CLI failure, signal termination, and timeout remain non-success', (t) => {
  const { run } = fixture(t);
  assert.equal(run({ MOCK_EXIT: '7' }).status, 7);
  assert.equal(run({ MOCK_SIGNAL: '1' }).status, 1);
  const timeout = run({ MOCK_WAIT: '1', PENGUINS_OPENCODE_TIMEOUT_MS: '200' });
  assert.equal(timeout.status, 124);
  assert.match(timeout.stderr, /timeout after/);
  assert.doesNotMatch(timeout.stderr, /workflow result UNKNOWN/);
});

test('unavailable CLI fails rather than reporting success', (t) => {
  const { directory, run } = fixture(t);
  const result = run({ OPENCODE_BIN: join(directory, 'absent-cli') });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Failed to start opencode/);
});
