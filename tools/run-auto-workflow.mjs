#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function stripYamlFrontmatter(text) {
  if (!/^---\r?\n/.test(text)) return text;
  const end = text.search(/\n---\r?\n/);
  if (end === -1) return text;
  const after = text.indexOf('\n', end + 4);
  return text.slice(after + 1).trimStart();
}

function expandTilde(text) {
  return text.replace(/~(?=[/\\])/g, homedir());
}

const workspace = process.env.PENGUINS_WORKSPACE || '/Users/dusanmilenkovic/Desktop/Hermes/whitelabel';
const penguinsRoot = process.env.PENGUINS_ROOT || resolve(__dirname, '..');
const opencodeBin = process.env.OPENCODE_BIN || 'opencode';
const timeoutMs = parseInt(process.env.PENGUINS_OPENCODE_TIMEOUT_MS || '600000', 10);

const commandFilePath = '/Users/dusanmilenkovic/.config/opencode/commands/auto-workflow.md';

let prompt;

try {
  const rawCommand = readFileSync(commandFilePath, 'utf8');
  const commandBody = stripYamlFrontmatter(rawCommand);
  prompt = expandTilde(commandBody);
} catch (err) {
  const tieredWorkflow = resolve(penguinsRoot, 'workflows', 'tiered.yaml');
  const rulesDir = resolve(penguinsRoot, 'rules');
  const inputsDir = resolve(penguinsRoot, 'inputs');
  const jiraTask = resolve(inputsDir, 'jira-task.md');
  const figmaNotes = resolve(inputsDir, 'figma-notes.md');
  const userCommand = resolve(inputsDir, 'user-command.md');

  prompt = [
    '@skipper pokreni auto workflow.',
    'Prvo procitaj workflow fajl: ' + tieredWorkflow,
    'Zatim procitaj ulazne fajlove redom: ' + jiraTask + ', ' + figmaNotes + ', ' + userCommand,
    'Procitaj pravila iz direktorijuma: ' + rulesDir,
    'Koristi Penguins root: ' + penguinsRoot,
    'Izvrsi svaki korak iz workflow-a redom, delegirajuci odgovarajucim subagentima (rico, kowalski, private, private-2, melman) prema specifikaciji workflow-a.',
    'Ne skreci sa zadatka i ne dodaj nove zavisnosti bez odobrenja korisnika.',
  ].join(' ');
}

const agentName = process.env.PENGUINS_OPENCODE_AGENT || '';
const args = ['run'];
if (agentName) {
  args.push('--agent', agentName);
}

if (process.env.PENGUINS_OPENCODE_AUTO !== 'false') {
  args.push('--auto');
}

args.push(prompt);

const child = spawn(opencodeBin, args, {
  cwd: workspace,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: false,
});

child.stdout.on('data', (data) => process.stdout.write(data));
child.stderr.on('data', (data) => process.stderr.write(data));

let timeoutId;
let heartbeatId;
let forcedExit = false;

function cleanupTimers() {
  if (timeoutId) clearTimeout(timeoutId);
  if (heartbeatId) clearInterval(heartbeatId);
}

function handleClose(code) {
  cleanupTimers();
  process.exit(forcedExit ? 124 : code == null ? 1 : code);
}

child.on('error', (err) => {
  cleanupTimers();
  console.error('Failed to start opencode:', err.message);
  process.exit(1);
});

child.on('close', handleClose);

if (!Number.isNaN(timeoutMs) && timeoutMs > 0) {
  timeoutId = setTimeout(() => {
    forcedExit = true;
    console.error(`run-auto-workflow: timeout after ${timeoutMs}ms, killing child`);
    child.kill('SIGTERM');
    setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    }, 5000);
  }, timeoutMs);
}

heartbeatId = setInterval(() => {
  console.error('run-auto-workflow: still running ...');
}, 30000);
