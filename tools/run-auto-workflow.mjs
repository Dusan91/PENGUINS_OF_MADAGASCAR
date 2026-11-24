#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, resolve } from 'node:path';
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

const workspaceInput = process.env.PENGUINS_WORKSPACE;
if (!workspaceInput?.trim()) {
  console.error('run-auto-workflow: PENGUINS_WORKSPACE is required (absolute workspace directory).');
  process.exit(1);
}
const workspace = expandTilde(workspaceInput);
try {
  if (!isAbsolute(workspace) || !statSync(workspace).isDirectory()) {
    throw new Error('not an absolute directory');
  }
} catch {
  console.error('run-auto-workflow: PENGUINS_WORKSPACE must name an existing absolute directory.');
  process.exit(1);
}
const penguinsRoot = process.env.PENGUINS_ROOT || resolve(__dirname, '..');
const opencodeBin = process.env.OPENCODE_BIN || 'opencode';
// Raised from 10 to 30 minutes: Penguins MEDIUM/LARGE workflow cycles regularly
// outlive the old limit and the SIGTERM below surfaced as "opencode CLI exit 143".
const timeoutMs = parseInt(process.env.PENGUINS_OPENCODE_TIMEOUT_MS || '1800000', 10);

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

// Apply to both the command-file and fallback prompts. These are instructions
// to the orchestrator, not runtime interception of its dependent dispatches.
prompt += '\n\nLauncher execution requirements:\n' + [
  'The explicitly selected target workspace is: ' + workspace,
  'Confirm the task targets this workspace before dispatch; conflicting target instructions block execution.',
  'Successful tool completion or CLI exit is not an accepted agent verdict.',
  'Before each dependent dispatch, inspect every prerequisite verdict and its current-run evidence.',
  'On BLOCK, BLOCKED, FAIL, REJECTED, missing required evidence, or an unknown verdict, STOP dispatch.',
  'Do not launch dependent implementation, review, validation, delivery, or finalization steps after a failed prerequisite.',
  'Do not report workflow_complete or send a success notification after a failed or unresolved gate.',
  'Report the blocking prerequisite and evidence; resume only after it is resolved and revalidated.',
].join('\n');

const agentName = process.env.PENGUINS_OPENCODE_AGENT?.trim() || 'skipper';
const args = ['run', '--agent', agentName];

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
  // No verified Penguins verdict contract is available from this CLI. Text
  // (including a success phrase) and transport completion cannot certify gates.
  // Fail closed even for apparent success: callers must inspect current evidence.
  // Exit 2 means UNKNOWN, not a proven workflow failure; never auto-retry on it.
  if (!forcedExit && code === 0) {
    console.error('run-auto-workflow: workflow result UNKNOWN; CLI exited 0 but no verified workflow verdict is available. Review current-run evidence; do not automatically retry. Exiting 2.');
  }
  process.exit(forcedExit ? 124 : code === 0 ? 2 : code == null ? 1 : code);
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
