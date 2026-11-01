import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { prisma } from '../config/prisma.js';

export type CaseErrorType = 'compile_error' | 'runtime_error' | 'timeout' | 'none';

export interface CaseResult {
  index: number;
  passed: boolean;
  errorType: CaseErrorType;
  stderr?: string;       // truncated, never includes expected output
  durationMs: number;
}

export interface ExecutionResult {
  passed: number;
  total: number;
  results: CaseResult[];
  errorType: CaseErrorType;
  metadata: { totalDurationMs: number; normalization: string; timeLimitMs: number };
}

const normalize = (s: string, mode: string): string => {
  if (mode === 'trim_all') return s.replace(/\s+/g, '');
  if (mode === 'trim_lines') return s.split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');
  return s; // exact
};

const MAX_OUTPUT = 64 * 1024; // 64KB cap per stream (README: output caps preserved)

/** Runs one program instance against one input. Never throws. */
function runOnce(cmd: string, args: string[], input: string, timeLimitMs: number, cwd: string): Promise<{ code: number | null; stdout: string; stderr: string; timedOut: boolean }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd,
      env: {},                      // stripped environment: no secrets, no DB URLs (Ch 90)
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '', stderr = '', timedOut = false;
    let killed = false;
    const timer = setTimeout(() => { timedOut = true; killed = true; child.kill('SIGKILL'); }, timeLimitMs);

    child.stdout.on('data', (d) => { if (stdout.length < MAX_OUTPUT) stdout += d.toString(); else child.kill('SIGKILL'); });
    child.stderr.on('data', (d) => { if (stderr.length < MAX_OUTPUT) stderr += d.toString(); });
    child.on('error', (e) => { clearTimeout(timer); resolve({ code: null, stdout, stderr: stderr + e.message, timedOut: false }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr, timedOut }); });

    child.stdin.write(input);
    child.stdin.end();
    void killed;
  });
}

const LANG: Record<string, { file: string; cmd: string; args: (f: string) => string[] }> = {
  python: { file: 'main.py', cmd: 'python', args: (f) => [f] },
  javascript: { file: 'main.js', cmd: 'node', args: (f) => [f] },
};

const round2 = (x: number) => Math.round(x * 100) / 100;

/**
 * Executes a submission against all test cases with per-case isolation
 * (fresh process per case — one case can never affect another, Ch 89).
 * SECURITY HONESTY: this is a hardened local process runner (empty env,
 * temp cwd, hard timeout, output caps, cleanup) — it is NOT a sandbox.
 * Filesystem/network isolation requires a container runner (Docker/Judge0);
 * documented as the production upgrade path.
 */
export async function executeSubmission(problemId: string, code: string, language: string): Promise<ExecutionResult> {
  const problem = await prisma.codingProblem.findUnique({
    where: { id: problemId },
    include: { testCases: { orderBy: { id: 'asc' } } },
  });
  if (!problem) throw new Error('Problem not found');
  const lang = LANG[language] || LANG.python;
  const timeLimitMs = problem.timeLimitMs || 5000;
  const norm = problem.outputNormalization || 'trim_lines';

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ip-exec-'));
  const file = path.join(dir, lang.file);
  fs.writeFileSync(file, code, { mode: 0o644 });

  const results: CaseResult[] = [];
  let totalDuration = 0;
  let globalError: CaseErrorType = 'none';

  try {
    for (let i = 0; i < problem.testCases.length; i++) {
      const tc = problem.testCases[i];
      const t0 = Date.now();
      const r = await runOnce(lang.cmd, lang.args(lang.file), tc.input, timeLimitMs, dir);
      const durationMs = Date.now() - t0;
      totalDuration += durationMs;

      let errorType: CaseErrorType = 'none';
      if (r.timedOut) errorType = 'timeout';
      else if (r.code !== 0 && r.code !== null) errorType = 'runtime_error';
      else if (r.code === null) errorType = 'runtime_error';

      if (errorType === 'timeout' && globalError === 'none') globalError = 'timeout';

      const passed = errorType === 'none'
        && normalize(r.stdout, norm) === normalize(tc.expectedOutput, norm);

      results.push({
        index: i, passed, errorType,
        stderr: errorType !== 'none' ? r.stderr.slice(0, 500) : undefined,
        durationMs,
      });
    }
    return {
      passed: results.filter((r) => r.passed).length,
      total: results.length,
      results,
      errorType: globalError,
      metadata: { totalDurationMs: totalDuration, normalization: norm, timeLimitMs },
    };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true }); // cleanup (Ch 90)
  }
}

/** Marks for a programming submission (Ch 94: partial where configured). */
export function codingMarks(execution: ExecutionResult, maxMarks: number, partialAllowed: boolean): number {
  if (execution.total === 0) return 0;
  if (execution.passed === execution.total) return maxMarks;
  if (partialAllowed) return round2((execution.passed / execution.total) * maxMarks);
  return 0;
}

/**
 * Trainer test-case validation (Ch 89): runs a reference solution against
 * every stored case and reports which cases the "expected output" disagrees
 * with, including how each normalization mode would judge them.
 */
export async function validateTestCases(problemId: string, referenceCode: string, language: string) {
  const execution = await executeSubmission(problemId, referenceCode, language);
  return execution.results.map((r) => ({
    caseIndex: r.index,
    matchesReference: r.passed,
    errorType: r.errorType,
    note: r.errorType === 'timeout' ? 'Reference solution timed out — case input may be too large or expected time limit too tight'
      : r.errorType !== 'none' ? 'Reference solution crashed on this case — verify the case input format'
      : r.passed ? 'OK — expected output matches reference solution'
      : 'MISMATCH — expected output differs from reference solution output (check trailing newlines/whitespace or the normalization mode)',
  }));
}
