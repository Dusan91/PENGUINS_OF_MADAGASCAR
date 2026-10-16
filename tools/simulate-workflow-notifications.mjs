#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const STATUS_FILE = '/tmp/penguins/notifications-simulation.jsonl';
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const NOTIFY_SCRIPT = join(SCRIPT_DIR, 'notify.mjs');

const commands = [
  {
    event: 'workflow_started',
    title: 'Penguins workflow started',
    message: 'Dry-run notification simulation started',
    priority: 'default',
  },
  {
    event: 'decision_required',
    title: 'Penguins decision needed',
    message: 'Dry-run notification simulation decision point',
    priority: 'high',
  },
  {
    event: 'workflow_complete',
    title: 'Penguins workflow complete',
    message: 'Dry-run notification simulation complete',
    priority: 'default',
  },
];

for (const command of commands) {
  const result = spawnSync(process.execPath, [
    NOTIFY_SCRIPT,
    '--dry-run',
    '--status-file',
    STATUS_FILE,
    '--event',
    command.event,
    '--title',
    command.title,
    '--message',
    command.message,
    '--priority',
    command.priority,
  ], {
    encoding: 'utf8',
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    process.exitCode = result.status || 1;
    break;
  }
}

if (!process.exitCode) {
  console.log(`simulation status file: ${STATUS_FILE}`);
}
