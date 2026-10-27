/**
 * ============================================================================
 * SECURITY NOTICE / DISCLAIMER:
 * A plain child process is NOT a sandbox.
 * Environment stripping and timeouts stop accidents and casual abuse, but the
 * executed code can still read files that the OS user can read (e.g. backend/.env).
 * This runner is strictly intended for local development or demo purposes only,
 * and is OFF by default (CODE_RUNNER_ENABLED=false).
 * Production use requires Docker, Judge0, or Piston behind the same interface.
 * ============================================================================
 */

import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

export type TestCaseVerdict =
  | 'Accepted'
  | 'Wrong Answer'
  | 'Runtime Error'
  | 'Time Limit Exceeded'
  | 'Output Limit Exceeded';

export interface TestCaseInput {
  id?: string;
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
}

export interface TestCaseResult {
  testCaseNumber: number;
  verdict: TestCaseVerdict;
  passed: boolean;
  isHidden: boolean;
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  error?: string;
  executionTimeMs?: number;
}

export interface RunResult {
  verdict: TestCaseVerdict;
  passed: boolean;
  passedTestCases: number;
  totalTestCases: number;
  results: TestCaseResult[];
}

export interface CodeRunner {
  run(language: string, sourceCode: string, testCases: TestCaseInput[]): Promise<RunResult>;
}

// Global submit rate limiter: 10 per minute per user
const userSubmitTimestamps = new Map<string, number[]>();

export function checkSubmitRateLimit(userId: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxSubmits = 10;

  const timestamps = userSubmitTimestamps.get(userId) || [];
  const validTimestamps = timestamps.filter(t => now - t < windowMs);

  if (validTimestamps.length >= maxSubmits) {
    const oldest = validTimestamps[0];
    const retryAfterSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  validTimestamps.push(now);
  userSubmitTimestamps.set(userId, validTimestamps);
  return { allowed: true };
}

export function resetSubmitRateLimit(userId?: string): void {
  if (userId) {
    userSubmitTimestamps.delete(userId);
  } else {
    userSubmitTimestamps.clear();
  }
}

// In-memory concurrency queue (max 2 concurrent runs)
class ConcurrencyLimiter {
  private active = 0;
  private peak = 0;
  private readonly maxConcurrent = 2;
  private readonly queue: Array<() => void> = [];

  async acquire(): Promise<void> {
    if (this.active < this.maxConcurrent) {
      this.active++;
      if (this.active > this.peak) this.peak = this.active;
      return;
    }
    return new Promise((resolve) => {
      this.queue.push(() => {
        this.active++;
        if (this.active > this.peak) this.peak = this.active;
        resolve();
      });
    });
  }

  release(): void {
    this.active--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    }
  }

  getActive(): number {
    return this.active;
  }

  getPeak(): number {
    return this.peak;
  }

  resetPeak(): void {
    this.peak = this.active;
  }
}

const concurrencyLimiter = new ConcurrencyLimiter();

export function getActiveConcurrency(): number {
  return concurrencyLimiter.getActive();
}

export function getPeakConcurrency(): number {
  return concurrencyLimiter.getPeak();
}

export function resetPeakConcurrency(): void {
  concurrencyLimiter.resetPeak();
}

/**
 * Sanitizes runner error output:
 * Replaces any temp-directory path, OS username, AppData, or home path with "<sandbox>".
 */
