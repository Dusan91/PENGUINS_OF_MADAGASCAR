#!/usr/bin/env node

import { mkdir, appendFile, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULTS = {
  enabled: true,
  provider: 'telegram',
  ntfyBaseUrl: 'https://ntfy.sh',
  ntfyTopic: 'penguins-dusan-7f3a9c',
  statusFile: '/tmp/penguins/notifications.jsonl',
  blockersFile: '/tmp/penguins/blockers.jsonl',
};

const ALLOWED_EVENTS = new Set([
  'workflow_complete',
  'workflow_failed',
  'decision_required',
  'approval_required',
  'validation_failed',
  'blocked',
  'workflow_started',
  'blocker_resolved',
]);

const BLOCKER_CALLBACK_PREFIX = 'penguins:blocker:resolve:';

async function readBlockers(blockersFile) {
  try {
    const content = await readFile(blockersFile, 'utf8');
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function findOpenBlocker(blockersFile, blockerId) {
  const entries = await readBlockers(blockersFile);
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (entry.blockerId === blockerId && entry.status === 'open') {
      return entry;
    }
  }
  return null;
}

const PRIORITY_MAP = new Map([
  ['min', '1'],
  ['low', '2'],
  ['default', '3'],
  ['high', '4'],
  ['urgent', '5'],
  ['1', '1'],
  ['2', '2'],
  ['3', '3'],
  ['4', '4'],
  ['5', '5'],
]);

// Event-specific message prefixes for Telegram (plain text — escaped in formatTelegramText)
const EVENT_PREFIXES = {
  workflow_complete: 'Smile and wave boys, smile and wave 🐧🐧🐧🐧🦒🐒',
  workflow_failed: 'Boys we have a problem!',
  decision_required: 'Kowalski! Options!',
  approval_required: 'Kowalski! Options!',
  validation_failed: 'Boys we have a problem!',
  blocked: 'Boys we have a problem!',
  blocker_resolved: 'Boys we have a problem!',
  workflow_started: '🐧 Penguins workflow started!',
};

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith('--')) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const key = arg.slice(2);

    if (key === 'dry-run') {
      args[key] = true;
      continue;
    }

    const value = argv[index + 1];

    if (!key) {
      throw new Error('Empty option name');
    }

    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }

    args[key] = value;
    index += 1;
  }

  return args;
}

// Load .env from Penguins root without adding dependencies.
// Existing process.env values take precedence; missing file is non-fatal.
async function loadEnvFromFile() {
  const rootDir = dirname(fileURLToPath(import.meta.url));
  try {
    const content = await readFile(`${rootDir}/../.env`, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) continue;
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // env file absent or unreadable — rely on process.env
  }
}

async function appendStatus(statusFile, entry) {
  await mkdir(dirname(statusFile), { recursive: true });
  await appendFile(statusFile, `${JSON.stringify(entry)}\n`, 'utf8');
}

function statusEntry(payload, status, details = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    event: payload.event,
    title: payload.title,
    status,
  };

  if (details.reason !== undefined) {
    entry.reason = details.reason;
  }

  if (details.statusCode !== undefined) {
    entry.statusCode = details.statusCode;
  }

  if (details.provider !== undefined) {
    entry.provider = details.provider;
  }

  if (payload.blockerId !== undefined) {
    entry.blockerId = payload.blockerId;
  }

  return entry;
}

async function appendBlocker(blockersFile, payload, details) {
  await mkdir(dirname(blockersFile), { recursive: true });
  const entry = {
    timestamp: new Date().toISOString(),
    blockerId: payload.blockerId,
    event: payload.event,
    title: payload.title,
    message: payload.message,
    status: payload.event === 'blocker_resolved' ? 'resolved' : 'open',
  };

  if (payload.followupMessage !== undefined) {
    entry.followupMessage = payload.followupMessage;
  }

  if (details.telegramMessageId !== undefined) {
    entry.telegramMessageId = details.telegramMessageId;
  }

  if (details.resolvedByChatId !== undefined) {
    entry.resolvedByChatId = details.resolvedByChatId;
  }

  if (details.resolvedByUserId !== undefined) {
    entry.resolvedByUserId = details.resolvedByUserId;
  }

  if (details.resolvedBy !== undefined) {
    entry.resolvedBy = details.resolvedBy;
  }

  await appendFile(blockersFile, `${JSON.stringify(entry)}\n`, 'utf8');
}

function cleanText(value, fieldName, maxLength) {
  if (typeof value !== 'string') {
    throw new Error(`Missing required --${fieldName}`);
  }

  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();

  if (!cleaned) {
    throw new Error(`--${fieldName} cannot be empty`);
  }

  if (cleaned.length > maxLength) {
    throw new Error(`--${fieldName} must be ${maxLength} characters or fewer`);
  }

  return cleaned;
}

