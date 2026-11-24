import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createEngine } from './engine.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const engine = createEngine({
  memoryRoot: path.resolve(directory, '../..'),
  codeRoot: '/Users/dusanmilenkovic/Desktop/Hermes/whitelabel',
  dataDir: path.join(directory, '.local'),
  cloudConfig: path.join(os.homedir(), '.ollama/server.json'),
});

try {
  const [command, argument, ...rest] = process.argv.slice(2);
  let result;
  if (command === 'index' && ['memory', 'code'].includes(argument) && (rest.length === 0 || (rest.length === 1 && rest[0] === '--dry-run'))) {
    result = await engine.index(argument, rest[0] === '--dry-run');
  } else if (['search', 'packet', 'validate-packet'].includes(command) && argument && rest.length === 0) {
    result = await engine[command === 'validate-packet' ? 'validatePacket' : command](argument);
  } else throw new Error('usage');
  console.log(JSON.stringify(result));
} catch (error) {
  // Never echo paths, payloads, source text, service bodies or native error messages.
  const known = /^(?:usage|query|kind|cloud-config|cloud-status|embedding-schema|embed-input|service-[a-z-]+|response-[a-z-]+|index-schema|packet-[a-z-]+|stale-result|locked-manual-recovery-required|source-[a-z-]+|unsafe-[a-z-]+|ancestor-changed|target-changed|temp-changed|lock-changed|output-size|file-count|chunk-count|size|nonregular|sensitive-content|generated|binary)$/;
  console.error(JSON.stringify({ error: known.test(error.message) ? error.message : 'local-operation-failed' }));
  process.exitCode = 1;
}