export function sanitizeSandboxError(text: string, tempDir?: string | null): string {
  if (!text) return text;
  let sanitized = String(text);

  if (tempDir) {
    const forward = tempDir.replace(/\\/g, '/');
    const backward = tempDir.replace(/\//g, '\\');
    sanitized = sanitized.replaceAll(backward, '<sandbox>').replaceAll(forward, '<sandbox>');
  }

  try {
    const tmp = os.tmpdir();
    if (tmp) {
      sanitized = sanitized.replaceAll(tmp.replace(/\//g, '\\'), '<sandbox>')
                           .replaceAll(tmp.replace(/\\/g, '/'), '<sandbox>');
    }
  } catch {}

  try {
    const home = os.homedir();
    if (home) {
      sanitized = sanitized.replaceAll(home.replace(/\//g, '\\'), '<sandbox>')
                           .replaceAll(home.replace(/\\/g, '/'), '<sandbox>');
    }
  } catch {}

  try {
    const user = os.userInfo()?.username;
    if (user && user.length > 1) {
      sanitized = sanitized.replaceAll(user, '<sandbox>');
    }
  } catch {}

  // Replace any Users or AppData path structures on Windows & Linux
  sanitized = sanitized.replace(/[a-zA-Z]:[\\/](?:Users|Documents and Settings)[\\/][^\\/\s"':;]+/gi, '<sandbox>');
  sanitized = sanitized.replace(/[\\/]home[\\/][^\\/\s"':;]+/gi, '<sandbox>');
  sanitized = sanitized.replace(/(?:[a-zA-Z]:)?[\\/]?AppData[\\/][^\\/\s"':;]+/gi, '<sandbox>');
  sanitized = sanitized.replace(/intelliplace-run-[a-zA-Z0-9_-]+/gi, '<sandbox>');

  // Generic replacements for any remaining fragments
  sanitized = sanitized.replace(/[a-zA-Z]:\\Users/gi, '<sandbox>');
  sanitized = sanitized.replace(/[a-zA-Z]:\/Users/gi, '<sandbox>');
  sanitized = sanitized.replace(/AppData/gi, '<sandbox>');

  return sanitized;
}

/**
 * Normalizes output according to requirements:
 * 1. Normalize CRLF to LF
 * 2. Trim trailing whitespace on each line
 * 3. Trim trailing blank lines on both sides
 */
export function normalizeOutput(str: string): string {
  return str
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n+$/, '');
}

/**
 * Resolves binary paths once at module load
 */
function resolveBinary(configured: string | undefined, defaultCandidates: string[]): string {
  if (configured) {
    if (path.isAbsolute(configured) && fs.existsSync(configured)) {
      return configured;
    }
    for (const c of [configured, ...defaultCandidates]) {
      if (fs.existsSync(c)) return path.resolve(c);
    }
  }
  for (const c of defaultCandidates) {
    if (fs.existsSync(c)) return path.resolve(c);
  }
  return defaultCandidates[0] || 'python';
}

const nodeBinary = process.env.NODE_BIN && fs.existsSync(process.env.NODE_BIN)
  ? path.resolve(process.env.NODE_BIN)
  : process.execPath;

const pythonBinary = resolveBinary(process.env.PYTHON_BIN, [
  'C:\\Users\\FUAD\\AppData\\Local\\Programs\\Python\\Python312\\python.exe',
  'C:\\Users\\FUAD\\AppData\\Local\\Programs\\Python\\Python311\\python.exe',
  'C:\\Python312\\python.exe',
  'C:\\Python311\\python.exe',
  '/usr/bin/python3',
  '/usr/local/bin/python3',
  'python',
]);

const taskkillBinary = process.platform === 'win32'
  ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe')
  : null;

/**
 * LocalProcessRunner executes code using child_process.spawn with shell:false.
 */
export class LocalProcessRunner implements CodeRunner {
  private readonly timeLimitMs: number;
  private readonly outputLimitBytes: number;
  private readonly maxSourceBytes: number;

  constructor() {
    this.timeLimitMs = parseInt(process.env.CODE_TIME_LIMIT_MS || '2000', 10);
    this.outputLimitBytes = parseInt(process.env.CODE_OUTPUT_LIMIT_BYTES || '65536', 10);
    this.maxSourceBytes = parseInt(process.env.CODE_MAX_SOURCE_BYTES || '20000', 10);
  }

  async run(
    language: string,
    sourceCode: string,
    testCases: TestCaseInput[]
  ): Promise<RunResult> {
    const lang = language.toLowerCase();
    if (lang !== 'python' && lang !== 'javascript') {
      throw new Error(`Unsupported language: ${language}. Enabled languages: python, javascript`);
    }

    if (Buffer.byteLength(sourceCode, 'utf8') > this.maxSourceBytes) {
      throw new Error(`Source code exceeds maximum allowed size of ${this.maxSourceBytes} bytes`);
    }

    await concurrencyLimiter.acquire();
    let tempDir: string | null = null;

    try {
      // Create fresh temp directory under os.tmpdir()
      tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'intelliplace-run-'));

      const filename = lang === 'python' ? 'solution.py' : 'solution.js';
      const scriptPath = path.join(tempDir, filename);
      await fs.promises.writeFile(scriptPath, sourceCode, 'utf8');

      const results: TestCaseResult[] = [];
      let overallVerdict: TestCaseVerdict = 'Accepted';
      let passedTestCases = 0;

      // Minimal env object: only what interpreter needs to boot (no JWT_SECRET, DATABASE_URL, etc.)
      const minimalEnv: NodeJS.ProcessEnv = process.platform === 'win32'
        ? {
            SystemRoot: process.env.SystemRoot || 'C:\\Windows',
            TEMP: os.tmpdir(),
            TMP: os.tmpdir(),
            PATH: process.env.PATH || '',
          }
        : {
            PATH: '/usr/bin:/bin:/usr/local/bin',
            TMPDIR: '/tmp',
          };

      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const caseNumber = i + 1;

        const caseResult = await this.executeTestCase(
          lang,
          scriptPath,
          tempDir,
          minimalEnv,
          tc,
          caseNumber
        );

        results.push(caseResult);

        if (caseResult.verdict === 'Accepted') {
          passedTestCases++;
        } else {
          overallVerdict = caseResult.verdict;
          // Stop at first runtime error, timeout, output limit, or wrong answer
          break;
        }
      }

      return {
        verdict: overallVerdict,
        passed: overallVerdict === 'Accepted' && passedTestCases === testCases.length,
        passedTestCases,
        totalTestCases: testCases.length,
        results,
      };
    } finally {
      if (tempDir) {
        try {
          await fs.promises.rm(tempDir, { recursive: true, force: true });
        } catch {
          // Ignore temp cleanup errors
        }
      }
      concurrencyLimiter.release();
    }
  }

  private async executeTestCase(
    language: string,
    scriptPath: string,
    tempDir: string,
    minimalEnv: NodeJS.ProcessEnv,
    tc: TestCaseInput,
    caseNumber: number
  ): Promise<TestCaseResult> {
    return new Promise<TestCaseResult>((resolve) => {
      const isHidden = tc.isHidden ?? true;
      const startTime = Date.now();

      const binary = language === 'python' ? pythonBinary : nodeBinary;
      let args: string[] = [];

      if (language === 'python') {
        // -I: isolated mode (ignore Python environment variables and user site-packages)
        args = ['-I', scriptPath];
      } else {
        // Node
        args = ['--disallow-code-generation-from-strings', scriptPath];
      }

      let child: ReturnType<typeof spawn>;
      try {
        child = spawn(binary, args, {
          cwd: tempDir,
          env: minimalEnv,
          shell: false,
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true,
          detached: process.platform !== 'win32',
        });
      } catch (err: any) {
        return resolve({
          testCaseNumber: caseNumber,
          verdict: 'Runtime Error',
          passed: false,
          isHidden,
          error: sanitizeSandboxError(`Failed to spawn interpreter: ${err.message}`, tempDir),
        });
      }

      let stdout = '';
      let stderr = '';
      let totalBytes = 0;
      let killed = false;
      let killedReason: 'timeout' | 'output_limit' | null = null;

      const killProcessTree = () => {
        if (killed || !child.pid) return;
        killed = true;

        if (process.platform === 'win32' && taskkillBinary && fs.existsSync(taskkillBinary)) {
          try {
            spawn(taskkillBinary, ['/pid', String(child.pid), '/T', '/F'], {
              shell: false,
              windowsHide: true,
            });
          } catch {
            child.kill('SIGKILL');
          }
        } else if (process.platform !== 'win32') {
          try {
            process.kill(-child.pid, 'SIGKILL');
          } catch {
            child.kill('SIGKILL');
          }
        } else {
          child.kill('SIGKILL');
        }
      };

      // Time limit timer
      const timer = setTimeout(() => {
        killedReason = 'timeout';
        killProcessTree();
      }, this.timeLimitMs);

      child.stdout?.on('data', (chunk: Buffer) => {
        totalBytes += chunk.length;
        if (totalBytes > this.outputLimitBytes) {
          killedReason = 'output_limit';
          killProcessTree();
        } else {
          stdout += chunk.toString('utf8');
        }
      });

      child.stderr?.on('data', (chunk: Buffer) => {
        totalBytes += chunk.length;
        if (totalBytes > this.outputLimitBytes) {
          killedReason = 'output_limit';
          killProcessTree();
        } else {
          stderr += chunk.toString('utf8');
        }
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          testCaseNumber: caseNumber,
          verdict: 'Runtime Error',
          passed: false,
          isHidden,
          error: sanitizeSandboxError(err.message, tempDir),
          executionTimeMs: Date.now() - startTime,
        });
      });

      child.on('close', (code, signal) => {
        clearTimeout(timer);
        const executionTimeMs = Date.now() - startTime;

        if (killedReason === 'timeout' || signal === 'SIGTERM' || (signal === 'SIGKILL' && executionTimeMs >= this.timeLimitMs - 100)) {
          return resolve({
            testCaseNumber: caseNumber,
            verdict: 'Time Limit Exceeded',
            passed: false,
            isHidden,
            executionTimeMs,
          });
        }

        if (killedReason === 'output_limit') {
          return resolve({
            testCaseNumber: caseNumber,
            verdict: 'Output Limit Exceeded',
            passed: false,
            isHidden,
            executionTimeMs,
          });
        }

        if (code !== 0) {
          return resolve({
            testCaseNumber: caseNumber,
            verdict: 'Runtime Error',
            passed: false,
            isHidden,
            error: sanitizeSandboxError(stderr.slice(0, 1000).trim() || `Process exited with code ${code}`, tempDir),
            executionTimeMs,
          });
        }

        const normalizedActual = normalizeOutput(stdout);
        const normalizedExpected = normalizeOutput(tc.expectedOutput);

        const isPassed = normalizedActual === normalizedExpected;
        const verdict: TestCaseVerdict = isPassed ? 'Accepted' : 'Wrong Answer';

        resolve({
          testCaseNumber: caseNumber,
          verdict,
          passed: isPassed,
          isHidden,
          input: isHidden ? undefined : tc.input,
          expectedOutput: isHidden ? undefined : tc.expectedOutput,
          actualOutput: isHidden ? undefined : stdout.slice(0, 500),
          executionTimeMs,
        });
      });

      // Feed test case input through stdin and close it
      try {
        if (child.stdin) {
          child.stdin.write(tc.input || '');
          child.stdin.end();
        }
      } catch {
        // Ignore pipe errors if process terminated immediately
      }
    });
  }
}

/**
 * STUB: Judge0 / Piston Runner
 * Clearly marked stub class for a future remote sandboxed execution engine.
 */
export class Judge0Runner implements CodeRunner {
  async run(
    language: string,
    sourceCode: string,
    testCases: TestCaseInput[]
  ): Promise<RunResult> {
    throw new Error(
      'Judge0Runner is not configured on this instance. Configure JUDGE0_URL or use LocalProcessRunner.'
    );
  }
}

// Singleton runner instance
export const codeRunner: CodeRunner = new LocalProcessRunner();