function getConfig(env) {
  return {
    enabled: env.PENGUINS_NOTIFY_ENABLED === undefined
      ? DEFAULTS.enabled
      : env.PENGUINS_NOTIFY_ENABLED.toLowerCase() !== 'false',
    provider: env.PENGUINS_NOTIFY_PROVIDER || DEFAULTS.provider,
    // Telegram
    telegramToken: env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: env.TELEGRAM_CHAT_ID || '',
    // ntfy (fallback)
    ntfyBaseUrl: env.PENGUINS_NTFY_URL || DEFAULTS.ntfyBaseUrl,
    ntfyTopic: env.PENGUINS_NTFY_TOPIC || DEFAULTS.ntfyTopic,
  };
}

function buildPayload(args) {
  const event = cleanText(args.event, 'event', 64);
  if (!ALLOWED_EVENTS.has(event)) {
    throw new Error(`Unsupported event: ${event}`);
  }

  const title = cleanText(args.title, 'title', 120);
  const message = cleanText(args.message, 'message', 2000);
  const priority = args.priority === undefined ? undefined : cleanText(args.priority, 'priority', 16).toLowerCase();

  if (priority !== undefined && !PRIORITY_MAP.has(priority)) {
    throw new Error('--priority must be one of min, low, default, high, urgent, or 1-5');
  }

  // Parse options for interactive events (JSON array string: '[{"label":"Option A","value":"a"},...]')
  let options = undefined;
  if (args.options) {
    try {
      options = JSON.parse(args.options);
      if (!Array.isArray(options)) throw new Error('options must be a JSON array');
    } catch (err) {
      throw new Error(`--options parse error: ${err.message}`);
    }
  }

  // Blocker lifecycle fields
  const blockerId = args['blocker-id'] === undefined ? undefined : cleanText(args['blocker-id'], 'blocker-id', 64);
  const followupMessage = args['followup-message'] === undefined ? undefined : cleanText(args['followup-message'], 'followup-message', 2000);
  const resolvedBy = args['resolved-by'] === undefined ? undefined : cleanText(args['resolved-by'], 'resolved-by', 256);

  return {
    event,
    title,
    message,
    priority: priority === undefined ? undefined : PRIORITY_MAP.get(priority),
    options,
    blockerId,
    followupMessage,
    resolvedBy,
  };
}

function isCompletionTitle(title) {
  const base = 'Smile and wave boys, smile and wave';
  const normalize = (text) =>
    String(text)
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  return normalize(title) === normalize(base);
}

// Format Telegram message text based on event type
function formatTelegramText(payload) {
  const prefix = EVENT_PREFIXES[payload.event];
  const lines = [];

  if (prefix) {
    lines.push(`*${escapeMd(prefix)}*`);
    lines.push('');
  }

  if (payload.event === 'workflow_complete' && isCompletionTitle(payload.title)) {
    lines.push(escapeMd(payload.message));

    if (payload.options && payload.options.length > 0) {
      lines.push('');
      lines.push('_Dostupne opcije:_');
      payload.options.forEach((opt, i) => {
        lines.push(`${i + 1}\\. ${escapeMd(opt.label || opt.value || String(opt))}`);
      });
    }

    return lines.join('\n');
  }

  lines.push(`*${escapeMd(payload.title)}*`);
  lines.push('');
  lines.push(escapeMd(payload.message));

  if (payload.options && payload.options.length > 0) {
    lines.push('');
    lines.push('_Dostupne opcije:_');
    payload.options.forEach((opt, i) => {
      lines.push(`${i + 1}\\. ${escapeMd(opt.label || opt.value || String(opt))}`);
    });
  }

  return lines.join('\n');
}

