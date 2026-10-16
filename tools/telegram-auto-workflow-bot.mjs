/* 
cd /Users/dusanmilenkovic/Desktop/ai_agents/PENGUINS_OF_MADAGASCAR
node tools/telegram-auto-workflow-bot.mjs
Kasnije možeš ga držati stalno upaljenog preko launchd, pm2, ili običnog terminala.
*/


import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULTS = {
  pollingIntervalMs: 1000,
};

const PROTECTED_PATHS = [
  { type: 'segment', value: 'auth' },
  { type: 'segment', value: 'payments' },
  { type: 'segment', value: 'env' },
  { type: 'segment', value: 'config' },
  { type: 'segments', value: ['api', 'core'] },
  { type: 'segment', value: '.github' },
  { type: 'segments', value: ['database', 'migrations'] },
  { type: 'file', value: 'middleware.ts' },
];

const REQUIRED_FIELDS = ['Task:'];
const OPTIONAL_FIELDS = ['File:', 'Files:', 'Validation:', 'Scope:'];
const KNOWN_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const LOG_FILE = '/tmp/penguins/telegram-auto-workflow-bot.log';
const BLOCKERS_FILE = '/tmp/penguins/blockers.jsonl';
const BLOCKER_CALLBACK_PREFIX = 'penguins:blocker:resolve:';

let workflowRunning = false;
let lastUpdateId = 0;
let config = null;

async function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  // eslint-disable-next-line no-console
  console.log(line.trimEnd());
  try {
    await mkdir(dirname(LOG_FILE), { recursive: true });
    await writeFile(LOG_FILE, line, { flag: 'a' });
  } catch {
    // ignore log write failures
  }
}

