import { prisma, Prisma } from '../config/prisma.js';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100;

/**
 * Executes a Prisma transaction with automatic retry on Deadlock (P2034) or Write Conflict (P2037).
 * Challenge 229: Prevents database deadlocks from failing user requests.
 * Challenge 230: ReadCommitted isolation used; supports configurable isolation level and timeout.
 */
export async function safeTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: { timeout?: number; isolationLevel?: Prisma.TransactionIsolationLevel }
): Promise<T> {
  let attempts = 0;
  while (attempts < MAX_RETRIES) {
    try {
      return await prisma.$transaction(fn, {
        timeout: options?.timeout || 10000,
        isolationLevel: options?.isolationLevel || Prisma.TransactionIsolationLevel.ReadCommitted,
      });
    } catch (err: any) {
      if (err?.code === 'P2034' || err?.code === 'P2037') {
        // Deadlock or Write Conflict
        attempts++;
        console.warn(`[DB Retry] Deadlock/Conflict detected. Retrying (${attempts}/${MAX_RETRIES})...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempts));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Transaction failed after multiple retries due to deadlocks.');
}

