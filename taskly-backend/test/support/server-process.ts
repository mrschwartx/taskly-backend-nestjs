import { spawn, type ChildProcess } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import type { Environment } from '../../src/config/env.js';
import { createHttpClient } from './http-client.js';
import { buildTestEnv, createTempPublicDir, removeDir } from './test-config.js';

export const PROJECT_ROOT = path.resolve(import.meta.dirname, '../..');

export const findFreePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
  });

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const collect = (stream: NodeJS.ReadableStream): (() => string) => {
  const chunks: Buffer[] = [];
  stream.on('data', (chunk: Buffer) => chunks.push(chunk));
  return () => Buffer.concat(chunks).toString('utf8');
};

const waitForExit = (
  child: ChildProcess,
): Promise<{ code: number | null; signal: NodeJS.Signals | null }> =>
  new Promise((resolve) => {
    if (child.exitCode !== null) {
      resolve({ code: child.exitCode, signal: child.signalCode });
      return;
    }
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });

export const runNodeScript = async (
  script: string,
  env: Environment,
  { timeoutMs = 30000 }: { timeoutMs?: number } = {},
) => {
  const child = spawn(process.execPath, [script], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stdout = collect(child.stdout!);
  const stderr = collect(child.stderr!);
  const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
  const { code } = await waitForExit(child);
  clearTimeout(timer);
  return { code, stdout: stdout(), stderr: stderr() };
};

export interface StartServerProcessOptions {
  databaseUrl: string;
  overrides?: Environment;
}

export const startServerProcess = async ({
  databaseUrl,
  overrides = {},
}: StartServerProcessOptions) => {
  const port = await findFreePort();
  const publicDir = createTempPublicDir();
  const env = buildTestEnv({
    DATABASE_URL: databaseUrl,
    APP_PORT: String(port),
    PUBLIC_DIR: publicDir,
    ...overrides,
  });

  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stdout = collect(child.stdout!);
  const stderr = collect(child.stderr!);
  const baseUrl = `http://127.0.0.1:${port}`;

  const deadline = Date.now() + 20000;
  let ready = false;
  while (Date.now() < deadline && child.exitCode === null) {
    try {
      const response = await fetch(`${baseUrl}/`);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      await sleep(100);
    }
  }

  if (!ready) {
    child.kill('SIGKILL');
    removeDir(publicDir);
    throw new Error(`Server did not become ready.\n${stdout()}\n${stderr()}`);
  }

  return {
    env,
    port,
    baseUrl,
    publicDir,
    createClient: () => createHttpClient(baseUrl),
    output: () => ({ stdout: stdout(), stderr: stderr() }),
    stop: async (signal: NodeJS.Signals = 'SIGTERM') => {
      child.kill(signal);
      const result = await waitForExit(child);
      removeDir(publicDir);
      return result;
    },
  };
};