async function loadEnvFromFile() {
  const envPath = resolve(SCRIPT_DIR, '..', '.env');
  try {
    const content = await readFile(envPath, 'utf8');
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

async function getConfig(env) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const allowedChatId = env.TELEGRAM_ALLOWED_CHAT_ID || env.TELEGRAM_CHAT_ID;

  if (!token || !allowedChatId) {
    throw new Error('TELEGRAM_BOT_TOKEN and TELEGRAM_ALLOWED_CHAT_ID or TELEGRAM_CHAT_ID are required');
  }

  const loadedConfig = {
    token: '[redacted]',
    allowedChatId: String(allowedChatId),
    penguinsRoot: env.PENGUINS_ROOT || resolve(SCRIPT_DIR, '..'),
    workspace: env.PENGUINS_WORKSPACE || process.cwd(),
    autoWorkflowCommand: env.PENGUINS_AUTO_WORKFLOW_COMMAND || '',
    pollingIntervalMs: DEFAULTS.pollingIntervalMs,
  };

  const runtimeConfig = {
    ...loadedConfig,
    token,
  };

  await log(`Config loaded: ${JSON.stringify(loadedConfig)}`);

  return runtimeConfig;
}

function escapeMd(text) {
  return String(text).replace(/[_*[\]()~`>#+=|{}.!\\-]/g, '\\$&');
}

function md(strings, ...values) {
  return strings.reduce(
    (acc, str, i) => acc + escapeMd(str) + (i < values.length ? escapeMd(values[i]) : ''),
    '',
  );
}

async function telegramApi(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${config.token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '(no body)');
    throw new Error(`Telegram ${method} HTTP ${response.status}: ${errText}`);
  }

  return response.json();
}

async function sendMessage(chatId, text) {
  await telegramApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'MarkdownV2',
  });
}

function isProtectedPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const segments = normalized.split('/').filter(Boolean);
  const fileName = segments[segments.length - 1] || '';

  return PROTECTED_PATHS.some((protectedPath) => {
    if (protectedPath.type === 'file') {
      return fileName === protectedPath.value;
    }
    if (protectedPath.type === 'segment') {
      return segments.includes(protectedPath.value);
    }
    if (protectedPath.type === 'segments') {
      const required = protectedPath.value;
      for (let i = 0; i <= segments.length - required.length; i += 1) {
        if (required.every((segment, index) => segments[i + index] === segment)) {
          return true;
        }
      }
      return false;
    }
    return false;
  });
}

function parseFilePaths(fields) {
  const paths = [];

  // File: single path
  if (fields['File:']) {
    const p = fields['File:'].trim();
    if (p) paths.push(p);
  }

  // Files: one per line, optionally prefixed with - or *
  if (fields['Files:']) {
    for (const line of fields['Files:'].split(/\r?\n/)) {
      const p = line.trim().replace(/^[-*]\s*/, '').replace(/^['"]|['"]$/g, '');
      if (p) paths.push(p);
    }
  }

  return [...new Set(paths)];
}

function parseCommandMessage(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const commandLine = lines[0] || '';

  if (!commandLine.startsWith('/auto-workflow')) {
    return { ok: false, reason: 'Unknown command. Use /auto-workflow or /help.' };
  }

  const fields = {};
  let currentKey = null;

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    const fieldMatch = line.match(/^([A-Z][a-zA-Z]*):\s*(.*)$/);

    if (fieldMatch) {
      const key = `${fieldMatch[1]}:`;
      if (KNOWN_FIELDS.includes(key)) {
        currentKey = key;
        fields[currentKey] = (fields[currentKey] || '') + fieldMatch[2];
      } else {
        currentKey = null;
      }
    } else if (currentKey) {
      fields[currentKey] += `\n${line}`;
    }
  }

  const missing = REQUIRED_FIELDS.filter((key) => !fields[key] || !fields[key].trim());
  if (missing.length > 0) {
    return {
      ok: false,
      reason: `Missing required fields: ${missing.join(', ')}`,
    };
  }

  // Require at least one of File: or Files:
  if (!fields['File:'] && !fields['Files:']) {
    return {
      ok: false,
      reason: 'Missing required fields: File: (single) or Files: (multiple, one per line)',
    };
  }

  // Parse file list — support both File: and Files:
  const filePaths = parseFilePaths(fields);

  if (filePaths.length === 0) {
    return { ok: false, reason: 'No valid file paths found in File: or Files:' };
  }

  const protectedFile = filePaths.find(isProtectedPath);
  if (protectedFile) {
    return {
      ok: false,
      reason: `File path is protected and cannot be modified: ${protectedFile}`,
    };
  }

  return { ok: true, fields, filePaths };
}

async function writeInputFiles(fields, filePaths) {
  const penguinsRoot = config.penguinsRoot;
  const userCommandPath = resolve(penguinsRoot, 'inputs', 'user-command.md');
  const jiraTaskPath = resolve(penguinsRoot, 'inputs', 'jira-task.md');
  const figmaNotesPath = resolve(penguinsRoot, 'inputs', 'figma-notes.md');

  const task = fields['Task:'].trim();
  const scope = (fields['Scope:'] || '').trim();
  const validation = (fields['Validation:'] || '').trim();

  const lines = [
    '# User Command',
    'Low-cost Penguins.',
  ];

  if (filePaths.length === 1) {
    lines.push(`File: '${filePaths[0]}'`);
  } else {
    lines.push('Files:');
    for (const fp of filePaths) {
      lines.push(`- '${fp}'`);
    }
  }

  lines.push(`Task: '${task}'`);

  if (scope) {
    lines.push(`Scope: "${scope}"`);
  }

  if (validation) {
    lines.push(`Validation: ${validation}`);
  } else {
    lines.push('Validation: grep/read only, no full lint');
  }

  lines.push('No audit unless required');

  await writeFile(userCommandPath, lines.join('\n') + '\n', 'utf8');
  await writeFile(jiraTaskPath, '', 'utf8');
  await writeFile(figmaNotesPath, '', 'utf8');

  return { filePaths, task, scope, validation };
}

async function runAlexTest(chatId, url, description) {
  const scriptPath = resolve(SCRIPT_DIR, 'run-alex.mjs');
  const opencodeBin = process.env.OPENCODE_BIN || 'opencode';

  const spawnArgs = [scriptPath, url];
  if (description) spawnArgs.push(description);

  const child = spawn(
    process.execPath,
    spawnArgs,
    {
      shell: false,
      cwd: config.workspace,
      stdio: 'pipe',
      env: {
        ...process.env,
        PENGUINS_WORKSPACE: config.workspace,
        PENGUINS_ROOT: config.penguinsRoot,
        OPENCODE_BIN: opencodeBin,
      },
    },
  );

  let output = '';

  child.stdout.on('data', (data) => { output += String(data); });
  child.stderr.on('data', (data) => {
    log(`[alex stderr] ${String(data).trimEnd()}`).catch(() => {});
  });

  await new Promise((resolvePromise) => {
    child.on('close', async (code) => {
      await log(`Alex test completed for chatId=${chatId} url=${url} exit=${code}`);

      const result = output.trim() || '(no output)';
      const truncated = result.length > 3800
        ? `...(truncated to last 3800 chars)\n${result.slice(-3800)}`
        : result;

      if (code === 0) {
        await sendMessage(chatId, md`${truncated}`);
      } else {
        await sendMessage(chatId, md`Alex test failed (exit ${code}):\n\n${truncated}`);
      }
      resolvePromise();
    });

    child.on('error', async (err) => {
      await log(`Alex test failed to start for chatId=${chatId}: ${err.message}`);
      await sendMessage(chatId, md`Failed to start Alex: ${err.message}`);
      resolvePromise();
    });
  });
}

async function runRicoQuery(chatId, mode, query) {
  const scriptPath = resolve(SCRIPT_DIR, 'run-rico-query.mjs');
  const opencodeBin = process.env.OPENCODE_BIN || 'opencode';

  const child = spawn(
    process.execPath,
    [scriptPath, mode, query],
    {
      shell: false,
      cwd: config.workspace,
      stdio: 'pipe',
      env: {
        ...process.env,
        PENGUINS_WORKSPACE: config.workspace,
        PENGUINS_ROOT: config.penguinsRoot,
        OPENCODE_BIN: opencodeBin,
      },
    },
  );

  let output = '';

  child.stdout.on('data', (data) => { output += String(data); });
  child.stderr.on('data', (data) => {
    log(`[rico stderr] ${String(data).trimEnd()}`).catch(() => {});
  });

  await new Promise((resolvePromise) => {
    child.on('close', async (code) => {
      await log(`Rico ${mode} completed for chatId=${chatId} with exit code ${code}`);

      const result = output.trim() || '(no output)';
      // Truncate to last 3000 chars to fit Telegram message limits
      const truncated = result.length > 3000
        ? `...(truncated)\n${result.slice(-3000)}`
        : result;

      if (code === 0) {
        await sendMessage(chatId, md`Rico ${mode} results for "${query}":\n\n${truncated}`);
      } else {
        await sendMessage(chatId, md`Rico ${mode} failed (exit ${code}):\n\n${truncated}`);
      }
      resolvePromise();
    });

    child.on('error', async (err) => {
      await log(`Rico query failed to start for chatId=${chatId}: ${err.message}`);
      await sendMessage(chatId, md`Failed to start Rico: ${err.message}`);
      resolvePromise();
    });
  });
}

function formatNotifyArgs(event, title, message, extra = {}) {
  const args = [
    '--event', event,
    '--title', title,
    '--message', message,
  ];

  if (extra.priority) {
    args.push('--priority', extra.priority);
  }

  if (extra.blockerId) {
    args.push('--blocker-id', extra.blockerId);
  }

  if (extra.followupMessage) {
    args.push('--followup-message', extra.followupMessage);
  }

  if (extra.resolvedBy) {
    args.push('--resolved-by', extra.resolvedBy);
  }

  return args;
}

async function runNotifyScript(title, message, extra = {}) {
  const notifyPath = resolve(SCRIPT_DIR, 'notify.mjs');
  const result = spawnSync(process.execPath, [
    notifyPath,
    ...formatNotifyArgs(extra.event || 'workflow_complete', title, message, extra),
  ], { encoding: 'utf8' });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'notify script failed');
  }

  return result;
}

async function runWorkflowCommand(chatId, file, task) {
  let command = config.autoWorkflowCommand.trim();

  if (!command || command === '/auto-workflow') {
    await log(`Workflow command not configured for chatId=${chatId}`);
    await sendMessage(
      chatId,
      md`Input files are ready. No workflow runner command is configured.`,
    );
    return;
  }

  if (workflowRunning) {
    await log(`Workflow start skipped for chatId=${chatId}: another workflow is already running`);
    await sendMessage(
      chatId,
      md`A workflow is already running. Please wait for it to finish.`,
    );
    return;
  }

  workflowRunning = true;
  await log(`Starting workflow for chatId=${chatId} file=${file} task=${task}: ${command}`);

  try {
    await sendMessage(chatId, md`Starting workflow: ${command}`);

    const child = spawn(command, [], {
      shell: true,
      cwd: config.workspace,
      stdio: 'pipe',
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      const chunk = String(data);
      output += chunk;
      // eslint-disable-next-line no-console
      console.log(`[workflow stdout] ${chunk.trimEnd()}`);
      log(`[workflow stdout] ${chunk.trimEnd()}`).catch(() => {});
    });

    child.stderr.on('data', (data) => {
      const chunk = String(data);
      errorOutput += chunk;
      // eslint-disable-next-line no-console
      console.error(`[workflow stderr] ${chunk.trimEnd()}`);
      log(`[workflow stderr] ${chunk.trimEnd()}`).catch(() => {});
    });

    await new Promise((resolvePromise) => {
      child.on('close', async (code) => {
        await log(`Workflow completed for chatId=${chatId} with exit code ${code}`);
        if (code === 0) {
          await sendMessage(chatId, md`Workflow completed successfully.`);
        } else {
          const details = errorOutput || output || '(no output)';
          const trimmed = details.split('\n').slice(-20).join('\n');
          await sendMessage(
            chatId,
            md`Workflow failed with exit code ${code}.\n\n${trimmed}`,
          );
        }
        resolvePromise();
      });

      child.on('error', async (err) => {
        await log(`Workflow failed to start for chatId=${chatId}: ${err.message}`);
        await sendMessage(chatId, md`Failed to start workflow: ${err.message}`);
        resolvePromise();
      });
    });
  } finally {
    workflowRunning = false;
  }
}


async function handleCallbackQuery(callbackQuery) {
  const callbackData = callbackQuery.data || '';
  if (!callbackData.startsWith(BLOCKER_CALLBACK_PREFIX)) return;

  const blockerId = callbackData.slice(BLOCKER_CALLBACK_PREFIX.length);
  if (!blockerId) return;

  const message = callbackQuery.message;
  const chatId = message?.chat?.id;
  const resolvedByChatId = callbackQuery.from?.id;
  const resolvedByUsername = callbackQuery.from?.username || callbackQuery.from?.first_name || 'unknown';

  if (!chatId) return;

  if (String(chatId) !== config.allowedChatId) {
    await log(`Rejected callback from unauthorized chatId=${chatId}`);
    return;
  }

  await log(`Blocker resolve callback chatId=${chatId} blockerId=${blockerId} user=${resolvedByUsername}`);

  // Answer the callback query to stop the spinner on the user's client
  try {
    await telegramApi('answerCallbackQuery', {
      callback_query_id: callbackQuery.id,
      text: `Resolving blocker ${blockerId}`,
      show_alert: false,
    });
  } catch (err) {
    await log(`answerCallbackQuery failed: ${err.message}`);
  }

  // Attempt to disable the inline keyboard on the original message
  if (message?.message_id) {
    try {
      await telegramApi('editMessageReplyMarkup', {
        chat_id: chatId,
        message_id: message.message_id,
        reply_markup: { inline_keyboard: [] },
      });
    } catch (err) {
      await log(`editMessageReplyMarkup failed: ${err.message}`);
    }
  }

  // Send follow-up notification through the existing notify.mjs path.
  // notify.mjs appends the resolved lifecycle entry, so the bot must NOT
  // append it here; doing so would create a duplicate resolved row.
  try {
    await runNotifyScript(
      'Penguins blocker resolved',
      `Blocker ${blockerId} was resolved by ${resolvedByUsername}`,
      {
        event: 'blocker_resolved',
        priority: 'default',
        blockerId,
        resolvedBy: resolvedByUsername,
      },
    );
    await log(`Follow-up blocker_resolved notification sent for blockerId=${blockerId}`);
  } catch (err) {
    await log(`blocker_resolved notify failed: ${err.message}`);
  }
}

async function processUpdate(update) {
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
    return;
  }

  if (!update.message) return;

  const message = update.message;
  const chatId = message.chat?.id;
  const text = message.text || '';

  if (!chatId) return;

  if (String(chatId) !== config.allowedChatId) {
    await log(`Rejected message from unauthorized chatId=${chatId}`);
    return;
  }

  await log(`Received message chatId=${chatId}: ${text.split('\n')[0]}`);

  if (text.trim() === '/help') {
    await sendMessage(
      chatId,
      md`*Auto Workflow Bot Help*\n\n`
        + md`--- WORKFLOW ---\n`
        + md`Send /auto-workflow with input fields:\n\n`
        + md`Single file (small tier):\n`
        + md`File: path/to/file.tsx\n\n`
        + md`Multiple files (medium tier):\n`
        + md`Files:\n`
        + md`- path/to/file1.tsx\n`
        + md`- path/to/file2.tsx\n\n`
        + md`Task: describe the change\n`
        + md`Scope: optional scope note\n`
        + md`Validation: optional validation note\n\n`
        + md`--- DISCOVERY ---\n`
        + md`/find <query>   — Rico finds files by name\n`
        + md`/search <query> — Rico searches file contents\n\n`
        + md`--- QA TESTING ---\n`
        + md`/test <url>                    — Alex tests the page\n`
        + md`/test <url> -- <description>   — Alex tests with context\n\n`
        + md`--- OTHER ---\n`
        + md`/status — show bot status\n\n`
        + md`Protected paths (auth, payments, middleware, env, config, api/core, .github, database/migrations) are rejected.`,
    );
    return;
  }

  if (text.trim() === '/status') {
    const status = workflowRunning ? 'running' : 'idle';
    await sendMessage(chatId, md`Bot status: ${status}`);
    return;
  }

  // /find <query> — Rico finds files by name
  // /search <query> — Rico searches file contents
  const ricoMatch = text.trim().match(/^\/(find|search)\s+(.+)$/s);
  if (ricoMatch) {
    const ricoMode = ricoMatch[1];
    const ricoQuery = ricoMatch[2].trim();
    await log(`Rico ${ricoMode} query from chatId=${chatId}: ${ricoQuery}`);
    await sendMessage(chatId, md`Rico is searching for: ${ricoQuery}`);
    await runRicoQuery(chatId, ricoMode, ricoQuery);
    return;
  }

  // /test <url> [-- <description>] — Alex QA browser test
  const testMatch = text.trim().match(/^\/test\s+(https?:\/\/\S+)(?:\s+--\s+(.+))?$/s);
  if (testMatch) {
    const testUrl = testMatch[1].trim();
    const testDescription = (testMatch[2] || '').trim();
    await log(`Alex test from chatId=${chatId}: url=${testUrl} desc=${testDescription}`);
    await sendMessage(chatId, md`Alex is testing: ${testUrl}\nThis may take up to 3 minutes...`);
    await runAlexTest(chatId, testUrl, testDescription);
    return;
  }

  const parsed = parseCommandMessage(text);

  if (!parsed.ok) {
    await log(`Invalid request from chatId=${chatId}: ${parsed.reason}`);
    await sendMessage(
      chatId,
      md`Invalid request: ${parsed.reason}\n\nUse /help for usage instructions.`,
    );
    return;
  }

  const { filePaths } = parsed;
  const task = parsed.fields['Task:'].trim();

  try {
    await log(`Writing input files for chatId=${chatId} files=${filePaths.join(', ')}`);
    await writeInputFiles(parsed.fields, filePaths);
    await log(`Input files written for chatId=${chatId}: files=${filePaths.join(', ')}`);
  } catch (err) {
    await log(`Failed to write input files for chatId=${chatId}: ${err.message}`);
    await sendMessage(chatId, md`Failed to write input files: ${err.message}`);
    return;
  }

  await sendMessage(
    chatId,
    md`Input files written for:\nFiles: ${filePaths.join(', ')}\nTask: ${task}`,
  );

  await runWorkflowCommand(chatId, filePaths.join(', '), task);
}

async function pollOnce() {
  const data = await telegramApi('getUpdates', {
    offset: lastUpdateId + 1,
    limit: 10,
  });

  if (!data.ok || !Array.isArray(data.result)) {
    throw new Error('Unexpected Telegram response');
  }

  for (const update of data.result) {
    if (update.update_id > lastUpdateId) {
      lastUpdateId = update.update_id;
    }
    await processUpdate(update);
  }
}

async function main() {
  await loadEnvFromFile();
  config = await getConfig(process.env);
  await log('Startup pending updates will be processed, not flushed');
  await log('Bot startup complete; polling started');

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await pollOnce();
    } catch (err) {
      await log(`Poll error: ${err.message}`);
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, config.pollingIntervalMs));
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(`Fatal: ${error.message}`);
  process.exitCode = 1;
});
