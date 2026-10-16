#!/usr/bin/env node
/**
 * run-alex.mjs
 *
 * Runs the Alex QA browser testing agent via opencode.
 * Alex opens the URL in a real browser (via chrome-devtools MCP),
 * checks console errors and network failures, and returns a report.
 *
 * Usage:
 *   node tools/run-alex.mjs "<url>" ["<description>"]
 *
 * Exit codes:
 *   0 — success (report produced)
 *   1 — error / timeout
 */

import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const url = process.argv[2];
const description = process.argv[3] || '';

if (!url) {
  console.error('Usage: node run-alex.mjs "<url>" ["<description>"]');
  process.exit(1);
}

const workspace = process.env.PENGUINS_WORKSPACE || '/Users/dusanmilenkovic/Desktop/Hermes/whitelabel';
const penguinsRoot = process.env.PENGUINS_ROOT || resolve(__dirname, '..');
const opencodeBin = process.env.OPENCODE_BIN || 'opencode';
const timeoutMs = parseInt(process.env.PENGUINS_ALEX_TIMEOUT_MS || '180000', 10);

// Read Alex agent definition
const alexAgentPath = resolve(penguinsRoot, 'agents', 'alex.md');
let alexDefinition = '';
try {
  alexDefinition = readFileSync(alexAgentPath, 'utf8');
} catch {
  console.error(`Warning: Could not read ${alexAgentPath} — using inline prompt`);
}

const descriptionLine = description ? `Description: ${description}` : '';

const prompt = [
  alexDefinition
    ? `You are Alex, a QA browser testing agent. Your full instructions:\n\n${alexDefinition}\n\n---`
    : `You are Alex, a QA browser testing agent. Open the page, check console errors and network failures, and return a structured report.`,
  ``,
  `Test request:`,
  `URL: ${url}`,
  descriptionLine,
  ``,
  `Use the chrome-devtools MCP tools to:`,
  `1. Navigate to the URL`,
  `2. Wait for the page to load`,
  `3. Take a screenshot`,
  `4. Read all console messages`,
  `5. Read all network requests`,
  `6. Take an accessibility snapshot`,
  `7. Produce the full Alex QA Report as described in your instructions`,
  ``,
  `Return ONLY the report. No extra commentary.`,
].filter((line) => line !== undefined).join('\n');

const args = ['run', '--auto', prompt];

const child = spawn(opencodeBin, args, {
  cwd: workspace,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: false,
});

let output = '';

child.stdout.on('data', (data) => {
  const chunk = String(data);
  output += chunk;
  process.stdout.write(chunk);
});

child.stderr.on('data', (data) => {
  process.stderr.write(data);
});

let timeoutId;
let forcedExit = false;

child.on('error', (err) => {
  if (timeoutId) clearTimeout(timeoutId);
  console.error('Failed to start opencode:', err.message);
  process.exit(1);
});

child.on('close', (code) => {
  if (timeoutId) clearTimeout(timeoutId);
  process.exit(forcedExit ? 1 : code == null ? 1 : code);
});

if (!Number.isNaN(timeoutMs) && timeoutMs > 0) {
  timeoutId = setTimeout(() => {
    forcedExit = true;
    console.error(`run-alex: timeout after ${timeoutMs}ms`);
    child.kill('SIGTERM');
    setTimeout(() => {
      if (!child.killed) child.kill('SIGKILL');
    }, 5000);
  }, timeoutMs);
}