// Minimal MarkdownV2 escaping for user-supplied text
function escapeMd(text) {
  return String(text).replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

// Build resolved text: use follow-up text from the open blocker entry if present.
async function buildResolvedMessage(blockersFile, payload) {
  if (payload.event !== 'blocker_resolved' || !payload.blockerId) {
    return payload.message;
  }

  const openBlocker = await findOpenBlocker(blockersFile, payload.blockerId);
  if (openBlocker?.followupMessage) {
    return openBlocker.followupMessage;
  }

  return payload.message;
}

// Build Telegram inline keyboard from options (if any)
function buildInlineKeyboard(options, event, blockerId) {
  // Blocker open notifications get a default resolve button unless custom options are supplied
  if (event === 'blocked' && blockerId && (!options || options.length === 0)) {
    const callbackData = `${BLOCKER_CALLBACK_PREFIX}${blockerId}`;
    if (callbackData.length > 64) {
      throw new Error('--blocker-id produces a callback payload longer than 64 characters');
    }
    return {
      inline_keyboard: [[
        { text: 'Resolve blocker', callback_data: callbackData },
      ]],
    };
  }

  if (!options || options.length === 0) return undefined;

  // One button per row, max 8 options to keep it readable
  const keyboard = options.slice(0, 8).map((opt, i) => [{
    text: `${i + 1}. ${opt.label || opt.value || String(opt)}`,
    callback_data: opt.value !== undefined ? String(opt.value) : String(i + 1),
  }]);

  return { inline_keyboard: keyboard };
}

async function sendTelegram(config, payload, blockersFile) {
  if (!config.telegramToken || !config.telegramChatId) {
    throw new Error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');
  }

  const resolvedMessage = await buildResolvedMessage(blockersFile, payload);
  const text = formatTelegramText({ ...payload, message: resolvedMessage });
  const replyMarkup = buildInlineKeyboard(payload.options, payload.event, payload.blockerId);

  const body = {
    chat_id: config.telegramChatId,
    text,
    parse_mode: 'MarkdownV2',
  };

  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  const response = await fetch(
    `https://api.telegram.org/bot${config.telegramToken}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => '(no body)');
    throw new Error(`Telegram HTTP ${response.status}: ${errText}`);
  }

  let telegramMessageId = null;
  try {
    const result = await response.clone().json();
    if (result?.result?.message_id) {
      telegramMessageId = result.result.message_id;
    }
  } catch {
    // ignore parse failure
  }

  return { statusCode: response.status, telegramMessageId };
}

function ntfyUrl(baseUrl, topic) {
  const url = new URL(baseUrl);
  url.pathname = `${url.pathname.replace(/\/$/, '')}/${encodeURIComponent(topic)}`;
  return url;
}

function validateNtfyConfig(config) {
  let url;
  try {
    url = new URL(config.ntfyBaseUrl);
  } catch {
    throw new Error('PENGUINS_NTFY_URL must be a valid URL');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('PENGUINS_NTFY_URL must use http or https');
  }

  if (!/^[A-Za-z0-9_-]{1,128}$/.test(config.ntfyTopic)) {
    throw new Error('PENGUINS_NTFY_TOPIC may only contain letters, numbers, underscore, and hyphen');
  }
}

async function sendNtfy(config, payload) {
  validateNtfyConfig(config);

  const headers = {
    Title: payload.title,
    Tags: payload.event.replace(/_/g, '-'),
  };

  if (payload.priority !== undefined) {
    headers.Priority = payload.priority;
  }

  const response = await fetch(ntfyUrl(config.ntfyBaseUrl, config.ntfyTopic), {
    method: 'POST',
    headers,
    body: payload.message,
  });

  if (!response.ok) {
    throw new Error(`ntfy HTTP ${response.status}`);
  }

  return response.status;
}

async function main() {
  await loadEnvFromFile();
  const args = parseArgs(process.argv.slice(2));
  const config = getConfig(process.env);
  const payload = buildPayload(args);
  const statusFile = args['status-file'] || DEFAULTS.statusFile;

  if (args['dry-run']) {
    await appendStatus(statusFile, statusEntry(payload, 'skipped', { reason: 'dry-run' }));
    console.log(`skip: dry-run (${payload.event})`);
    return;
  }

  if (!config.enabled) {
    await appendStatus(statusFile, statusEntry(payload, 'skipped', { reason: 'disabled' }));
    console.log(`skip: notifications disabled (${payload.event})`);
    return;
  }

  const blockersFile = args['blockers-file'] || DEFAULTS.blockersFile;

  // Attempt Telegram first (primary)
  let telegramError = null;
  try {
    const { statusCode, telegramMessageId } = await sendTelegram(config, payload, blockersFile);
    await appendStatus(statusFile, statusEntry(payload, 'sent', { provider: 'telegram', statusCode }));

    // Append blocker lifecycle state for blocked / blocker_resolved events.
    // The resolved entry is written here (and only here) so a single resolve action
    // produces exactly one resolved row.
    if (payload.event === 'blocked' || payload.event === 'blocker_resolved') {
      await appendBlocker(blockersFile, payload, { telegramMessageId, resolvedBy: payload.resolvedBy });
    }

    console.log(`sent: ${payload.event} via telegram`);
    return;
  } catch (err) {
    telegramError = err;
    console.error(`telegram fail: ${err.message} — falling back to ntfy`);
  }

  // Fallback: ntfy
  try {
    const statusCode = await sendNtfy(config, payload);
    await appendStatus(statusFile, statusEntry(payload, 'sent', { provider: 'ntfy-fallback', statusCode }));
    console.log(`sent: ${payload.event} via ntfy (fallback)`);
  } catch (ntfyErr) {
    await appendStatus(statusFile, statusEntry(payload, 'failed', {
      reason: `telegram: ${telegramError.message}; ntfy: ${ntfyErr.message}`,
    }));
    // Log but do NOT exit with error — workflow must continue
    console.error(`fail: both telegram and ntfy failed. telegram=${telegramError.message} ntfy=${ntfyErr.message}`);
  }
}

main().catch((error) => {
  console.error(`fail: ${error.message}`);
  process.exitCode = 1;
});
