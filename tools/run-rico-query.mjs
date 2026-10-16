#!/usr/bin/env node
/**
 * run-rico-query.mjs
 *
 * Runs a Rico discovery query via opencode and prints the result to stdout.
 *
 * Usage:
 *   node tools/run-rico-query.mjs find "providers-jackpot"
 *   node tools/run-rico-query.mjs search "EGT_DIG"
 *
 * Exit codes:
 *   0 — success
 *   1 — error / timeout
 */

import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function expandTilde(text) {
  return text.replace(/~(?=[/\\])/g, homedir());
}

const mode = process.argv[2]; // 'find' | 'search'
const query = process.argv[3];

if (!mode || !query || !['find', 'search'].includes(mode)) {
  console.error('Usage: node run-rico-query.mjs <find|search> "<query>"');
  process.exit(1);
}

const workspace = process.env.PENGUINS_WORKSPACE || '/Users/dusanmilenkovic/Desktop/Hermes/whitelabel';
const penguinsRoot = process.env.PENGUINS_ROOT || resolve(__dirname, '..');
const opencodeBin = process.env.OPENCODE_BIN || 'opencode';
const timeoutMs = parseInt(process.env.PENGUINS_RICO_TIMEOUT_MS || '120000', 10);

const ricoAgentPath = resolve(penguinsRoot, 'agents', 'rico.md');

let prompt;

if (mode === 'find') {
  prompt = [
    `You are Rico, a fast file finder. The workspace is: ${workspace}.`,
    `Find files whose NAME matches: "${query}".`,
    `Use glob and grep tools. Return a numbered list of matching file paths, relative to the workspace root.`,
    `If nothing is found, say "No files found for: ${query}".`,
    `Return ONLY the file list — no explanations, no extra text.`,
  ].join(' ');
} else {
  prompt = [
    `You are Rico, a fast code searcher. The workspace is: ${workspace}.`,
    `Search file CONTENTS for: "${query}".`,
    `Use grep tools. Return a list of matches in format: "filepath:line: content".`,
    `Limit to the 20 most relevant matches.`,
    `If nothing is found, say "No matches found for: ${query}".`,
    `Return ONLY the match list — no explanations, no extra text.`,
  ].join(' ');
}

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
    console.error(`run-rico-query: timeout after ${timeoutMs}ms`);
    child.kill('SIGTERM');
    setTimeout(() => {
      if (!child.killed) child.kill('SIGKILL');
    }, 5000);
  }, timeoutMs);
}
